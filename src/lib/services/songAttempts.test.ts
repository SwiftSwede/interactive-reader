import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  aggregateSongAnalytics,
  scoreTypedBlanks,
} from "./songAttempts";

const blanks = [
  { id: 1, prompt: "fingers ____", answer: "bled" },
  { id: 2, prompt: "Jimmy ____", answer: "quit" },
];

describe("scoreTypedBlanks", () => {
  test("scores each blank", () => {
    const scored = scoreTypedBlanks({ 1: "Bled", 2: "wrong" }, blanks);
    assert.equal(scored[0]?.isCorrect, true);
    assert.equal(scored[1]?.isCorrect, false);
  });
});

describe("aggregateSongAnalytics", () => {
  test("computes miss rates and per-student scores", () => {
    const { blanks: stats, students } = aggregateSongAnalytics(
      [
        {
          blank_id: 1,
          typed_text: "bled",
          is_correct: true,
          submitted_at: "2026-09-08T12:00:00Z",
          user_id: "a",
          updated_at: "2026-09-08T12:00:00Z",
        },
        {
          blank_id: 2,
          typed_text: "nope",
          is_correct: false,
          submitted_at: "2026-09-08T12:00:00Z",
          user_id: "a",
          updated_at: "2026-09-08T12:00:00Z",
        },
        {
          blank_id: 1,
          typed_text: "x",
          is_correct: false,
          submitted_at: "2026-09-08T12:01:00Z",
          user_id: "b",
          updated_at: "2026-09-08T12:01:00Z",
        },
        {
          blank_id: 2,
          typed_text: "quit",
          is_correct: true,
          submitted_at: "2026-09-08T12:01:00Z",
          user_id: "b",
          updated_at: "2026-09-08T12:01:00Z",
        },
      ],
      blanks,
      new Map([
        ["a", "Ana"],
        ["b", "Beto"],
      ])
    );

    assert.equal(stats[0]?.submitted, 2);
    assert.equal(stats[0]?.correct, 1);
    assert.equal(stats[1]?.correct, 1);
    assert.equal(students.length, 2);
    assert.equal(students[0]?.displayName, "Ana");
    assert.equal(students[0]?.correct, 1);
    assert.equal(students[0]?.total, 2);
  });

  test("ignores unsubmitted rows", () => {
    const { blanks: stats, students } = aggregateSongAnalytics(
      [
        {
          blank_id: 1,
          typed_text: "bled",
          is_correct: null,
          submitted_at: null,
          user_id: "a",
          updated_at: "2026-09-08T12:00:00Z",
        },
      ],
      blanks,
      new Map([["a", "Ana"]])
    );
    assert.equal(stats[0]?.submitted, 0);
    assert.equal(students.length, 0);
  });
});
