import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildFicha,
  countWeakSounds,
  emptyTagIndex,
  familyLabelFor,
  mergeFlaggedWords,
  sourceLabelFor,
  truncateFichaText,
  type TagDisplay,
  type TagDisplayIndex,
} from "./ficha";

function indexWith(tags: Array<TagDisplay & { id: string }>): TagDisplayIndex {
  const index = emptyTagIndex();
  for (const tag of tags) {
    const display = {
      tagType: tag.tagType,
      name: tag.name,
      displayName: tag.displayName,
    };
    index.byId.set(tag.id, display);
    index.byName.set(`${tag.tagType}:${tag.name}`, display);
  }
  return index;
}

test("countWeakSounds counts symbols across attempts and skips empties", () => {
  assert.deepEqual(
    countWeakSounds([
      { weakSounds: ["θ", "ɪ"] },
      { weakSounds: ["θ", ""] },
      { weakSounds: [] },
    ]),
    [
      { ipa: "θ", count: 2 },
      { ipa: "ɪ", count: 1 },
    ]
  );
});

test("countWeakSounds returns empty for empty attempts", () => {
  assert.deepEqual(countWeakSounds([]), []);
  assert.deepEqual(countWeakSounds([{ weakSounds: [] }]), []);
});

test("countWeakSounds keeps the top 6 by frequency", () => {
  const summary = countWeakSounds([
    { weakSounds: ["a", "b", "c", "d", "e", "f", "g"] },
    { weakSounds: ["a", "b", "c"] },
  ]);
  assert.equal(summary.length, 6);
  assert.deepEqual(
    summary.map((row) => row.ipa),
    ["a", "b", "c", "d", "e", "f"]
  );
  assert.equal(summary[0]?.count, 2);
  assert.equal(summary[5]?.count, 1);
});

test("mergeFlaggedWords sums the same word across stories and keeps the latest date", () => {
  const merged = mergeFlaggedWords([
    {
      flagText: "the",
      timesRequested: 2,
      lastRequestedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      flagText: "the",
      timesRequested: 3,
      lastRequestedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      flagText: "anyway",
      timesRequested: 4,
      lastRequestedAt: "2026-02-01T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(merged, [
    {
      flagText: "the",
      timesRequested: 5,
      lastRequestedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      flagText: "anyway",
      timesRequested: 4,
      lastRequestedAt: "2026-02-01T00:00:00.000Z",
    },
  ]);
});

test("mergeFlaggedWords orders by count then latest date and caps at 10", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    flagText: `word-${index}`,
    timesRequested: index < 2 ? 5 : 1,
    lastRequestedAt:
      index === 0
        ? "2026-01-01T00:00:00.000Z"
        : index === 1
          ? "2026-02-01T00:00:00.000Z"
          : `2026-03-${String(index).padStart(2, "0")}T00:00:00.000Z`,
  }));

  const merged = mergeFlaggedWords(rows);
  assert.equal(merged.length, 10);
  assert.equal(merged[0]?.flagText, "word-1");
  assert.equal(merged[1]?.flagText, "word-0");
  assert.equal(merged[2]?.flagText, "word-11");
});

test("truncateFichaText cuts answer and corrected to 500", () => {
  const long = "x".repeat(600);
  assert.equal(truncateFichaText(long).length, 500);
  assert.equal(truncateFichaText("short"), "short");
});

test("buildFicha returns empty arrays on empty inputs", () => {
  const ficha = buildFicha({
    tagIndex: emptyTagIndex(),
    flags: [],
    errorEvents: [],
    observations: [],
    flaggedWords: [],
    weakSounds: [],
  });

  assert.deepEqual(ficha, {
    flags: [],
    errorEvents: [],
    flaggedWords: [],
    weakSounds: [],
    observations: [],
  });
});

test("buildFicha falls back to the raw id or name when the catalog misses", () => {
  const ficha = buildFicha({
    tagIndex: emptyTagIndex(),
    flags: [
      {
        tagType: "error",
        tagId: "missing-tag-id",
        sourceType: "comprehension",
        updatedAt: "2026-09-28T12:00:00.000Z",
      },
    ],
    errorEvents: [
      {
        occurredAt: "2026-09-28T12:00:00.000Z",
        errorTags: ["not_a_real_tag"],
        answer: "I have 25 years",
        corrected: "I am 25",
      },
    ],
    observations: [
      {
        occurredAt: "2026-09-28T12:00:00.000Z",
        flags: ["unknown_flag"],
        clears: ["unknown_clear"],
        note: "lo noté en clase",
      },
    ],
    flaggedWords: [],
    weakSounds: [],
  });

  assert.equal(ficha.flags[0]?.displayName, "missing-tag-id");
  assert.deepEqual(ficha.errorEvents[0]?.tagDisplayNames, ["not_a_real_tag"]);
  assert.deepEqual(ficha.observations[0]?.flags, ["unknown_flag"]);
  assert.deepEqual(ficha.observations[0]?.clears, ["unknown_clear"]);
});

test("buildFicha resolves names, family labels, and tú vs sistema", () => {
  const tagIndex = indexWith([
    {
      id: "tag-1",
      tagType: "error",
      name: "age_expression",
      displayName: "Age: I am 25",
    },
    {
      id: "tag-2",
      tagType: "phonetic",
      name: "th",
      displayName: "th",
    },
    {
      id: "tag-3",
      tagType: "grammar",
      name: "present_perfect",
      displayName: "Present Perfect",
    },
  ]);

  const ficha = buildFicha({
    tagIndex,
    flags: [
      {
        tagType: "phonetic",
        tagId: "tag-2",
        sourceType: "teacher_observation",
        updatedAt: "2026-09-29T10:00:00.000Z",
      },
      {
        tagType: "grammar",
        tagId: "tag-3",
        sourceType: "dictation",
        updatedAt: "2026-09-28T10:00:00.000Z",
      },
    ],
    errorEvents: [
      {
        occurredAt: "2026-09-29T09:00:00.000Z",
        errorTags: ["age_expression"],
        answer: "I have 25 years",
        corrected: "I am 25",
      },
    ],
    observations: [
      {
        occurredAt: "2026-09-29T10:00:00.000Z",
        flags: ["th"],
        clears: ["present_perfect"],
        note: "",
      },
    ],
    flaggedWords: [
      {
        flagText: "anyway",
        timesRequested: 3,
        lastRequestedAt: "2026-09-20T00:00:00.000Z",
      },
    ],
    weakSounds: [{ ipa: "θ", count: 4 }],
  });

  assert.equal(ficha.flags[0]?.displayName, "th");
  assert.equal(ficha.flags[0]?.familyLabel, "Sonido");
  assert.equal(ficha.flags[0]?.sourceLabel, "tú");
  assert.equal(ficha.flags[1]?.familyLabel, "Gramática");
  assert.equal(ficha.flags[1]?.sourceLabel, "sistema");
  assert.deepEqual(ficha.errorEvents[0]?.tagDisplayNames, ["Age: I am 25"]);
  assert.deepEqual(ficha.observations[0]?.flags, ["th"]);
  assert.deepEqual(ficha.observations[0]?.clears, ["Present Perfect"]);
  assert.equal(familyLabelFor("vocabulary"), "Vocabulario");
  assert.equal(familyLabelFor("error"), "Error");
  assert.equal(sourceLabelFor("writing"), "sistema");
});
