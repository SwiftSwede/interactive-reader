import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyTagIndex, type TagDisplay, type TagDisplayIndex } from "./ficha";
import {
  ANALYTICS_WORD_LIMIT,
  buildAnalytics,
  isSoundBankCandidate,
  type BuildAnalyticsInput,
} from "./analytics";

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

function emptyInput(
  overrides: Partial<BuildAnalyticsInput> = {}
): BuildAnalyticsInput {
  return {
    tagIndex: emptyTagIndex(),
    lookups: [],
    evidence: [],
    errorEvents: [],
    ...overrides,
  };
}

test("isSoundBankCandidate is false below 3 students and true at 3", () => {
  assert.equal(isSoundBankCandidate(0), false);
  assert.equal(isSoundBankCandidate(2), false);
  assert.equal(isSoundBankCandidate(3), true);
  assert.equal(isSoundBankCandidate(8), true);
});

test("buildAnalytics returns empty arrays on empty inputs", () => {
  assert.deepEqual(buildAnalytics(emptyInput()), {
    words: [],
    errors: [],
    sounds: [],
  });
});

test("word grouping merges the same text across stories and counts rows as veces", () => {
  const analytics = buildAnalytics(
    emptyInput({
      lookups: [
        { userId: "s1", text: "Anyway" },
        { userId: "s1", text: "anyway" },
        { userId: "s2", text: "anyway" },
        { userId: "s3", text: "the" },
      ],
    })
  );

  assert.deepEqual(analytics.words, [
    { flagText: "Anyway", studentCount: 2, timesTotal: 3 },
    { flagText: "the", studentCount: 1, timesTotal: 1 },
  ]);
});

test("word grouping orders by studentCount then timesTotal and caps at 15", () => {
  const lookups = Array.from({ length: ANALYTICS_WORD_LIMIT }, (_, index) => ({
    userId: `s${index}`,
    text: `alpha-${String(index).padStart(2, "0")}`,
  }));
  lookups.push({ userId: "s-drop", text: "zzz-drop" });
  lookups.push({ userId: "extra-a", text: "alpha-00" });
  lookups.push({ userId: "extra-b", text: "alpha-00" });
  lookups.push({ userId: "extra-c", text: "alpha-01" });

  const analytics = buildAnalytics(emptyInput({ lookups }));
  assert.equal(analytics.words.length, ANALYTICS_WORD_LIMIT);
  assert.equal(analytics.words[0]?.flagText, "alpha-00");
  assert.equal(analytics.words[0]?.studentCount, 3);
  assert.equal(analytics.words[0]?.timesTotal, 3);
  assert.equal(analytics.words[1]?.flagText, "alpha-01");
  assert.equal(analytics.words[1]?.studentCount, 2);
  assert.equal(analytics.words[1]?.timesTotal, 2);
  assert.ok(!analytics.words.some((row) => row.flagText === "zzz-drop"));
});

test("error merge unions students across evidence and events; señales are events only", () => {
  const tagIndex = indexWith([
    {
      id: "tag-age",
      tagType: "error",
      name: "age_expression",
      displayName: "Age: I am 25",
    },
  ]);

  const analytics = buildAnalytics({
    tagIndex,
    lookups: [],
    evidence: [
      { userId: "s1", tagType: "error", tagId: "tag-age" },
      { userId: "s2", tagType: "error", tagId: "tag-age" },
      { userId: "s9", tagType: "phonetic", tagId: "tag-th" },
    ],
    errorEvents: [
      { userId: "s2", errorTags: ["age_expression"] },
      { userId: "s3", errorTags: ["age_expression"] },
    ],
  });

  assert.equal(analytics.errors.length, 1);
  assert.equal(analytics.errors[0]?.tagId, "tag-age");
  assert.equal(analytics.errors[0]?.displayName, "Age: I am 25");
  assert.equal(analytics.errors[0]?.studentCount, 3);
  assert.equal(analytics.errors[0]?.signalCount, 2);
  assert.equal(analytics.sounds[0]?.tagId, "tag-th");
});

test("error merge keeps unknown event names and does not count evidence as señales", () => {
  const analytics = buildAnalytics(
    emptyInput({
      evidence: [{ userId: "s1", tagType: "error", tagId: "missing-id" }],
      errorEvents: [{ userId: "s2", errorTags: ["not_a_real_tag"] }],
    })
  );

  assert.equal(analytics.errors.length, 2);
  const sticky = analytics.errors.find((row) => row.tagId === "missing-id");
  const fromEvent = analytics.errors.find((row) => row.tagId === "not_a_real_tag");
  assert.equal(sticky?.studentCount, 1);
  assert.equal(sticky?.signalCount, 0);
  assert.equal(fromEvent?.studentCount, 1);
  assert.equal(fromEvent?.signalCount, 1);
});

test("sounds include every phonetic tag with at least one student and sort by count", () => {
  const tagIndex = indexWith([
    {
      id: "th",
      tagType: "phonetic",
      name: "th_unvoiced",
      displayName: "TH sordo /θ/",
    },
    {
      id: "schwa",
      tagType: "phonetic",
      name: "schwa_reduction",
      displayName: "Schwa /ə/",
    },
  ]);

  const analytics = buildAnalytics({
    tagIndex,
    lookups: [],
    evidence: [
      { userId: "s1", tagType: "phonetic", tagId: "th" },
      { userId: "s2", tagType: "phonetic", tagId: "th" },
      { userId: "s3", tagType: "phonetic", tagId: "th" },
      { userId: "s1", tagType: "phonetic", tagId: "schwa" },
      { userId: "s1", tagType: "error", tagId: "ignored" },
    ],
    errorEvents: [],
  });

  assert.deepEqual(
    analytics.sounds.map((row) => ({
      tagId: row.tagId,
      displayName: row.displayName,
      studentCount: row.studentCount,
    })),
    [
      { tagId: "th", displayName: "TH sordo /θ/", studentCount: 3 },
      { tagId: "schwa", displayName: "Schwa /ə/", studentCount: 1 },
    ]
  );
  assert.equal(isSoundBankCandidate(analytics.sounds[0]?.studentCount ?? 0), true);
  assert.equal(isSoundBankCandidate(analytics.sounds[1]?.studentCount ?? 0), false);
});
