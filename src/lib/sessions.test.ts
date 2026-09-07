import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { linkClickAttendancePatch } from "./sessions";

describe("linkClickAttendancePatch", () => {
  const nowIso = "2026-09-07T19:10:00.000Z";

  test("inserts attended when the first click is in the window", () => {
    assert.deepEqual(
      linkClickAttendancePatch({
        existing: null,
        inWindow: true,
        nowIso,
      }),
      { kind: "insert", attended: true }
    );
  });

  test("inserts not-attended when the first click is after the window", () => {
    assert.deepEqual(
      linkClickAttendancePatch({
        existing: null,
        inWindow: false,
        nowIso,
      }),
      { kind: "insert", attended: false }
    );
  });

  test("does not change attendance after the window", () => {
    assert.deepEqual(
      linkClickAttendancePatch({
        existing: { attended: false, firstOpenedAt: nowIso },
        inWindow: false,
        nowIso,
      }),
      { kind: "none" }
    );
  });

  test("marks attended and fills firstOpenedAt during the window", () => {
    assert.deepEqual(
      linkClickAttendancePatch({
        existing: { attended: false, firstOpenedAt: null },
        inWindow: true,
        nowIso,
      }),
      { kind: "update", attended: true, firstOpenedAt: nowIso }
    );
  });

  test("does nothing when already attended with a timestamp", () => {
    assert.deepEqual(
      linkClickAttendancePatch({
        existing: { attended: true, firstOpenedAt: nowIso },
        inWindow: true,
        nowIso,
      }),
      { kind: "none" }
    );
  });
});
