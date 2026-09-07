import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  courseMonthKey,
  formatDayTimePattern,
  isCourseInMonth,
  monthLabelFromYearMonth,
  readinessLabel,
  readySessionCount,
  sessionsInMonth,
  yearMonthFromIso,
} from "./teacher";

describe("yearMonthFromIso", () => {
  test("reads YYYY-MM from a calendar date", () => {
    assert.equal(yearMonthFromIso("2026-09-06"), "2026-09");
  });

  test("reads YYYY-MM from a timestamp", () => {
    assert.equal(yearMonthFromIso("2026-09-06T18:00:00.000Z"), "2026-09");
  });
});

describe("isCourseInMonth", () => {
  test("matches a course with a session_date in the month", () => {
    assert.equal(
      isCourseInMonth(
        [{ sessionDate: "2026-09-02" }, { sessionDate: "2026-08-28" }],
        "2026-07-01T00:00:00.000Z",
        "2026-09"
      ),
      true
    );
  });

  test("does not match a course whose sessions are all other months", () => {
    assert.equal(
      isCourseInMonth(
        [{ sessionDate: "2026-08-04" }],
        "2026-08-01T00:00:00.000Z",
        "2026-09"
      ),
      false
    );
  });

  test("matches a month that started on the last days of the previous month", () => {
    assert.equal(
      isCourseInMonth(
        [{ sessionDate: "2026-08-31" }],
        "2026-08-20T00:00:00.000Z",
        "2026-09"
      ),
      true
    );
  });

  test("does not treat a full previous month as this month just because it ended late", () => {
    assert.equal(
      isCourseInMonth(
        [{ sessionDate: "2026-08-04" }, { sessionDate: "2026-08-31" }],
        "2026-08-01T00:00:00.000Z",
        "2026-09"
      ),
      false
    );
  });

  test("falls back to created_at when there are no sessions", () => {
    assert.equal(
      isCourseInMonth([], "2026-09-01T12:00:00.000Z", "2026-09"),
      true
    );
    assert.equal(
      isCourseInMonth([], "2026-08-01T12:00:00.000Z", "2026-09"),
      false
    );
  });
});

describe("sessionsInMonth", () => {
  test("keeps only this month's rows", () => {
    const rows = sessionsInMonth(
      [
        { sessionDate: "2026-09-02", id: "a" },
        { sessionDate: "2026-08-28", id: "b" },
        { sessionDate: "2026-09-16", id: "c" },
      ],
      "2026-09"
    );
    assert.deepEqual(
      rows.map((row) => row.id),
      ["a", "c"]
    );
  });

  test("includes a previous-month opener in the last three days", () => {
    const rows = sessionsInMonth(
      [
        { sessionDate: "2026-08-31", id: "opener" },
        { sessionDate: "2026-09-05", id: "next" },
      ],
      "2026-09"
    );
    assert.deepEqual(
      rows.map((row) => row.id),
      ["opener", "next"]
    );
  });
});

describe("readinessLabel", () => {
  const emptyRefs = {
    writingPromptId: null as string | null,
    examPromptId: null as string | null,
    presentationPromptId: null as string | null,
  };

  test("counts live-only types as ready", () => {
    const sessions = [
      { sessionType: "conversation" as const, storyId: null, ...emptyRefs },
      { sessionType: "story" as const, storyId: null, ...emptyRefs },
    ];
    assert.equal(readySessionCount(sessions), 1);
    assert.equal(readinessLabel(sessions), "1/8 clases listas");
  });

  test("counts a story with story_id as ready", () => {
    const sessions = [
      { sessionType: "story" as const, storyId: "s1", ...emptyRefs },
    ];
    assert.equal(readinessLabel(sessions), "1/8 clases listas");
  });
});

describe("formatDayTimePattern", () => {
  test("formats two weekdays and a shared time in Costa Rica", () => {
    const label = formatDayTimePattern(
      ["2026-09-09T00:00:00.000Z", "2026-09-11T00:00:00.000Z"],
      "America/Costa_Rica"
    );
    assert.equal(label, "Mar y Jue · 18:00");
  });

  test("returns empty string with no starts", () => {
    assert.equal(formatDayTimePattern([]), "");
  });
});

describe("courseMonthKey", () => {
  test("uses the latest session_date", () => {
    assert.equal(
      courseMonthKey(
        [{ sessionDate: "2026-07-02" }, { sessionDate: "2026-09-16" }],
        "2026-01-01T00:00:00.000Z"
      ),
      "2026-09"
    );
  });

  test("falls back to created_at", () => {
    assert.equal(courseMonthKey([], "2026-08-15T00:00:00.000Z"), "2026-08");
  });

  test("attributes a last-day opener to the following month", () => {
    assert.equal(
      courseMonthKey(
        [{ sessionDate: "2026-08-31" }],
        "2026-08-20T00:00:00.000Z"
      ),
      "2026-09"
    );
  });
});

describe("monthLabelFromYearMonth", () => {
  test("capitalizes the Spanish month", () => {
    assert.equal(monthLabelFromYearMonth("2026-09"), "Septiembre de 2026");
  });
});
