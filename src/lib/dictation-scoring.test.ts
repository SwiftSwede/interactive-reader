import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dictationNeedsMorePractice,
  normalizeDictationWord,
  scoreDictation,
  tokenizeDictation,
} from "./dictation-scoring";

test("normalization ignores punctuation and case but keeps contractions", () => {
  assert.equal(normalizeDictationWord("Don't!"), "don't");
  assert.equal(normalizeDictationWord("\u201CHello,\u201D"), "hello");
  assert.equal(normalizeDictationWord("..."), "");
  assert.deepEqual(tokenizeDictation("I don't know, really."), [
    "i",
    "don't",
    "know",
    "really",
  ]);
});

test("a perfect answer scores 1", () => {
  const score = scoreDictation(
    "He wanted the jersey.",
    "he wanted the jersey"
  );
  assert.equal(score.accuracy, 1);
  assert.equal(score.correctCount, 4);
  assert.deepEqual(score.missedWords, []);
});

test("smart quotes and punctuation differences do not count as errors", () => {
  const score = scoreDictation("Don't touch it!", "\u201Cdont touch it\u201D");
  // "dont" without the apostrophe is a real spelling miss, but "touch it" is fine.
  assert.equal(score.correctCount, 2);
  assert.deepEqual(score.missedWords, ["don't"]);
});

test("one missing word does not cascade into later words", () => {
  // The learner dropped "the" but got everything after it.
  const score = scoreDictation(
    "He wanted the soccer jersey",
    "He wanted soccer jersey"
  );
  assert.equal(score.correctCount, 4);
  assert.deepEqual(score.missedWords, ["the"]);
});

test("an extra word the learner invented does not break alignment", () => {
  const score = scoreDictation(
    "He wanted the jersey",
    "He really wanted the jersey"
  );
  assert.equal(score.accuracy, 1);
  assert.deepEqual(score.missedWords, []);
});

test("an empty answer scores zero and lists every word as missed", () => {
  const score = scoreDictation("He wanted the jersey", "");
  assert.equal(score.accuracy, 0);
  assert.equal(score.correctCount, 0);
  assert.deepEqual(score.missedWords, ["he", "wanted", "the", "jersey"]);
});

test("an empty reference cannot produce a score", () => {
  const score = scoreDictation("", "anything");
  assert.equal(score.totalCount, 0);
  assert.equal(score.accuracy, 0);
  assert.equal(dictationNeedsMorePractice(score), false);
});

test("the practice threshold flags a half-missed sentence, not a single slip", () => {
  const oneSlip = scoreDictation(
    "He wanted the soccer jersey for his birthday party today",
    "He wanted the soccer jersey for his birthday party"
  );
  assert.equal(dictationNeedsMorePractice(oneSlip), false);

  const halfMissed = scoreDictation(
    "He wanted the soccer jersey for his birthday",
    "He wanted the"
  );
  assert.equal(dictationNeedsMorePractice(halfMissed), true);
});

test("word results line up with the reference sentence", () => {
  const score = scoreDictation("a b c", "a c");
  assert.deepEqual(score.words, [
    { expected: "a", typed: "a", correct: true },
    { expected: "b", typed: null, correct: false },
    { expected: "c", typed: "c", correct: true },
  ]);
});
