import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  canShowStoryPractice,
  isStoryPracticeGated,
  pickPronunciationStart,
  pickPronunciationStartForStory,
  storyStepRecordingUrl,
} from "./story-practice";

const storyStart = "2026-09-01T19:00:00.000Z";
const class2Start = "2026-09-03T19:00:00.000Z";
const beforeClass2 = new Date("2026-09-03T18:59:00.000Z");
const atClass2 = new Date("2026-09-03T19:00:00.000Z");
const afterClass2 = new Date("2026-09-03T19:01:00.000Z");

const gatedInput = {
  isTeacher: false,
  storyKind: "story" as const,
  readerMode: "classroom-review" as const,
  pronunciationStartsAt: class2Start,
};

describe("canShowStoryPractice", () => {
  test("teacher always sees practice", () => {
    assert.equal(
      canShowStoryPractice({
        ...gatedInput,
        isTeacher: true,
        readerMode: "classroom-live",
        now: beforeClass2,
      }),
      true
    );
  });

  test("hides practice during live Class 1", () => {
    assert.equal(
      canShowStoryPractice({
        ...gatedInput,
        readerMode: "classroom-live",
        pronunciationStartsAt: null,
        now: beforeClass2,
      }),
      false
    );
  });

  test("hides practice in review before Class 2 starts", () => {
    assert.equal(
      canShowStoryPractice({ ...gatedInput, now: beforeClass2 }),
      false
    );
  });

  test("shows practice at and after Class 2 start", () => {
    assert.equal(
      canShowStoryPractice({ ...gatedInput, now: atClass2 }),
      true
    );
    assert.equal(
      canShowStoryPractice({ ...gatedInput, now: afterClass2 }),
      true
    );
  });

  test("does not lock when no pronunciation session exists", () => {
    assert.equal(
      canShowStoryPractice({
        ...gatedInput,
        pronunciationStartsAt: null,
        now: beforeClass2,
      }),
      true
    );
  });

  test("does not gate dialogue, movie talk, or song", () => {
    for (const storyKind of ["dialogue", "movie_talk", "song"] as const) {
      assert.equal(
        canShowStoryPractice({
          ...gatedInput,
          storyKind,
          now: beforeClass2,
        }),
        true
      );
      assert.equal(
        canShowStoryPractice({
          ...gatedInput,
          storyKind,
          readerMode: "classroom-live",
          now: beforeClass2,
        }),
        false
      );
    }
  });
});

describe("isStoryPracticeGated", () => {
  test("is true only while waiting for Class 2 in review", () => {
    assert.equal(
      isStoryPracticeGated({ ...gatedInput, now: beforeClass2 }),
      true
    );
    assert.equal(
      isStoryPracticeGated({ ...gatedInput, now: atClass2 }),
      false
    );
    assert.equal(
      isStoryPracticeGated({
        ...gatedInput,
        readerMode: "classroom-live",
        now: beforeClass2,
      }),
      false
    );
    assert.equal(
      isStoryPracticeGated({
        ...gatedInput,
        isTeacher: true,
        now: beforeClass2,
      }),
      false
    );
  });
});

describe("pickPronunciationStart", () => {
  const rows = [
    {
      sessionType: "story",
      storyId: "s1",
      sessionStartTime: storyStart,
    },
    {
      sessionType: "pronunciation",
      storyId: null,
      sessionStartTime: class2Start,
    },
  ];

  test("returns the pronunciation start at or after the story", () => {
    assert.equal(
      pickPronunciationStart(rows, {
        storyId: "s1",
        storySessionStart: storyStart,
      }),
      class2Start
    );
  });

  test("returns null when there is no pronunciation row", () => {
    assert.equal(
      pickPronunciationStart(
        [{ sessionType: "story", storyId: "s1", sessionStartTime: storyStart }],
        { storyId: "s1", storySessionStart: storyStart }
      ),
      null
    );
  });

  test("falls back to the latest pronunciation when none is after the story", () => {
    assert.equal(
      pickPronunciationStart(
        [
          {
            sessionType: "pronunciation",
            storyId: null,
            sessionStartTime: "2026-08-01T19:00:00.000Z",
          },
          {
            sessionType: "story",
            storyId: "s1",
            sessionStartTime: storyStart,
          },
        ],
        { storyId: "s1", storySessionStart: storyStart }
      ),
      "2026-08-01T19:00:00.000Z"
    );
  });
});

describe("pickPronunciationStartForStory", () => {
  test("prefers a future Class 2 when the same story is on two courses", () => {
    const start = pickPronunciationStartForStory(
      [
        {
          courseId: "old",
          sessionType: "story",
          storyId: "s1",
          sessionStartTime: "2026-08-01T19:00:00.000Z",
        },
        {
          courseId: "old",
          sessionType: "pronunciation",
          storyId: null,
          sessionStartTime: "2026-08-03T19:00:00.000Z",
        },
        {
          courseId: "new",
          sessionType: "story",
          storyId: "s1",
          sessionStartTime: storyStart,
        },
        {
          courseId: "new",
          sessionType: "pronunciation",
          storyId: null,
          sessionStartTime: class2Start,
        },
      ],
      "s1",
      beforeClass2
    );
    assert.equal(start, class2Start);
  });
});

describe("storyStepRecordingUrl", () => {
  test("uses the pronunciation recording on dictado, coral, and pronunciación", () => {
    for (const stepId of ["dictation", "choral", "pronunciation"]) {
      assert.equal(
        storyStepRecordingUrl({
          stepId,
          storyRecordingUrl: "https://youtu.be/story",
          practiceRecordingUrl: "https://youtu.be/pron",
        }),
        "https://youtu.be/pron"
      );
    }
  });

  test("uses the story recording on el cuento, comprensión, and personal", () => {
    for (const stepId of ["story", "comprehension", "personal"]) {
      assert.equal(
        storyStepRecordingUrl({
          stepId,
          storyRecordingUrl: "https://youtu.be/story",
          practiceRecordingUrl: "https://youtu.be/pron",
        }),
        "https://youtu.be/story"
      );
    }
  });
});
