import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  phonemeGaps,
  selectSpeakingPatterns,
} from "./aggregatePatterns";
import type { SpokenWord } from "./aggregatePhonemes";
import {
  REFERENCE_GAP_POINTS,
  REFERENCE_MIN_INSTANCES,
} from "./speakingFeedbackConfig";

type ScoreMap = Record<string, number[]>;

function wordsFrom(groups: ScoreMap): SpokenWord[] {
  const words: SpokenWord[] = [];
  for (const [phoneme, scores] of Object.entries(groups)) {
    scores.forEach((accuracy, index) => {
      words.push({
        word: `${phoneme}-${index}`,
        accuracy,
        phonemes: [{ phoneme, accuracy }],
      });
    });
  }
  return words;
}

function repeat(
  phoneme: string,
  accuracy: number,
  count: number,
  word: string
): SpokenWord[] {
  return Array.from({ length: count }, (_, index) => ({
    word: `${word}${index}`,
    accuracy,
    phonemes: [{ phoneme, accuracy }],
  }));
}

const corpus = JSON.parse(
  readFileSync(
    new URL("./__fixtures__/speaking-corpus.json", import.meta.url),
    "utf8"
  )
) as {
  kyleGood: ScoreMap;
  kyleBad: ScoreMap;
  students: Record<string, ScoreMap>;
};

describe("selectSpeakingPatterns", () => {
  test("ranks a relaxed vowel against the reference, not as a wrong sound", () => {
    const reference = [
      ...repeat("ae", 99, 12, "cat"),
      ...repeat("eh", 99, 12, "bed"),
      ...repeat("t", 99, 12, "top"),
    ];
    const student = [
      ...repeat("ae", 86, 12, "cat"),
      ...repeat("eh", 88, 12, "bed"),
      ...repeat("t", 97, 12, "top"),
    ];
    const result = selectSpeakingPatterns(student, reference);
    assert.deepEqual(
      result.patterns.map((pattern) => pattern.ipaDisplay),
      ["æ", "ɛ"]
    );
    assert.equal(result.patterns[0]?.signal, "reference");
    assert.equal(result.patterns[0]?.feedbackShape, "quality");
    assert.ok(result.patterns.every((pattern) => pattern.avgAccuracy > 60));
  });

  test("ignores a reference gap built on two instances", () => {
    const reference = repeat("ae", 99, 12, "cat");
    const student = repeat("ae", 70, 2, "cat");
    const result = selectSpeakingPatterns(student, reference);
    assert.equal(
      result.patterns.some((pattern) => pattern.ipaDisplay === "æ"),
      false
    );
  });

  test("Kyle's good take against itself has no sag pattern", () => {
    const good = wordsFrom(corpus.kyleGood);
    const result = selectSpeakingPatterns(good, good);
    assert.equal(
      result.patterns.some((pattern) => pattern.signal === "sag" || pattern.signal === "both"),
      false
    );
  });

  test("the recorded corpus keeps the vowel gaps on signal B", () => {
    const good = wordsFrom(corpus.kyleGood);
    const bad = wordsFrom(corpus.kyleBad);
    const ranked = phonemeGaps(bad, good)
      .filter(
        (row) =>
          row.studentCount >= REFERENCE_MIN_INSTANCES &&
          row.referenceCount >= REFERENCE_MIN_INSTANCES
      )
      .slice(0, 5)
      .map((row) => row.ipa);
    assert.ok(ranked.includes("æ"));
    assert.ok(ranked.includes("ɛ"));

    let aeBelow = 0;
    let ehBelow = 0;
    for (const scores of Object.values(corpus.students)) {
      const student = wordsFrom(scores);
      const gaps = phonemeGaps(student, good);
      const ae = gaps.find((row) => row.ipa === "æ");
      const eh = gaps.find((row) => row.ipa === "ɛ");
      if (ae && ae.gap > 0) aeBelow += 1;
      if (eh && eh.gap > 0) ehBelow += 1;
      const shown = new Set(
        selectSpeakingPatterns(student, good).patterns.map((pattern) => pattern.ipaDisplay)
      );
      for (const row of [ae, eh]) {
        if (!row) continue;
        const clears =
          row.gap >= REFERENCE_GAP_POINTS &&
          row.studentCount >= REFERENCE_MIN_INSTANCES;
        if (!clears) continue;
        const topGaps = gaps
          .filter(
            (item) =>
              item.gap >= REFERENCE_GAP_POINTS &&
              item.studentCount >= REFERENCE_MIN_INSTANCES
          )
          .slice(0, 2);
        if (topGaps.some((item) => item.ipa === row.ipa)) {
          assert.equal(shown.has(row.ipa), true);
        }
      }
    }
    assert.equal(aeBelow, 7);
    assert.equal(ehBelow, 6);
  });
});
