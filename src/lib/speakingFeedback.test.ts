import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  clampFeedbackCard,
  remainingAttempts,
  startOfMexicoCityDay,
  stripSpeechDashes,
  type AgentOutputs,
  type FeedbackCard,
} from "./speakingFeedback";
import type { PhonemeAggregate } from "./pronunciation/aggregatePhonemes";

const aggregate: PhonemeAggregate = {
  patterns: [
    {
      phoneme: "θ",
      ipaDisplay: "θ",
      instanceCount: 4,
      avgAccuracy: 41,
      exampleWords: ["think", "three"],
    },
  ],
  mangledWords: ["thorough"],
};

const agents: AgentOutputs = {
  grammar: {
    ok: false,
    errors: [
      {
        heard: "He change my mind",
        corrected: "He changed my mind",
        rule: "El pasado de change lleva -ed.",
      },
    ],
  },
  vocabulary: { ok: true, suggestions: [] },
  pronunciation: {
    ok: false,
    patterns: [
      {
        pattern: "θ",
        friendlyName: "La th de think",
        examples: ["think", "three"],
        tip: "Saca la lengua un poco.",
      },
    ],
    mangledWords: ["thorough"],
  },
};

const drafted: FeedbackCard = {
  transcript: "invented",
  patterns: [
    {
      name: "La th de think",
      examples: ["other"],
      tip: "Saca la lengua un poco.",
    },
  ],
  grammarFixes: [
    {
      heard: "He change my mind",
      corrected: "He changed my mind",
      rule: "El pasado de change lleva -ed.",
    },
    {
      heard: "This sentence was fine",
      corrected: "This sentence is fancy",
      rule: "Inventada.",
    },
  ],
  vocabularyTip: {
    heard: "big",
    better: "significant",
    why: "No corresponde.",
  },
  closingLine: "La próxima vez, cuida la th de think.",
};

describe("speaking feedback card", () => {
  test("drops invented grammar, empty vocabulary, and a rewritten transcript", () => {
    const card = clampFeedbackCard(
      drafted,
      agents,
      "He change my mind about work.",
      aggregate
    );
    assert.equal(card.transcript, "He change my mind about work.");
    assert.equal(card.grammarFixes.length, 1);
    assert.equal(card.vocabularyTip, null);
    assert.equal(card.patterns[0]?.ipa, "θ");
    assert.deepEqual(card.patterns[0]?.examples, ["think", "three"]);
  });

  test("strips em dashes from generated copy", () => {
    assert.equal(
      stripSpeechDashes("Cuida la th — la de think."),
      "Cuida la th. la de think."
    );
  });
});

describe("speaking attempt cap", () => {
  test("Mexico City midnight is 06:00 UTC", () => {
    const before = startOfMexicoCityDay(new Date("2026-10-19T05:30:00.000Z"));
    const after = startOfMexicoCityDay(new Date("2026-10-19T06:30:00.000Z"));
    assert.equal(before.toISOString(), "2026-10-18T06:00:00.000Z");
    assert.equal(after.toISOString(), "2026-10-19T06:00:00.000Z");
  });

  test("owners are uncapped and volunteers stop at three", () => {
    assert.equal(remainingAttempts(3, true), null);
    assert.equal(remainingAttempts(2, false), 1);
    assert.equal(remainingAttempts(3, false), 0);
  });
});
