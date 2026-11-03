import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { rollupEvalStats, type AttemptStat } from "./stats";

function attempt(partial: Partial<AttemptStat> & Pick<AttemptStat, "status">): AttemptStat {
  return {
    opener: "converso",
    outcome: null,
    placedTrack: null,
    ...partial,
  };
}

describe("rollupEvalStats", () => {
  test("completion rate ignores Superpack redirects", () => {
    const stats = rollupEvalStats({
      attempts: [
        attempt({ status: "finished", outcome: "settled", placedTrack: "int" }),
        attempt({ status: "finished", outcome: "top", placedTrack: "upper" }),
        attempt({ status: "in_progress" }),
        attempt({ status: "redirected", opener: "no_se_nada", outcome: "redirected" }),
      ],
      answers: [],
      items: [],
      pairAnswers: [],
    });
    assert.equal(stats.started, 4);
    assert.equal(stats.finished, 2);
    assert.equal(stats.open, 1);
    assert.equal(stats.redirected, 1);
    assert.equal(stats.completionRate, 67);
  });

  test("completion rate is null when nobody entered the quiz", () => {
    const stats = rollupEvalStats({
      attempts: [attempt({ status: "redirected", opener: "no_se_nada", outcome: "redirected" })],
      answers: [],
      items: [],
      pairAnswers: [],
    });
    assert.equal(stats.completionRate, null);
  });

  test("tracks, outcomes, and openers keep a zero row", () => {
    const stats = rollupEvalStats({
      attempts: [
        attempt({
          status: "finished",
          opener: "principiante",
          outcome: "settled",
          placedTrack: "beginner",
        }),
      ],
      answers: [],
      items: [],
      pairAnswers: [],
    });
    assert.deepEqual(
      stats.tracks.map((row) => [row.label, row.count]),
      [
        ["A1", 1],
        ["A2", 0],
        ["B1", 0],
        ["B2", 0],
      ],
    );
    assert.equal(stats.outcomes.find((row) => row.label === "Asentado")?.count, 1);
    assert.equal(stats.outcomes.find((row) => row.label === "Tope")?.count, 0);
    assert.equal(stats.openers.find((row) => row.label === "Principiante total")?.count, 1);
    assert.equal(stats.openers.find((row) => row.label === "No sé nada")?.count, 0);
  });

  test("item and pair miss lists need five answers and sort worst first", () => {
    const answers = [
      ...Array.from({ length: 4 }, () => ({ itemId: "too-few", isCorrect: false })),
      ...Array.from({ length: 5 }, () => ({ itemId: "hard", isCorrect: false })),
      ...Array.from({ length: 4 }, () => ({ itemId: "mixed", isCorrect: false })),
      { itemId: "mixed", isCorrect: true },
    ];
    const pairAnswers = [
      ...Array.from({ length: 5 }, () => ({ pairId: "bv", isCorrect: false })),
      ...Array.from({ length: 3 }, () => ({ pairId: "sz", isCorrect: false })),
      ...Array.from({ length: 2 }, () => ({ pairId: "sz", isCorrect: true })),
    ];
    const stats = rollupEvalStats({
      attempts: [],
      answers,
      items: [
        { id: "hard", prompt: "She works.", structureName: "Presente" },
        { id: "mixed", prompt: "There is a dog.", structureName: "There is" },
        { id: "too-few", prompt: "Skip me.", structureName: "Poco" },
      ],
      pairAnswers,
    });
    assert.deepEqual(
      stats.questions.map((row) => [row.label, row.missPercent, row.answers]),
      [
        ["Presente", 100, 5],
        ["There is", 80, 5],
      ],
    );
    assert.equal(stats.questions[0]?.detail, "She works.");
    assert.deepEqual(
      stats.sounds.map((row) => [row.label, row.missPercent]),
      [
        ["/b/ y /v/", 100],
        ["/s/ y /z/", 60],
      ],
    );
  });
});
