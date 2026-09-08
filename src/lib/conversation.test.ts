import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  appendNumberedQuestions,
  formatRoundClock,
  isRoundsComplete,
  nextRoundCurrent,
  numberedQuestionList,
  parseConversationQuestions,
  roundLengthSeconds,
  roundTotal,
  secondsLeft,
} from "./conversation";

describe("round plan", () => {
  test("standard is six rounds, compact is three, open is none", () => {
    assert.equal(roundTotal("standard"), 6);
    assert.equal(roundTotal("compact"), 3);
    assert.equal(roundTotal("open"), 0);
  });

  test("length follows plan and course level", () => {
    assert.equal(roundLengthSeconds("standard", "pre-intermediate"), 240);
    assert.equal(roundLengthSeconds("standard", "intermediate"), 300);
    assert.equal(roundLengthSeconds("compact", "pre-intermediate"), 600);
    assert.equal(roundLengthSeconds("compact", "intermediate"), 600);
    assert.equal(roundLengthSeconds("open", "intermediate"), 0);
  });
});

describe("secondsLeft", () => {
  test("clamps at zero after the round length", () => {
    const started = new Date("2026-09-08T19:00:00.000Z");
    const now = new Date("2026-09-08T19:10:01.000Z");
    assert.equal(
      secondsLeft({
        roundLengthSeconds: 600,
        roundStartedAt: started.toISOString(),
        now,
      }),
      0
    );
  });

  test("subtracts whole seconds from the start time", () => {
    const started = new Date("2026-09-08T19:00:00.000Z");
    const now = new Date("2026-09-08T19:00:12.400Z");
    assert.equal(
      secondsLeft({
        roundLengthSeconds: 240,
        roundStartedAt: started.toISOString(),
        now,
      }),
      228
    );
  });

  test("returns the full length before the clock starts", () => {
    assert.equal(
      secondsLeft({ roundLengthSeconds: 300, roundStartedAt: null }),
      300
    );
  });
});

describe("round advancement", () => {
  test("next from waiting is round 1, last timed round goes to done", () => {
    assert.equal(nextRoundCurrent(0, "compact"), 1);
    assert.equal(nextRoundCurrent(3, "compact"), 4);
    assert.equal(nextRoundCurrent(6, "standard"), 7);
    assert.equal(nextRoundCurrent(7, "standard"), 7);
    assert.equal(nextRoundCurrent(0, "open"), 0);
  });

  test("done is N plus one", () => {
    assert.equal(isRoundsComplete(3, "compact"), false);
    assert.equal(isRoundsComplete(4, "compact"), true);
    assert.equal(isRoundsComplete(7, "standard"), true);
    assert.equal(isRoundsComplete(1, "open"), false);
  });
});

describe("clock label", () => {
  test("formats minutes and zero-padded seconds", () => {
    assert.equal(formatRoundClock(600), "10:00");
    assert.equal(formatRoundClock(9), "0:09");
    assert.equal(formatRoundClock(0), "0:00");
  });
});

describe("questions", () => {
  test("drops blank and malformed entries", () => {
    const parsed = parseConversationQuestions([
      { id: 1, question: "Have you read Gabo?" },
      { id: 2, question: "  " },
      { question: "No id" },
      null,
    ]);
    assert.deepEqual(parsed, [{ id: 1, question: "Have you read Gabo?" }]);
  });

  test("appends a numbered list onto existing writing text", () => {
    assert.equal(
      numberedQuestionList(["First?", "Second?"]),
      "1. First?\n2. Second?"
    );
    assert.equal(
      appendNumberedQuestions("Write about Gabo.", ["Have you read him?"]),
      "Write about Gabo.\n1. Have you read him?"
    );
  });
});
