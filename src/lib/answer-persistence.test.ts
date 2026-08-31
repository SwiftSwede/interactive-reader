import assert from "node:assert/strict";
import { test } from "node:test";

import { pickComprehensionResponsesForTest } from "./comprehension";
import { pickPersonalResponsesForTest } from "./personal-responses";

test("comprehension prefers the class-session row when present", () => {
  const picked = pickComprehensionResponsesForTest(
    [
      {
        comprehension_question_id: "q1",
        response_text: "open answer",
        revealed_answer: false,
        course_session_id: null,
        submitted_at: "2026-08-31T12:00:00.000Z",
      },
      {
        comprehension_question_id: "q1",
        response_text: "class answer",
        revealed_answer: true,
        course_session_id: "session-1",
        submitted_at: "2026-08-30T12:00:00.000Z",
      },
    ],
    "session-1"
  );
  assert.deepEqual(picked, [
    {
      questionId: "q1",
      responseText: "class answer",
      revealedAnswer: true,
    },
  ]);
});

test("comprehension falls back to the newest row without a session", () => {
  const picked = pickComprehensionResponsesForTest([
    {
      comprehension_question_id: "q1",
      response_text: "older",
      revealed_answer: false,
      course_session_id: null,
      submitted_at: "2026-08-01T12:00:00.000Z",
    },
    {
      comprehension_question_id: "q1",
      response_text: "newer",
      revealed_answer: true,
      course_session_id: null,
      submitted_at: "2026-08-31T12:00:00.000Z",
    },
  ]);
  assert.deepEqual(picked, [
    {
      questionId: "q1",
      responseText: "newer",
      revealedAnswer: true,
    },
  ]);
});

test("personal keeps the latest attempt per question", () => {
  const picked = pickPersonalResponsesForTest([
    {
      personal_question_id: "p1",
      response_text: "first",
      attempt_number: 1,
      feedback_json: {
        corrections: [{ text: "first", type: "correct" }],
        note: "old",
      },
      submitted_at: "2026-08-01T12:00:00.000Z",
    },
    {
      personal_question_id: "p1",
      response_text: "second",
      attempt_number: 2,
      feedback_json: {
        corrections: [{ text: "second", type: "correct" }],
        note: "new",
      },
      submitted_at: "2026-08-31T12:00:00.000Z",
    },
  ]);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].responseText, "second");
  assert.equal(picked[0].attemptNumber, 2);
  assert.equal(picked[0].note, "new");
});
