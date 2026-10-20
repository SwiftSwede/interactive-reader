import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { aggregatePhonemePatterns, type SpokenWord } from "./aggregatePhonemes";

function word(
  text: string,
  accuracy: number,
  phonemes: SpokenWord["phonemes"]
): SpokenWord {
  return { word: text, accuracy, phonemes };
}

describe("aggregatePhonemePatterns", () => {
  test("needs three error instances before a phoneme is a pattern", () => {
    const words = [
      word("think", 70, [{ phoneme: "θ", accuracy: 40 }]),
      word("three", 70, [{ phoneme: "θ", accuracy: 50 }]),
      word("thing", 80, [{ phoneme: "θ", accuracy: 90 }]),
    ];
    const result = aggregatePhonemePatterns(words);
    assert.equal(result.patterns.length, 0);
  });

  test("groups the same IPA and sorts by count, then accuracy", () => {
    const theta = (accuracy: number) => [{ phoneme: "th", accuracy }];
    const vee = (accuracy: number) => [{ phoneme: "v", accuracy }];
    const words = [
      word("think", 80, theta(40)),
      word("three", 80, theta(50)),
      word("thanks", 80, theta(55)),
      word("very", 80, vee(20)),
      word("have", 80, vee(30)),
      word("over", 80, vee(35)),
      word("never", 80, vee(25)),
    ];
    const result = aggregatePhonemePatterns(words);
    assert.equal(result.patterns.length, 2);
    assert.equal(result.patterns[0]?.ipaDisplay, "v");
    assert.equal(result.patterns[0]?.instanceCount, 4);
    assert.equal(result.patterns[1]?.ipaDisplay, "θ");
    assert.deepEqual(result.patterns[1]?.exampleWords, [
      "think",
      "three",
      "thanks",
    ]);
  });

  test("keeps the three worst mangled words", () => {
    const words = [
      word("apple", 10, []),
      word("banana", 40, []),
      word("clear", 80, []),
      word("date", 20, []),
      word("apple", 5, []),
      word("elder", 39, []),
    ];
    const result = aggregatePhonemePatterns(words);
    assert.deepEqual(result.mangledWords, ["apple", "date", "elder"]);
  });
});
