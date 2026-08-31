import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildWritesFromTags,
  focusTagIdsForWeakSounds,
  nextEvidenceStatus,
  tagTypesForSource,
} from "./topic-evidence";
import type { ContentTag, EvidenceSourceType } from "@/types";

function tag(
  tagId: string,
  tagType: ContentTag["tagType"],
  coverageLevel: ContentTag["coverageLevel"] = "introduced"
): ContentTag {
  return {
    id: `ct-${tagId}`,
    contentType: "story",
    contentId: "story-1",
    tagType,
    tagId,
    coverageLevel,
  };
}

test("an empty topic takes whatever the activity reports", () => {
  assert.equal(
    nextEvidenceStatus(null, { status: "seen", sourceType: "reading" }),
    "seen"
  );
  assert.equal(
    nextEvidenceStatus(null, {
      status: "needs_more_practice",
      sourceType: "dictation",
    }),
    "needs_more_practice"
  );
});

test("passive exposure never rewrites an existing judgement", () => {
  for (const sourceType of ["reading", "word_lookup"] as EvidenceSourceType[]) {
    assert.equal(
      nextEvidenceStatus(
        { status: "needs_more_practice" },
        { status: "seen", sourceType }
      ),
      null
    );
    assert.equal(
      nextEvidenceStatus({ status: "practiced" }, { status: "seen", sourceType }),
      null
    );
    assert.equal(
      nextEvidenceStatus({ status: "seen" }, { status: "seen", sourceType }),
      null
    );
  }
});

test("needs_more_practice is sticky: reading another story cannot clear it", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "seen", sourceType: "reading" }
    ),
    null
  );
});

test("a clean practice activity clears needs_more_practice", () => {
  for (const sourceType of [
    "comprehension",
    "dictation",
    "pronunciation",
    "writing",
    "exam",
  ] as EvidenceSourceType[]) {
    assert.equal(
      nextEvidenceStatus(
        { status: "needs_more_practice" },
        { status: "practiced", sourceType }
      ),
      "practiced",
      `${sourceType} should clear`
    );
  }
});

test("a personal response cannot clear needs_more_practice", () => {
  // One whole-sentence AI correction is too coarse to declare a specific
  // grammar topic recovered.
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "practiced", sourceType: "personal_response" }
    ),
    null
  );
});

test("a struggle from any practice activity is recorded", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "needs_more_practice", sourceType: "dictation" }
    ),
    "needs_more_practice"
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "seen" },
      { status: "needs_more_practice", sourceType: "pronunciation" }
    ),
    "needs_more_practice"
  );
});

test("a repeat struggle is not rewritten", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "needs_more_practice", sourceType: "dictation" }
    ),
    null
  );
});

test("practiced is never downgraded to seen", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "seen", sourceType: "comprehension" }
    ),
    null
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "seen" },
      { status: "practiced", sourceType: "comprehension" }
    ),
    "practiced"
  );
});

test("each activity only writes tag types it can judge", () => {
  assert.deepEqual(tagTypesForSource("dictation"), ["phonetic"]);
  assert.deepEqual(tagTypesForSource("word_lookup"), ["vocabulary"]);
  assert.deepEqual(tagTypesForSource("personal_response"), ["grammar"]);
  assert.deepEqual(tagTypesForSource("reading"), [
    "grammar",
    "vocabulary",
    "phonetic",
  ]);
});

test("dictation writes phonetic tags and ignores the rest", () => {
  const tags = [
    tag("g1", "grammar"),
    tag("v1", "vocabulary"),
    tag("p1", "phonetic"),
    tag("p2", "phonetic"),
  ];

  const writes = buildWritesFromTags({
    tags,
    sourceType: "dictation",
    positiveStatus: "practiced",
  });

  assert.deepEqual(
    writes.map((write) => write.tagId),
    ["p1", "p2"]
  );
  assert.ok(writes.every((write) => write.status === "practiced"));
});

test("focus tags get needs_more_practice while siblings stay positive", () => {
  const writes = buildWritesFromTags({
    tags: [tag("p1", "phonetic"), tag("p2", "phonetic")],
    sourceType: "pronunciation",
    positiveStatus: "practiced",
    focusTagIds: ["p2"],
  });

  assert.deepEqual(writes, [
    { tagType: "phonetic", tagId: "p1", status: "practiced" },
    { tagType: "phonetic", tagId: "p2", status: "needs_more_practice" },
  ]);
});

test("weak Azure sounds map to the story's phonetic tags only", () => {
  const tags = [tag("p-th", "phonetic"), tag("p-schwa", "phonetic")];
  const names = new Map([
    ["p-th", "th_unvoiced"],
    ["p-schwa", "schwa_reduction"],
  ]);

  assert.deepEqual(focusTagIdsForWeakSounds(tags, ["θ"], names), ["p-th"]);
  assert.deepEqual(focusTagIdsForWeakSounds(tags, ["ə"], names), ["p-schwa"]);

  // A weak sound the story does not teach is not claimed.
  assert.deepEqual(focusTagIdsForWeakSounds(tags, ["ŋ"], names), []);
  assert.deepEqual(focusTagIdsForWeakSounds(tags, [], names), []);
});
