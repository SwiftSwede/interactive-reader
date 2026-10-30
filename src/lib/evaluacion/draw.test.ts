import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  drawConfirmationPass,
  drawPlacementPass,
  indexBank,
  orderedOptions,
  servableStatuses,
} from "./draw";
import { NO_SE_OPTION_ID, type EvalItem, type EvalStructure, type ItemRole, type ItemStatus } from "./types";

function structure(id: string, position: number): EvalStructure {
  return {
    id,
    track: "pre_int",
    kind: "grammar",
    displayNameEs: id,
    egpRef: null,
    egpLevel: "A2",
    l1Focus: true,
    classType: "writing",
    position,
  };
}

function item(id: string, structureId: string, role: ItemRole, status: ItemStatus = "draft"): EvalItem {
  return {
    id,
    structureId,
    role,
    format: "translation",
    prompt: id,
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
    correctOptionId: "a",
    ruleText: "rule",
    status,
  };
}

describe("orderedOptions", () => {
  const sample = item("x.p1", "x", "placement");

  test("is stable for one seed and keeps No sé last", () => {
    const first = orderedOptions(sample, 42);
    assert.deepEqual(first, orderedOptions(sample, 42));
    assert.equal(first.length, 5);
    assert.equal(first[4].id, NO_SE_OPTION_ID);
    assert.deepEqual(
      first.slice(0, 4).map((o) => o.id).sort(),
      ["a", "b", "c", "d"],
    );
  });

  test("different seeds reorder at least sometimes", () => {
    const orders = new Set(
      Array.from({ length: 12 }, (_, seed) =>
        orderedOptions(sample, seed).map((o) => o.id).join(""),
      ),
    );
    assert.ok(orders.size > 1);
  });
});

describe("servableStatuses", () => {
  test("production serves approved only unless drafts are forced", () => {
    assert.deepEqual([...servableStatuses({ nodeEnv: "production" })], ["approved"]);
    assert.deepEqual(
      [...servableStatuses({ nodeEnv: "production", includeDrafts: "1" })].sort(),
      ["approved", "draft"],
    );
    assert.deepEqual([...servableStatuses({ nodeEnv: "development" })].sort(), ["approved", "draft"]);
  });
});

describe("draws", () => {
  const bank = indexBank(
    [structure("s2", 2), structure("s1", 1), structure("s3", 3)],
    [
      item("s1.p1", "s1", "placement"),
      item("s1.r1", "s1", "rotation"),
      item("s1.c1", "s1", "confirmation"),
      item("s2.p1", "s2", "placement"),
      item("s3.p1", "s3", "placement", "retired"),
    ],
  );
  const servable = servableStatuses({ nodeEnv: "development" });

  test("placement follows track order and skips retired-only structures", () => {
    assert.deepEqual(drawPlacementPass(bank, "pre_int", servable, new Set()), ["s1.p1", "s2.p1"]);
  });

  test("a retake gets the rotation item, then repeats when nothing is fresh", () => {
    const seen = new Set(["s1.p1", "s2.p1"]);
    assert.deepEqual(drawPlacementPass(bank, "pre_int", servable, seen), ["s1.r1", "s2.p1"]);
  });

  test("a retake uses the confirmation item when the bank has no rotation row", () => {
    const seen = new Set(["s1.p1", "s1.r1", "s2.p1"]);
    assert.deepEqual(drawPlacementPass(bank, "pre_int", servable, seen), ["s1.c1", "s2.p1"]);
  });

  test("drafts never serve in production", () => {
    assert.deepEqual(
      drawPlacementPass(bank, "pre_int", servableStatuses({ nodeEnv: "production" }), new Set()),
      [],
    );
  });

  test("confirmation takes only fresh items", () => {
    assert.deepEqual(drawConfirmationPass(bank, ["s1", "s2"], servable, new Set()), ["s1.c1"]);
    assert.deepEqual(
      drawConfirmationPass(bank, ["s1"], servable, new Set(["s1.c1", "s1.r1"])),
      [],
    );
  });
});
