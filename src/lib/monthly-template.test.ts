import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MONTHLY_TEMPLATE,
  capOccurrences,
  defaultCourseName,
  formatClassPreview,
  generateMonthDates,
  occurrencesInMonth,
  patternFromSessionStarts,
  shouldArchiveMonthKey,
  templateForLevel,
} from "./monthly-template";

describe("monthly template", () => {
  test("is the same 8-row sequence for both levels", () => {
    assert.deepEqual(templateForLevel("pre-intermediate"), MONTHLY_TEMPLATE);
    assert.deepEqual(templateForLevel("intermediate"), MONTHLY_TEMPLATE);
    assert.deepEqual(MONTHLY_TEMPLATE, [
      "story",
      "pronunciation",
      "flex",
      "conversation",
      "dialogue",
      "song",
      "writing",
      "exam",
    ]);
  });
});

describe("generateMonthDates", () => {
  test("caps a 5-Tuesday month at 8 when Tue and Thu are chosen", () => {
    const rows = generateMonthDates("2026-09", [2, 4]);
    assert.equal(rows.length, 8);
    assert.equal(rows[0]?.sessionDate, "2026-09-01");
    assert.equal(rows[7]?.sessionDate, "2026-09-24");
  });

  test("Saturday-only yields 4 from the template top", () => {
    const rows = generateMonthDates("2026-10", [6]);
    assert.equal(rows.length, 5);
    assert.equal(rows[0]?.sessionDate, "2026-10-03");
    assert.equal(rows[4]?.sessionDate, "2026-10-31");
  });

  test("a 5-Saturday month stays at 5, not 8", () => {
    const all = occurrencesInMonth("2026-10", [6]);
    assert.equal(all.length, 5);
    assert.equal(capOccurrences(all).length, 5);
  });

  test("does not spill into the previous month", () => {
    const rows = generateMonthDates("2026-10", [2, 4]);
    assert.ok(rows.every((row) => row.sessionDate.startsWith("2026-10")));
  });
});

describe("defaultCourseName", () => {
  test("follows Kyle Drive convention", () => {
    assert.equal(
      defaultCourseName("intermediate", "2026-10"),
      "Intermediate 2026 OCT"
    );
    assert.equal(
      defaultCourseName("pre-intermediate", "2026-09"),
      "Pre-intermediate 2026 SEP"
    );
  });
});

describe("formatClassPreview", () => {
  test("lists Spanish weekdays and dates", () => {
    const label = formatClassPreview([
      { sessionDate: "2026-10-06", day: 6, weekday: 2 },
      { sessionDate: "2026-10-08", day: 8, weekday: 4 },
    ]);
    assert.equal(label, "2 clases: mar 6 oct, jue 8 oct");
  });
});

describe("shouldArchiveMonthKey", () => {
  test("archives a previous month, not a same-month sibling", () => {
    assert.equal(shouldArchiveMonthKey("2026-09", "2026-10"), true);
    assert.equal(shouldArchiveMonthKey("2026-10", "2026-10"), false);
    assert.equal(shouldArchiveMonthKey("2026-11", "2026-10"), false);
  });
});

describe("patternFromSessionStarts", () => {
  test("reads weekdays and a shared local time", () => {
    const first = new Date(2026, 9, 6, 19, 0, 0);
    const second = new Date(2026, 9, 8, 19, 0, 0);
    const pattern = patternFromSessionStarts([
      first.toISOString(),
      second.toISOString(),
    ]);
    assert.deepEqual(pattern.weekdays, [2, 4]);
    assert.equal(pattern.hour, "19");
    assert.equal(pattern.minute, "00");
  });
});
