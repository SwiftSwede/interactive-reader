import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  formatCountdownLabel,
  formatSessionDay,
  hasSessionContent,
  isNearUtcToday,
  pickActiveCourseId,
  pickTodaySession,
  liveOnlyRecordingHref,
  toDashboardLesson,
  type CourseCandidate,
  type DashboardLesson,
} from "./dashboard";

const times = {
  sessionDate: "2026-09-06",
  sessionStartTime: "2026-09-06T19:00:00.000Z",
  sessionEndTime: "2026-09-06T20:30:00.000Z",
};

describe("hasSessionContent", () => {
  test("pronunciation is ready without a catalog row", () => {
    assert.equal(
      hasSessionContent({
        sessionType: "pronunciation",
        storyId: null,
        writingPromptId: null,
        examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: null,
      }),
      true
    );
  });

  test("conversation is ready only with a prompt", () => {
    assert.equal(
      hasSessionContent({
        sessionType: "conversation",
        storyId: null,
        writingPromptId: null,
        examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: null,
      }),
      false
    );
    assert.equal(
      hasSessionContent({
        sessionType: "conversation",
        storyId: null,
        writingPromptId: null,
        examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: "p1",
      }),
      true
    );
  });

  test("story without story_id is not ready", () => {
    assert.equal(
      hasSessionContent({
        sessionType: "story",
        storyId: null,
        writingPromptId: null,
        examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: null,
      }),
      false
    );
  });
});

describe("toDashboardLesson", () => {
  test("placeholder has no href and is not tappable", () => {
    const lesson = toDashboardLesson({
      sessionId: "s1",
      sessionType: "story",
      storyId: null,
      writingPromptId: null,
      examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: null,
        title: "The Jersey",
      storySlug: "the-jersey",
      token: "tok",
      recordingYoutubeUrl: null,
      completed: false,
      now: new Date("2026-09-01T12:00:00.000Z"),
      ...times,
    });
    assert.equal(lesson.lifecycle, "placeholder");
    assert.equal(lesson.href, null);
    assert.equal(lesson.liveOnly, false);
    assert.equal(lesson.title, null);
  });

  test("content-ready story is tappable", () => {
    const lesson = toDashboardLesson({
      sessionId: "s1",
      sessionType: "story",
      storyId: "story-1",
      writingPromptId: null,
      examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: null,
        title: "The Jersey",
      storySlug: "the-jersey",
      token: "tok",
      recordingYoutubeUrl: null,
      completed: true,
      now: new Date("2026-09-01T12:00:00.000Z"),
      ...times,
    });
    assert.equal(lesson.lifecycle, "upcoming");
    assert.equal(lesson.href, "/lesson/the-jersey?session=tok");
    assert.equal(lesson.completed, true);
    assert.equal(lesson.title, "The Jersey");
  });

  test("conversation with a prompt is tappable during class", () => {
    const lesson = toDashboardLesson({
      sessionId: "s1",
      sessionType: "conversation",
      storyId: null,
      writingPromptId: null,
      examPromptId: null,
      presentationPromptId: null,
      conversationPromptId: "p1",
      title: "Gabo",
      storySlug: null,
      token: "tok",
      recordingYoutubeUrl: null,
      completed: true,
      now: new Date("2026-09-06T19:00:00.000Z"),
      ...times,
    });
    assert.equal(lesson.liveOnly, false);
    assert.equal(lesson.lifecycle, "live");
    assert.equal(lesson.href, "/conversation?session=tok");
    assert.equal(lesson.title, "Gabo");
    assert.equal(lesson.completed, true);
  });

  test("live-only after class keeps href null and exposes the recording url", () => {
    const lesson = toDashboardLesson({
      sessionId: "s1",
      sessionType: "pronunciation",
      storyId: null,
      writingPromptId: null,
      examPromptId: null,
      presentationPromptId: null,
      title: null,
      storySlug: null,
      token: "tok",
      recordingYoutubeUrl: "https://youtu.be/abc",
      completed: true,
      now: new Date("2026-09-07T12:00:00.000Z"),
      ...times,
    });
    assert.equal(lesson.liveOnly, true);
    assert.equal(lesson.lifecycle, "after");
    assert.equal(lesson.href, null);
    assert.equal(lesson.hasRecording, true);
    assert.equal(lesson.recordingYoutubeUrl, "https://youtu.be/abc");
    assert.equal(lesson.completed, true);
  });

  test("live-only recording link is after-class only", () => {
    assert.equal(
      liveOnlyRecordingHref({
        liveOnly: true,
        lifecycle: "after",
        recordingYoutubeUrl: "https://youtu.be/abc",
      }),
      "https://youtu.be/abc"
    );
    assert.equal(
      liveOnlyRecordingHref({
        liveOnly: true,
        lifecycle: "live",
        recordingYoutubeUrl: "https://youtu.be/abc",
      }),
      null
    );
    assert.equal(
      liveOnlyRecordingHref({
        liveOnly: false,
        lifecycle: "after",
        recordingYoutubeUrl: "https://youtu.be/abc",
      }),
      null
    );
  });

  test("hasRecording follows the youtube url", () => {
    const lesson = toDashboardLesson({
      sessionId: "s1",
      sessionType: "writing",
      storyId: null,
      writingPromptId: "w1",
      examPromptId: null,
      presentationPromptId: null,
      title: "A letter",
      storySlug: null,
      token: "tok",
      recordingYoutubeUrl: "https://youtu.be/abc",
      completed: false,
      now: new Date("2026-09-07T12:00:00.000Z"),
      ...times,
    });
    assert.equal(lesson.hasRecording, true);
    assert.equal(lesson.lifecycle, "after");
    assert.equal(lesson.href, "/writing?session=tok");
  });
});

describe("format helpers", () => {
  test("formatSessionDay uses Spanish short month", () => {
    const label = formatSessionDay("2026-08-12");
    assert.match(label, /^12 /);
    assert.match(label.toLowerCase(), /ago/);
  });

  test("countdown format switches at one hour", () => {
    assert.equal(formatCountdownLabel(3 * 3600 * 1000 + 22 * 60 * 1000), "3h 22m");
    assert.equal(formatCountdownLabel(22 * 60 * 1000 + 5 * 1000), "22m 05s");
  });
});

describe("pickTodaySession", () => {
  test("prefers the UTC-today session inside the ±1 day window", () => {
    const lessons: DashboardLesson[] = [
      {
        sessionId: "a",
        sessionType: "story",
        title: null,
        lifecycle: "upcoming",
        completed: false,
        hasRecording: false,
        recordingYoutubeUrl: null,
        sessionDate: "2026-09-05",
        sessionStartTime: "2026-09-05T19:00:00.000Z",
        sessionEndTime: "2026-09-05T20:30:00.000Z",
        href: null,
        liveOnly: false,
      },
      {
        sessionId: "b",
        sessionType: "story",
        title: null,
        lifecycle: "upcoming",
        completed: false,
        hasRecording: false,
        recordingYoutubeUrl: null,
        sessionDate: "2026-09-06",
        sessionStartTime: "2026-09-06T19:00:00.000Z",
        sessionEndTime: "2026-09-06T20:30:00.000Z",
        href: null,
        liveOnly: false,
      },
    ];
    const picked = pickTodaySession(
      lessons,
      new Date("2026-09-06T15:00:00.000Z")
    );
    assert.equal(picked?.sessionId, "b");
    assert.equal(isNearUtcToday("2026-09-06", new Date("2026-09-06T15:00:00.000Z")), true);
  });
});

describe("pickActiveCourseId", () => {
  const august: CourseCandidate = {
    courseId: "aug",
    level: "intermediate",
    enrolledAt: "2026-08-01T00:00:00.000Z",
    latestStart: Date.parse("2026-08-28T19:00:00.000Z"),
    sessionDates: ["2026-08-03", "2026-08-28"],
  };
  const september: CourseCandidate = {
    courseId: "sep",
    level: "intermediate",
    enrolledAt: "2026-09-01T00:00:00.000Z",
    latestStart: Date.parse("2026-09-06T19:00:00.000Z"),
    sessionDates: ["2026-09-01", "2026-09-06"],
  };
  const now = new Date(2026, 8, 6, 12, 0, 0);

  test("prefers the current month over a prior month with later-looking history", () => {
    const id = pickActiveCourseId([august, september], "intermediate", now);
    assert.equal(id, "sep");
  });

  test("new empty month enrollment wins over last month's sessions", () => {
    const emptySeptember: CourseCandidate = {
      ...september,
      latestStart: 0,
      sessionDates: [],
    };
    const id = pickActiveCourseId(
      [august, emptySeptember],
      "intermediate",
      now
    );
    assert.equal(id, "sep");
  });

  test("stays on last month when that is the only enrolled course", () => {
    const id = pickActiveCourseId([august], "intermediate", now);
    assert.equal(id, "aug");
  });

  test("ignores the other Zoom level", () => {
    const preIntAugust: CourseCandidate = {
      ...august,
      courseId: "aug-pre",
      level: "pre-intermediate",
    };
    const id = pickActiveCourseId(
      [preIntAugust, september],
      "intermediate",
      now
    );
    assert.equal(id, "sep");
  });
});
