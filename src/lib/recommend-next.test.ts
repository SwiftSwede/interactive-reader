import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_NEW_OR_STRUGGLE,
  pickNextActivity,
  type RecommendableItem,
} from "./recommend-next";
import type { EvidenceStatus, TagType } from "@/types";

function item(
  id: string,
  options: Partial<RecommendableItem> & {
    tags?: RecommendableItem["tags"];
  } = {}
): RecommendableItem {
  return {
    contentType: "story",
    contentId: id,
    level: options.level ?? "pre-intermediate",
    title: options.title ?? id,
    slug: options.slug ?? id,
    isFree: options.isFree ?? false,
    tags: options.tags ?? [],
  };
}

function tags(
  ...rest: Array<[string, TagType, RecommendableItem["tags"][number]["coverageLevel"]?]>
): RecommendableItem["tags"] {
  return rest.map(([tagId, tagType, coverageLevel = "introduced"]) => ({
    tagId,
    tagType,
    coverageLevel,
  }));
}

function evidence(
  entries: Array<[string, EvidenceStatus]>
): Map<string, EvidenceStatus> {
  return new Map(entries);
}

test("a learner with no evidence gets a level-appropriate first story, not a C1 text", () => {
  const pick = pickNextActivity({
    items: [
      item("c1-heavy", {
        level: "intermediate",
        tags: tags(["third_conditional", "grammar"]),
      }),
      item("pre-int-free", {
        level: "pre-intermediate",
        isFree: true,
        tags: tags(["past_simple", "grammar"]),
      }),
      item("pre-int-other", {
        level: "pre-intermediate",
        tags: tags(["past_simple", "grammar"]),
      }),
    ],
    completedContentIds: new Set(),
    evidenceByTagId: evidence([]),
    preferredLevel: "pre-intermediate",
  });

  assert.equal(pick?.contentId, "pre-int-free");
  assert.equal(pick?.contentType, "story");
});

test("completed stories leave the pool", () => {
  const pick = pickNextActivity({
    items: [
      item("done", { tags: tags(["past_simple", "grammar"]) }),
      item("next", { tags: tags(["past_simple", "grammar"]) }),
    ],
    completedContentIds: new Set(["done"]),
    evidenceByTagId: evidence([["past_simple", "practiced"]]),
    preferredLevel: "pre-intermediate",
  });

  assert.equal(pick?.contentId, "next");
});

test("a sticky phonetic struggle prefers a story that reinforces that sound", () => {
  const pick = pickNextActivity({
    items: [
      item("unrelated", {
        tags: tags(["past_simple", "grammar"], ["schwa_reduction", "phonetic"]),
      }),
      item("introduces-ed", {
        tags: tags(
          ["past_simple", "grammar"],
          ["ed_endings_voiceless", "phonetic", "introduced"]
        ),
      }),
      item("reinforces-ed", {
        tags: tags(
          ["past_simple", "grammar"],
          ["ed_endings_voiceless", "phonetic", "reinforced"]
        ),
      }),
    ],
    completedContentIds: new Set(),
    evidenceByTagId: evidence([
      ["past_simple", "practiced"],
      ["ed_endings_voiceless", "needs_more_practice"],
    ]),
    preferredLevel: "pre-intermediate",
  });

  assert.equal(pick?.contentId, "reinforces-ed");
});

test("N+1 rejects a story that piles on more than two new or struggling tags", () => {
  const familiar = item("familiar-plus-one", {
    tags: tags(
      ["past_simple", "grammar"],
      ["present_simple", "grammar"],
      ["sports", "vocabulary"],
      ["ed_endings_voiceless", "phonetic"]
    ),
  });
  const pileOn = item("pile-on", {
    tags: tags(
      ["third_conditional", "grammar"],
      ["mixed_conditional", "grammar"],
      ["wish_structures", "grammar"],
      ["crime", "vocabulary"]
    ),
  });

  const pick = pickNextActivity({
    items: [pileOn, familiar],
    completedContentIds: new Set(),
    evidenceByTagId: evidence([
      ["past_simple", "practiced"],
      ["present_simple", "seen"],
      ["sports", "seen"],
    ]),
    preferredLevel: "pre-intermediate",
  });

  assert.equal(pick?.contentId, "familiar-plus-one");
  assert.ok(MAX_NEW_OR_STRUGGLE === 2);
});

test("returns null when every story is already completed", () => {
  const pick = pickNextActivity({
    items: [item("only")],
    completedContentIds: new Set(["only"]),
    evidenceByTagId: evidence([]),
    preferredLevel: null,
  });

  assert.equal(pick, null);
});
