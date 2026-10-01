import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  audioHighlightMode,
  endsSpokenSentence,
  lookedUpPositions,
  sentenceIdsForBody,
  sentenceRefLabel,
} from "./sentence-highlight";

describe("audioHighlightMode", () => {
  test("skips karaoke class on songs", () => {
    assert.equal(audioHighlightMode("song"), "none");
    assert.equal(audioHighlightMode("story"), "sentence");
    assert.equal(audioHighlightMode("dialogue"), "sentence");
    assert.equal(audioHighlightMode("movie_talk"), "sentence");
  });
});

describe("endsSpokenSentence", () => {
  test("treats period question and bang as sentence ends", () => {
    assert.equal(endsSpokenSentence("Hello."), true);
    assert.equal(endsSpokenSentence("Hello?"), true);
    assert.equal(endsSpokenSentence("Hello!"), true);
    assert.equal(endsSpokenSentence("Hello,"), false);
    assert.equal(endsSpokenSentence("Hello."), true);
  });
});

describe("sentenceIdsForBody", () => {
  test("maps story timestamps to sentence ranges", () => {
    const ids = sentenceIdsForBody(
      "Hello there. How are you? Fine!",
      "story"
    );
    assert.deepEqual(ids, [0, 0, 1, 1, 1, 2]);
  });

  test("highlights a dialogue Name: line as one sentence", () => {
    const ids = sentenceIdsForBody(
      "Maya: Hello there. How are you?\nLuis: Fine thanks.",
      "dialogue"
    );
    assert.deepEqual(ids, [0, 0, 0, 0, 0, 1, 1]);
  });
});

describe("sentenceRefLabel", () => {
  test("shows 1-based labels on every 5th sentence only", () => {
    assert.equal(sentenceRefLabel(0), null);
    assert.equal(sentenceRefLabel(3), null);
    assert.equal(sentenceRefLabel(4), 5);
    assert.equal(sentenceRefLabel(5), null);
    assert.equal(sentenceRefLabel(9), 10);
    assert.equal(sentenceRefLabel(14), 15);
    assert.equal(sentenceRefLabel(22), null);
  });

  test("returns null for ids that never reach sentence 5", () => {
    assert.equal(sentenceRefLabel(-1), null);
  });
});

describe("lookedUpPositions", () => {
  test("hydrates underlines from uncleared word ids", () => {
    const positions = lookedUpPositions(
      [
        { id: "a", position: 0 },
        { id: "b", position: 1 },
        { id: "c", position: 2 },
      ],
      ["b"]
    );
    assert.equal(positions.has(1), true);
    assert.equal(positions.has(0), false);
  });
});
