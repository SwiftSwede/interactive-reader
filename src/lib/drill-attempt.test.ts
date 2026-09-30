import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { graduatedThisAttempt, submitDrillAttempt } from "./drill-attempt";
import { AppError } from "./errors";
import type { DrillItemState } from "./drills";

const NOW = new Date("2026-01-01T00:00:00.000Z");

type Response = { data?: unknown; count?: number; error: { message: string } | null };

function scripted(responses: Response[]) {
  const writes: Array<{ table: string; payload: unknown }> = [];
  let index = 0;
  const client = {
    from(table: string) {
      const finish = () =>
        Promise.resolve(
          responses[index++] ?? { data: null, error: { message: `no script for ${table}` } },
        );
      const builder = {
        select: () => builder,
        eq: () => builder,
        insert(payload: unknown) {
          writes.push({ table, payload });
          return builder;
        },
        update(payload: unknown) {
          writes.push({ table, payload });
          return builder;
        },
        maybeSingle: finish,
        single: finish,
        then: (resolve: (value: Response) => unknown, reject?: (reason: unknown) => unknown) =>
          finish().then(resolve, reject),
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, writes };
}

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    tag_type: "error",
    tag_id: "tag-make",
    format: "cloze",
    level: "pre_int",
    content: { text: "I ___ my homework.", answer: "do", mcq: ["do", "make"] },
    active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const mission = {
  data: {
    id: "mission-1",
    user_id: "student-1",
    tag_type: "error",
    tag_id: "tag-make",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    graduated_at: null,
    dismissed_until: null,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  error: null,
};

function savedState(overrides: Record<string, unknown> = {}) {
  return {
    id: "state-1",
    user_id: "student-1",
    item_id: "11111111-1111-4111-8111-111111111111",
    rounds: 1,
    clean_recalls: 1,
    mcq_used: true,
    last_practiced_at: NOW.toISOString(),
    next_practice_at: "2026-01-03T00:00:00.000Z",
    status: "learning",
    graduated_at: null,
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

const ITEM_ID = "11111111-1111-4111-8111-111111111111";

test("a correct answer goes through the engine and returns three fields", async () => {
  const user = scripted([{ data: itemRow(), error: null }, mission, { count: 2, error: null }]);
  const admin = scripted([
    { data: null, error: null },
    { data: savedState(), error: null },
    { error: null },
  ]);

  const result = await submitDrillAttempt({
    client: user.client,
    adminClient: admin.client,
    userId: "student-1",
    itemId: ITEM_ID,
    answer: " Do ",
    now: NOW,
  });

  assert.deepEqual(result, { correct: true, graduated: false, collectionCount: 2 });
  const event = admin.writes.find((write) => write.table === "learning_events");
  assert.deepEqual((event?.payload as { detail: unknown }).detail, {
    item_id: ITEM_ID,
    correct: true,
  });
});

test("a miss adds only the stored answer", async () => {
  const user = scripted([{ data: itemRow(), error: null }, mission, { count: 0, error: null }]);
  const admin = scripted([
    { data: null, error: null },
    { data: savedState({ clean_recalls: 0 }), error: null },
    { error: null },
  ]);

  const result = await submitDrillAttempt({
    client: user.client,
    adminClient: admin.client,
    userId: "student-1",
    itemId: ITEM_ID,
    answer: "make",
    now: NOW,
  });

  assert.deepEqual(result, {
    correct: false,
    graduated: false,
    collectionCount: 0,
    expected: "do",
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "collectionCount",
    "correct",
    "expected",
    "graduated",
  ]);
});

test("the third clean recall reports graduated", async () => {
  const user = scripted([{ data: itemRow(), error: null }, mission, { count: 1, error: null }]);
  const admin = scripted([
    { data: savedState({ rounds: 2, clean_recalls: 2 }), error: null },
    {
      data: savedState({
        rounds: 3,
        clean_recalls: 3,
        status: "graduated",
        graduated_at: "2026-01-01T00:00:00+00:00",
      }),
      error: null,
    },
    { error: null },
    { error: null },
  ]);

  const result = await submitDrillAttempt({
    client: user.client,
    adminClient: admin.client,
    userId: "student-1",
    itemId: ITEM_ID,
    answer: "do",
    now: NOW,
  });

  assert.deepEqual(result, { correct: true, graduated: true, collectionCount: 1 });
});

test("a teach card is refused before any write", async () => {
  const user = scripted([
    { data: itemRow({ format: "teach", content: { hook: "Hacer lo hace todo." } }), error: null },
  ]);
  const admin = scripted([]);

  await assert.rejects(
    () =>
      submitDrillAttempt({
        client: user.client,
        adminClient: admin.client,
        userId: "student-1",
        itemId: ITEM_ID,
        answer: "x",
        now: NOW,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "DRILL_NOT_ANSWERABLE");
      return true;
    },
  );
  assert.equal(admin.writes.length, 0);
});

test("another tag's item needs prior practice", async () => {
  const user = scripted([
    { data: itemRow({ tag_id: "tag-age" }), error: null },
    mission,
    { data: null, error: null },
  ]);
  const admin = scripted([]);

  await assert.rejects(
    () =>
      submitDrillAttempt({
        client: user.client,
        adminClient: admin.client,
        userId: "student-1",
        itemId: ITEM_ID,
        answer: "do",
        now: NOW,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "DRILL_ITEM_NOT_IN_DECK");
      return true;
    },
  );
  assert.equal(admin.writes.length, 0);
});

test("graduatedThisAttempt is false for a later repaso", () => {
  const base: DrillItemState = {
    id: "s",
    userId: "u",
    itemId: "i",
    rounds: 4,
    cleanRecalls: 4,
    mcqUsed: true,
    lastPracticedAt: NOW.toISOString(),
    nextPracticeAt: null,
    status: "graduated",
    graduatedAt: "2025-12-01T00:00:00.000Z",
    updatedAt: NOW.toISOString(),
  };
  assert.equal(graduatedThisAttempt(base), false);
  assert.equal(graduatedThisAttempt({ ...base, graduatedAt: NOW.toISOString() }), true);
});
