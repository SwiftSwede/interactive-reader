import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCorrectionSegments, parseStoredFeedback } from "./personal-correction";

test("adverb move keeps the original and shows the destination", () => {
  const segments = buildCorrectionSegments(
    "Always I arrive on time",
    "I always arrive on time"
  );
  assert.deepEqual(segments, [
    { text: "Always", type: "moved" },
    { text: "I", type: "correct" },
    { text: "always", type: "placed" },
    { text: "arrive on time", type: "correct" },
  ]);
});

test("wrong phrase is struck through and the replacement is added", () => {
  const segments = buildCorrectionSegments(
    "Always I arrive at the time",
    "I always arrive on time"
  );
  assert.deepEqual(segments, [
    { text: "Always", type: "moved" },
    { text: "I", type: "correct" },
    { text: "always", type: "placed" },
    { text: "arrive", type: "correct" },
    { text: "at the", type: "deleted" },
    { text: "on", type: "added" },
    { text: "time", type: "correct" },
  ]);
});

test("a word that should not be there is deleted and the missing word is added", () => {
  const segments = buildCorrectionSegments(
    "No I like soccer",
    "I don't like soccer"
  );
  assert.deepEqual(segments, [
    { text: "No", type: "deleted" },
    { text: "I", type: "correct" },
    { text: "don't", type: "added" },
    { text: "like soccer", type: "correct" },
  ]);
});

test("at time becomes on time without moving time", () => {
  const segments = buildCorrectionSegments(
    "Always I arrive at time.",
    "I always arrive on time."
  );
  assert.deepEqual(segments, [
    { text: "Always", type: "moved" },
    { text: "I", type: "correct" },
    { text: "always", type: "placed" },
    { text: "arrive", type: "correct" },
    { text: "at", type: "deleted" },
    { text: "on", type: "added" },
    { text: "time.", type: "correct" },
  ]);
});

test("an unchanged answer stays unmarked", () => {
  const segments = buildCorrectionSegments(
    "I never watch soccer",
    "I never watch soccer"
  );
  assert.deepEqual(segments, [
    { text: "I never watch soccer", type: "correct" },
  ]);
});

test("parseStoredFeedback keeps valid segments and drops junk", () => {
  const parsed = parseStoredFeedback({
    corrections: [
      { text: "Always", type: "moved" },
      { text: "I", type: "correct" },
      { text: "nope", type: "unknown" },
      { text: 1, type: "added" },
    ],
    note: "En ingles, 'always' va despues del sujeto.",
  });
  assert.deepEqual(parsed, {
    corrections: [
      { text: "Always", type: "moved" },
      { text: "I", type: "correct" },
    ],
    note: "En ingles, 'always' va despues del sujeto.",
  });
});

test("parseStoredFeedback returns null for empty or invalid payloads", () => {
  assert.equal(parseStoredFeedback(null), null);
  assert.equal(parseStoredFeedback({ note: "hola" }), null);
  assert.equal(parseStoredFeedback({ corrections: [] }), null);
});
