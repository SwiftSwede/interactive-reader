import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  flagAnchorKey,
  nextOccurrenceIndex,
  occurrenceIndexForTokens,
  requestCountByAnchor,
  shouldUnmarkAll,
  wordFlagClassName,
} from "./word-flags";

describe("occurrence index", () => {
  test("counts each raw token before incrementing", () => {
    const counts = new Map<string, number>();
    assert.equal(nextOccurrenceIndex(counts, "the"), 0);
    assert.equal(nextOccurrenceIndex(counts, "cat"), 0);
    assert.equal(nextOccurrenceIndex(counts, "the"), 1);
    assert.equal(nextOccurrenceIndex(counts, "the,"), 0);
  });

  test("the twice in a short walk is 0 then 1", () => {
    assert.deepEqual(occurrenceIndexForTokens(["the", "cat", "and", "the", "dog"]), [
      0, 0, 0, 1, 0,
    ]);
  });
});

describe("flag toggle", () => {
  test("unmarks only when every selected anchor already has the type", () => {
    assert.equal(
      shouldUnmarkAll(
        [{ types: ["bold"] }, { types: ["bold", "underline"] }],
        "bold"
      ),
      true
    );
    assert.equal(
      shouldUnmarkAll(
        [{ types: ["underline"] }, { types: [] }],
        "underline"
      ),
      false
    );
  });
});

describe("request counts", () => {
  test("aggregates by text and occurrence", () => {
    const counts = requestCountByAnchor([
      { id: "1", flagText: "the", occurrenceIndex: 0 },
      { id: "2", flagText: "the", occurrenceIndex: 0 },
      { id: "3", flagText: "the", occurrenceIndex: 1 },
    ]);
    assert.equal(counts.get(flagAnchorKey("the", 0)), 2);
    assert.equal(counts.get(flagAnchorKey("the", 1)), 1);
  });
});

describe("flag class names", () => {
  test("keys flags by text and occurrence", () => {
    assert.equal(flagAnchorKey("wool", 2), "wool::2");
  });

  test("applies bold, underline, and own-request classes", () => {
    assert.equal(
      wordFlagClassName({ bold: true, underline: true, requestedOwn: true }),
      "word-flag-bold word-flag-underline word-requested-own"
    );
    assert.equal(wordFlagClassName({}), "");
  });
});
