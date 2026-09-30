import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDeck, DAY_MS, EXERCISES_PER_CATEGORY_PER_DAY } from "./drills";
import type { DrillItem } from "./drills";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function item(
  partial: Partial<DrillItem> & Pick<DrillItem, "id" | "tagId" | "format">,
): DrillItem {
  return {
    tagType: "error",
    level: "pre_int",
    content: {},
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("a review sitting does not need an intro tag id", () => {
  const items: DrillItem[] = [
    item({ id: "a", tagId: "age", format: "cloze" }),
    item({ id: "b", tagId: "age", format: "cloze" }),
  ];
  const completed = new Date(NOW.getTime() - DAY_MS).toISOString();
  const deck = buildDeck({
    items,
    state: new Map(),
    now: NOW,
    level: "pre_int",
    introTagId: null,
    reviewTagIds: ["age"],
    introCompletedAtByTagId: new Map([["age", completed]]),
  });
  assert.equal(deck.length, 2);
  assert.ok(deck.length <= EXERCISES_PER_CATEGORY_PER_DAY);
});
