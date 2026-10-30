import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  correctPairOption,
  drawPairItems,
  pairOptionText,
  getPair,
  ITEMS_PER_PAIR,
  MINIMAL_PAIRS,
  pairAudioPath,
  pairIdOf,
  pairVerdicts,
  samplePairs,
  type PairAnswer,
} from "./pairs";

describe("pair bank", () => {
  test("every pair has at least three distinct word pairs", () => {
    for (const pair of MINIMAL_PAIRS) {
      assert.ok(pair.words.length >= ITEMS_PER_PAIR, pair.id);
      for (const [a, b] of pair.words) assert.notEqual(a, b, pair.id);
    }
  });

  test("audio paths are lowercase, dashed, without apostrophes", () => {
    assert.equal(pairAudioPath("nNG", "sit in"), "/audio/minimal-pairs/nNG/sit-in.mp3");
    assert.equal(
      pairAudioPath("LongOvsListerine", "won't"),
      "/audio/minimal-pairs/LongOvsListerine/wont.mp3",
    );
    assert.equal(pairAudioPath("tTH", "Thor"), "/audio/minimal-pairs/tTH/thor.mp3");
  });
});

describe("samplePairs", () => {
  test("picks two consonant and two vowel pairs, stable per seed", () => {
    const chosen = samplePairs(new Set(), "42");
    assert.equal(chosen.length, 4);
    assert.deepEqual(
      chosen.map((id) => getPair(id)?.kind),
      ["consonant", "consonant", "vowel", "vowel"],
    );
    assert.deepEqual(samplePairs(new Set(), "42"), chosen);
  });

  test("skips pairs already seen while fresh ones remain", () => {
    const first = samplePairs(new Set(), "7");
    const second = samplePairs(new Set(first), "7");
    assert.deepEqual(
      second.filter((id) => first.includes(id)),
      [],
    );
  });

  test("refills from seen pairs when every pair of a kind was seen", () => {
    const all = new Set(MINIMAL_PAIRS.map((pair) => pair.id));
    assert.equal(samplePairs(all, "1").length, 4);
  });
});

describe("drawPairItems", () => {
  test("three items per pair from distinct word pairs, word is one of the options", () => {
    const items = drawPairItems(["bv", "LongEvsShorti"], "9");
    assert.equal(items.length, 6);
    const bv = items.filter((item) => item.pairId === "bv");
    assert.equal(new Set(bv.map((item) => item.options.join("/"))).size, 3);
    for (const item of items) {
      assert.ok(item.options.includes(item.word));
      assert.equal(pairIdOf(item.id), item.pairId);
      assert.equal(pairOptionText(item, correctPairOption(item)), item.word);
    }
    assert.equal(pairOptionText(items[0], "pz"), null);
  });
});

describe("pairVerdicts", () => {
  const items = drawPairItems(["sz"], "3");
  const answer = (index: number, correct: boolean): [string, PairAnswer] => {
    const item = items[index];
    const other = item.options.find((word) => word !== item.word) ?? "";
    return [
      item.id,
      { itemId: item.id, selectedWord: correct ? item.word : other, isCorrect: correct },
    ];
  };

  test("two misses confirm, one is a candidate, none is clean", () => {
    const confirmed = pairVerdicts(items, new Map([answer(0, false), answer(1, false), answer(2, true)]));
    assert.equal(confirmed[0].status, "confirmed");
    assert.equal(confirmed[0].said, items[0].word);
    assert.notEqual(confirmed[0].heard, items[0].word);

    const candidate = pairVerdicts(items, new Map([answer(0, true), answer(1, false), answer(2, true)]));
    assert.equal(candidate[0].status, "candidate");

    const clean = pairVerdicts(items, new Map([answer(0, true), answer(1, true), answer(2, true)]));
    assert.equal(clean[0].status, null);
    assert.equal(clean[0].heard, null);
  });
});
