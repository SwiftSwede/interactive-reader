import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import {
  getOrCreateActiveMission,
  graduateClearedMission,
  graduateMission,
  rankMissionCandidates,
  snoozeMission,
  type MissionCatalog,
  type MissionEvidenceRow,
  type StudentMission,
} from "./missions";

const catalog: MissionCatalog = {
  nameByKey: new Map([
    ["grammar:past", "past_simple"],
    ["grammar:perfect", "present_perfect"],
    ["grammar:custom", "custom_grammar"],
    ["phonetic:th", "th"],
    ["phonetic:v", "v"],
    ["error:prep", "preposition_partner"],
    ["vocabulary:food", "food"],
  ]),
  prerequisitesByName: new Map([
    ["past_simple", []],
    ["present_perfect", ["past_simple"]],
  ]),
};

function row(
  partial: Partial<MissionEvidenceRow> & Pick<MissionEvidenceRow, "tagType" | "tagId">,
): MissionEvidenceRow {
  return {
    sourceType: "dictation",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("teacher observation outranks an older satisfied machine flag", () => {
  const ranked = rankMissionCandidates(
    [
      row({ tagType: "grammar", tagId: "past", updatedAt: "2020-01-01T00:00:00.000Z" }),
      row({
        tagType: "grammar",
        tagId: "perfect",
        sourceType: "teacher_observation",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ],
    catalog,
  );

  assert.equal(ranked[0]?.tagId, "perfect");
  assert.equal(ranked[0]?.name, "present_perfect");
});

test("a satisfied prerequisite ranks ahead of a broken one", () => {
  const ranked = rankMissionCandidates(
    [
      row({
        tagType: "grammar",
        tagId: "perfect",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
      row({
        tagType: "grammar",
        tagId: "past",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ],
    catalog,
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.tagId),
    ["past", "perfect"],
  );
});

test("error and phonetic tags are satisfied, so an error beats a broken grammar flag", () => {
  const ranked = rankMissionCandidates(
    [
      row({
        tagType: "grammar",
        tagId: "perfect",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
      row({ tagType: "grammar", tagId: "past", updatedAt: "2020-01-02T00:00:00.000Z" }),
      row({
        tagType: "error",
        tagId: "prep",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ],
    catalog,
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.tagId),
    ["past", "prep", "perfect"],
  );
});

test("a grammar name missing from the seed list has no prerequisites", () => {
  const ranked = rankMissionCandidates(
    [
      row({ tagType: "grammar", tagId: "past" }),
      row({
        tagType: "grammar",
        tagId: "perfect",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
      row({
        tagType: "grammar",
        tagId: "custom",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ],
    catalog,
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.tagId),
    ["past", "custom", "perfect"],
  );
});

test("the oldest flag wins when teacher source and prerequisites match", () => {
  const ranked = rankMissionCandidates(
    [
      row({
        tagType: "phonetic",
        tagId: "v",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
      row({
        tagType: "phonetic",
        tagId: "th",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
    ],
    catalog,
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.tagId),
    ["th", "v"],
  );
});

test("tag id breaks a tie", () => {
  const ranked = rankMissionCandidates(
    [
      row({ tagType: "phonetic", tagId: "v" }),
      row({ tagType: "phonetic", tagId: "th" }),
    ],
    catalog,
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.tagId),
    ["th", "v"],
  );
});

test("vocabulary rows and unnamed ids are ignored", () => {
  const ranked = rankMissionCandidates(
    [
      row({
        tagType: "vocabulary",
        tagId: "food",
        sourceType: "teacher_observation",
        updatedAt: "2019-01-01T00:00:00.000Z",
      }),
      row({ tagType: "grammar", tagId: "missing" }),
      row({ tagType: "phonetic", tagId: "th", updatedAt: "2026-06-01T00:00:00.000Z" }),
    ],
    catalog,
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.tagId),
    ["th"],
  );
});

type ScriptCall = {
  table: string;
  action: "select" | "insert" | "update";
  payload?: unknown;
  filters: Array<[string, string]>;
};

type ScriptResponse = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

function scriptedClient(responses: ScriptResponse[]) {
  const calls: ScriptCall[] = [];
  let index = 0;
  const client = {
    from(table: string) {
      const call: ScriptCall = { table, action: "select", filters: [] };
      calls.push(call);
      const finish = () => {
        const response = responses[index++] ?? {
          data: null,
          error: { message: `no script for ${table}` },
        };
        return Promise.resolve(response);
      };
      const builder = {
        select() {
          return builder;
        },
        insert(payload: unknown) {
          call.action = "insert";
          call.payload = payload;
          return builder;
        },
        update(payload: unknown) {
          call.action = "update";
          call.payload = payload;
          return builder;
        },
        eq(column: string, value: string) {
          call.filters.push([column, value]);
          return builder;
        },
        maybeSingle: finish,
        single: finish,
        then(
          resolve: (value: ScriptResponse) => unknown,
          reject?: (reason: unknown) => unknown,
        ) {
          return finish().then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

function missionRow(overrides: Partial<StudentMission> = {}): Record<string, unknown> {
  const mission = {
    id: "mission-1",
    userId: "student-1",
    tagType: "error",
    tagId: "prep",
    status: "active",
    startedAt: "2026-09-01T00:00:00.000Z",
    graduatedAt: null,
    dismissedUntil: "2026-09-30T05:00:00.000Z",
    graduationReason: null as StudentMission["graduationReason"],
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
  return {
    id: mission.id,
    user_id: mission.userId,
    tag_type: mission.tagType,
    tag_id: mission.tagId,
    status: mission.status,
    started_at: mission.startedAt,
    graduated_at: mission.graduatedAt,
    dismissed_until: mission.dismissedUntil,
    graduation_reason: mission.graduationReason,
    updated_at: mission.updatedAt,
  };
}

const emptyCatalog = { data: [], error: null };
const emptyIntro = { data: [], error: null };

test("an active mission is returned as-is, including a future dismissal", async () => {
  const { client, calls } = scriptedClient([
    { data: missionRow(), error: null },
  ]);

  const mission = await getOrCreateActiveMission(client, "student-1");

  assert.equal(mission?.id, "mission-1");
  assert.equal(mission?.dismissedUntil, "2026-09-30T05:00:00.000Z");
  assert.equal(calls.length, 1);
});

test("the teacher-set flag becomes the mission and the start event records its name", async () => {
  const events: unknown[] = [];
  const { client, calls } = scriptedClient([
    { data: null, error: null },
    {
      data: [
        {
          tag_type: "grammar",
          tag_id: "past",
          source_type: "dictation",
          updated_at: "2020-01-01T00:00:00.000Z",
        },
        {
          tag_type: "error",
          tag_id: "prep",
          source_type: "teacher_observation",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      error: null,
    },
    emptyIntro,
    { data: [{ id: "past", name: "past_simple" }], error: null },
    emptyCatalog,
    { data: [{ id: "prep", name: "preposition_partner" }], error: null },
    { data: missionRow({ tagType: "error", tagId: "prep" }), error: null },
  ]);
  const admin = {
    from() {
      return {
        insert(payload: unknown) {
          events.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;

  const mission = await getOrCreateActiveMission(client, "student-1", admin);

  assert.equal(mission?.tagId, "prep");
  assert.equal(calls.some((call) => call.action === "insert"), true);
  assert.deepEqual(events, [
    {
      user_id: "student-1",
      event_type: "mission_started",
      course_session_id: null,
      detail: { tag_type: "error", tag_id: "prep", name: "preposition_partner" },
    },
  ]);
});

test("a unique-index race returns the existing mission and skips the start event", async () => {
  const events: unknown[] = [];
  const { client } = scriptedClient([
    { data: null, error: null },
    {
      data: [
        {
          tag_type: "error",
          tag_id: "prep",
          source_type: "teacher_observation",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      error: null,
    },
    emptyIntro,
    emptyCatalog,
    emptyCatalog,
    { data: [{ id: "prep", name: "preposition_partner" }], error: null },
    { data: null, error: { code: "23505", message: "duplicate key" } },
    { data: missionRow({ id: "mission-existing", tagId: "past", tagType: "grammar" }), error: null },
  ]);
  const admin = {
    from() {
      return {
        insert(payload: unknown) {
          events.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;

  const mission = await getOrCreateActiveMission(client, "student-1", admin);

  assert.equal(mission?.id, "mission-existing");
  assert.equal(events.length, 0);
});

test("an intro-complete tag is skipped so the next flag becomes the mission", async () => {
  const events: unknown[] = [];
  const { client } = scriptedClient([
    { data: null, error: null },
    {
      data: [
        {
          tag_type: "error",
          tag_id: "prep",
          source_type: "teacher_observation",
          updated_at: "2020-01-01T00:00:00.000Z",
        },
        {
          tag_type: "phonetic",
          tag_id: "th",
          source_type: "teacher_observation",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      error: null,
    },
    {
      data: [{ tag_id: "prep", graduated_at: "2026-09-01T00:00:00.000Z" }],
      error: null,
    },
    emptyCatalog,
    { data: [{ id: "th", name: "th" }], error: null },
    { data: [{ id: "prep", name: "preposition_partner" }], error: null },
    { data: missionRow({ tagType: "phonetic", tagId: "th" }), error: null },
  ]);
  const admin = {
    from() {
      return {
        insert(payload: unknown) {
          events.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;

  const mission = await getOrCreateActiveMission(client, "student-1", admin);
  assert.equal(mission?.tagId, "th");
  assert.deepEqual(
    (events[0] as { detail: { tag_id: string } }).detail.tag_id,
    "th",
  );
});

test("vocabulary flags do not create a mission", async () => {
  const { client, calls } = scriptedClient([
    { data: null, error: null },
    {
      data: [
        {
          tag_type: "vocabulary",
          tag_id: "food",
          source_type: "teacher_observation",
          updated_at: "2020-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    },
  ]);

  const mission = await getOrCreateActiveMission(client, "student-1");

  assert.equal(mission, null);
  assert.equal(calls.length, 2);
});

test("a catalog read failure is an error", async () => {
  const { client, calls } = scriptedClient([
    { data: null, error: null },
    {
      data: [
        {
          tag_type: "grammar",
          tag_id: "past",
          source_type: "dictation",
          updated_at: "2020-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    },
    emptyIntro,
    { data: null, error: { message: "catalog down" } },
    emptyCatalog,
    emptyCatalog,
  ]);

  await assert.rejects(
    () => getOrCreateActiveMission(client, "student-1"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "TAG_CATALOG_READ_FAILED");
      return true;
    },
  );
  assert.equal(calls.some((call) => call.action === "insert"), false);
});

test("a failed start event still returns the mission", async () => {
  const { client } = scriptedClient([
    { data: null, error: null },
    {
      data: [
        {
          tag_type: "error",
          tag_id: "prep",
          source_type: "teacher_observation",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      error: null,
    },
    emptyIntro,
    emptyCatalog,
    emptyCatalog,
    { data: [{ id: "prep", name: "preposition_partner" }], error: null },
    { data: missionRow(), error: null },
  ]);
  const admin = {
    from() {
      return {
        insert() {
          return Promise.resolve({ error: { message: "diary down" } });
        },
      };
    },
  } as unknown as SupabaseClient;

  const mission = await getOrCreateActiveMission(client, "student-1", admin);
  assert.equal(mission?.id, "mission-1");
});

test("snooze stores dismissed_until on the active row", async () => {
  const until = "2026-09-30T05:00:00.000Z";
  const { client, calls } = scriptedClient([
    { data: missionRow({ dismissedUntil: until }), error: null },
  ]);

  const mission = await snoozeMission(client, "student-1", "mission-1", until);

  assert.equal(mission.dismissedUntil, until);
  assert.equal(calls[0]?.action, "update");
  const payload = calls[0]?.payload as { dismissed_until: string; updated_at: string };
  assert.equal(payload.dismissed_until, until);
  assert.equal(typeof payload.updated_at, "string");
  assert.deepEqual(calls[0]?.filters, [
    ["id", "mission-1"],
    ["user_id", "student-1"],
    ["status", "active"],
  ]);
});

test("graduation sets status and writes mission_graduated", async () => {
  const { client, calls } = scriptedClient([
    {
      data: missionRow({
        status: "graduated",
        graduatedAt: "2026-09-29T12:00:00.000Z",
      }),
      error: null,
    },
    { data: null, error: null },
  ]);

  const mission = await graduateMission(client, "student-1", "mission-1", "teacher_clear");

  assert.equal(mission.status, "graduated");
  const update = calls[0]?.payload as {
    status: string;
    graduated_at: string;
    graduation_reason: string;
    updated_at: string;
  };
  assert.equal(update.status, "graduated");
  assert.equal(update.graduation_reason, "teacher_clear");
  assert.equal(typeof update.graduated_at, "string");
  assert.equal(calls[1]?.table, "learning_events");
  assert.deepEqual(calls[1]?.payload, {
    user_id: "student-1",
    event_type: "mission_graduated",
    course_session_id: null,
    detail: { reason: "teacher_clear" },
  });
});

test("a teacher clear graduates only the matching active mission", async () => {
  const matched = scriptedClient([
    { data: missionRow({ tagType: "error", tagId: "prep" }), error: null },
    {
      data: missionRow({
        status: "graduated",
        tagType: "error",
        tagId: "prep",
        graduatedAt: "2026-09-29T12:00:00.000Z",
      }),
      error: null,
    },
    { data: null, error: null },
  ]);

  const graduated = await graduateClearedMission(matched.client, "student-1", [
    { tagType: "vocabulary", tagId: "food" },
    { tagType: "error", tagId: "prep" },
  ]);

  assert.equal(graduated?.status, "graduated");
  assert.equal(matched.calls[1]?.action, "update");
  assert.equal(matched.calls[2]?.table, "learning_events");

  const other = scriptedClient([
    { data: missionRow({ tagType: "error", tagId: "prep" }), error: null },
  ]);
  const skipped = await graduateClearedMission(other.client, "student-1", [
    { tagType: "grammar", tagId: "past" },
    { tagType: "vocabulary", tagId: "prep" },
  ]);

  assert.equal(skipped, null);
  assert.equal(other.calls.length, 1);
});
