import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getClassDayPhase,
  getSessionJoinTime,
  getSessionLifecycle,
  getSessionPhase,
  isClassDayCardSession,
  JOIN_LEAD_MINUTES,
  sessionRecordingUrl,
} from "./session-phase";

const start = "2026-09-06T19:00:00.000Z";
const end = "2026-09-06T20:30:00.000Z";
const session = { sessionStartTime: start, sessionEndTime: end };

describe("getSessionPhase", () => {
  test("is unchanged: live starts at sessionStartTime, not joinAt", () => {
    const justBefore = new Date("2026-09-06T18:59:00.000Z");
    assert.equal(getSessionPhase(session, justBefore), "before");
    assert.equal(getSessionPhase(session, new Date(start)), "live");
    assert.equal(getSessionPhase(session, new Date("2026-09-06T20:31:00.000Z")), "after");
  });
});

describe("getSessionJoinTime", () => {
  test("is 10 minutes before start", () => {
    const join = getSessionJoinTime(session);
    assert.equal(JOIN_LEAD_MINUTES, 10);
    assert.equal(join.toISOString(), "2026-09-06T18:50:00.000Z");
  });
});

describe("getSessionLifecycle", () => {
  test("placeholder when content is missing", () => {
    assert.equal(
      getSessionLifecycle(session, false, new Date("2026-09-06T19:00:00.000Z")),
      "placeholder"
    );
  });

  test("upcoming before joinAt, live from joinAt, after after end", () => {
    assert.equal(
      getSessionLifecycle(session, true, new Date("2026-09-06T18:49:00.000Z")),
      "upcoming"
    );
    assert.equal(
      getSessionLifecycle(session, true, new Date("2026-09-06T18:50:00.000Z")),
      "live"
    );
    assert.equal(
      getSessionLifecycle(session, true, new Date("2026-09-06T20:30:00.000Z")),
      "live"
    );
    assert.equal(
      getSessionLifecycle(session, true, new Date("2026-09-06T20:30:01.000Z")),
      "after"
    );
  });
});

describe("sessionRecordingUrl", () => {
  test("is hidden during the live window even if a URL exists", () => {
    assert.equal(
      sessionRecordingUrl(
        {
          sessionStartTime: start,
          sessionEndTime: end,
          recordingYoutubeUrl: "https://youtu.be/abc",
        },
        new Date(start)
      ),
      null
    );
  });

  test("returns the URL after the window closes", () => {
    assert.equal(
      sessionRecordingUrl(
        {
          sessionStartTime: start,
          sessionEndTime: end,
          recordingYoutubeUrl: "https://youtu.be/abc",
        },
        new Date("2026-09-06T20:31:00.000Z")
      ),
      "https://youtu.be/abc"
    );
  });
});

describe("getClassDayPhase", () => {
  test("countdown, join, then done-pending", () => {
    assert.equal(
      getClassDayPhase(session, new Date("2026-09-06T18:49:00.000Z")),
      "countdown"
    );
    assert.equal(
      getClassDayPhase(session, new Date("2026-09-06T18:50:00.000Z")),
      "join"
    );
    assert.equal(
      getClassDayPhase(session, new Date("2026-09-06T20:30:01.000Z")),
      "done-pending"
    );
  });
});

describe("isClassDayCardSession", () => {
  const evening = {
    sessionDate: "2026-09-07",
    sessionStartTime: "2026-09-08T01:00:00.000Z",
    sessionEndTime: "2026-09-08T02:30:00.000Z",
  };

  test("shows the join card 3 minutes before an evening class even when UTC already rolled to the next day", () => {
    const threeMinutesBefore = new Date("2026-09-08T00:57:00.000Z");
    assert.equal(isClassDayCardSession(evening, threeMinutesBefore), true);
    assert.equal(
      isClassDayCardSession(
        { ...evening, sessionDate: "2026-09-08" },
        threeMinutesBefore
      ),
      true
    );
  });

  test("shows countdown earlier the same local evening", () => {
    assert.equal(
      isClassDayCardSession(evening, new Date("2026-09-07T20:00:00.000Z")),
      true
    );
  });

  test("does not show a class two days away", () => {
    assert.equal(
      isClassDayCardSession(evening, new Date("2026-09-06T12:00:00.000Z")),
      false
    );
  });
});
