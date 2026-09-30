import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { missionForStudent } from "./student-mission";
import {
  isMissionSnoozed,
  isValidSnoozeUntil,
  nextLocalMidnight,
} from "./mission-snooze";

type Response = { data: unknown; error: { message: string } | null };

function scripted(responses: Response[]) {
  const tables: string[] = [];
  let index = 0;
  const client = {
    from(table: string) {
      tables.push(table);
      const finish = () =>
        Promise.resolve(
          responses[index++] ?? { data: null, error: { message: `no script for ${table}` } },
        );
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: finish,
        single: finish,
        then: (resolve: (value: Response) => unknown, reject?: (reason: unknown) => unknown) =>
          finish().then(resolve, reject),
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, tables };
}

const activeRow = {
  id: "mission-1",
  user_id: "student-1",
  tag_type: "error",
  tag_id: "tag-make",
  status: "active",
  started_at: "2026-09-01T00:00:00.000Z",
  graduated_at: null,
  dismissed_until: null,
  updated_at: "2026-09-01T00:00:00.000Z",
};

test("no flagged tags means no mission", async () => {
  const { client } = scripted([
    { data: null, error: null },
    { data: [], error: null },
  ]);
  assert.equal(await missionForStudent(client, "student-1"), null);
});

test("the mission is named from its catalog display_name", async () => {
  const { client, tables } = scripted([
    { data: activeRow, error: null },
    { data: { display_name: "Make vs do" }, error: null },
  ]);
  const mission = await missionForStudent(client, "student-1");
  assert.deepEqual(mission, {
    missionId: "mission-1",
    tagType: "error",
    tagId: "tag-make",
    displayName: "Make vs do",
    dismissedUntil: null,
  });
  assert.deepEqual(tables, ["student_missions", "error_tags"]);
});

test("a tag with no display name shows nothing", async () => {
  const { client } = scripted([
    { data: activeRow, error: null },
    { data: null, error: null },
  ]);
  assert.equal(await missionForStudent(client, "student-1"), null);
});

test("next local midnight is the start of tomorrow on the device clock", () => {
  const now = new Date(2026, 8, 29, 23, 15);
  const midnight = nextLocalMidnight(now);
  assert.equal(midnight.getFullYear(), 2026);
  assert.equal(midnight.getMonth(), 8);
  assert.equal(midnight.getDate(), 30);
  assert.equal(midnight.getHours(), 0);
  assert.equal(midnight.getMinutes(), 0);
});

test("snooze bounds refuse the past and anything past 36 hours", () => {
  const now = new Date("2026-09-30T04:00:00.000Z");
  assert.equal(isValidSnoozeUntil("2026-09-30T05:00:00.000Z", now), true);
  assert.equal(isValidSnoozeUntil("2026-09-30T03:00:00.000Z", now), false);
  assert.equal(isValidSnoozeUntil("2026-10-01T17:00:00.000Z", now), false);
  assert.equal(isValidSnoozeUntil("not a date", now), false);
});

test("a card is snoozed only while dismissed_until is ahead", () => {
  const now = new Date("2026-09-30T04:00:00.000Z");
  assert.equal(isMissionSnoozed(null, now), false);
  assert.equal(isMissionSnoozed("2026-09-30T05:00:00.000Z", now), true);
  assert.equal(isMissionSnoozed("2026-09-30T03:00:00.000Z", now), false);
});
