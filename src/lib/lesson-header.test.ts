import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  cefrFromLevel,
  formatLessonMeta,
  lessonHeaderWordCount,
} from "./lesson-header";

describe("cefrFromLevel", () => {
  test("maps classroom and catalog levels to a band", () => {
    assert.equal(cefrFromLevel("beginner"), "A1/A2");
    assert.equal(cefrFromLevel("pre-intermediate"), "A2/B1");
    assert.equal(cefrFromLevel("intermediate"), "B1/B2");
  });

  test("returns null for unknown levels", () => {
    assert.equal(cefrFromLevel(""), null);
    assert.equal(cefrFromLevel("advanced"), null);
  });
});

describe("lessonHeaderWordCount", () => {
  test("keeps counts for stories and dialogues", () => {
    assert.equal(lessonHeaderWordCount("story", 842), 842);
    assert.equal(lessonHeaderWordCount("dialogue", 1), 1);
  });

  test("drops counts for other kinds and empty values", () => {
    assert.equal(lessonHeaderWordCount("movie_talk", 1200), undefined);
    assert.equal(lessonHeaderWordCount("song", 400), undefined);
    assert.equal(lessonHeaderWordCount("story", 0), undefined);
    assert.equal(lessonHeaderWordCount("story", null), undefined);
  });
});

describe("formatLessonMeta", () => {
  test("shows CEFR alone", () => {
    assert.equal(formatLessonMeta("intermediate"), "B1/B2");
    assert.equal(formatLessonMeta("pre-intermediate", null), "A2/B1");
  });

  test("appends word count for stories and dialogues", () => {
    assert.equal(
      formatLessonMeta("pre-intermediate", 842),
      "A2/B1 · 842 palabras"
    );
    assert.equal(formatLessonMeta("beginner", 1), "A1/A2 · 1 palabra");
  });
});
