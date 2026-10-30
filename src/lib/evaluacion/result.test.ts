import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildResult } from "./result";
import type { AnswerRecord, EvalItem, EvalStructure } from "./types";

function structure(id: string, egpLevel: EvalStructure["egpLevel"], position: number): EvalStructure {
  return {
    id,
    track: "int",
    kind: "grammar",
    displayNameEs: `Nombre ${id}`,
    egpRef: null,
    egpLevel,
    l1Focus: true,
    classType: "writing",
    position,
  };
}

function item(id: string, structureId: string): EvalItem {
  return {
    id,
    structureId,
    role: "placement",
    format: "translation",
    prompt: `Prompt ${id}`,
    options: [
      { id: "a", text: "Right" },
      { id: "b", text: "Wrong" },
      { id: "c", text: "Other" },
      { id: "d", text: "Last" },
    ],
    correctOptionId: "a",
    ruleText: `Regla ${id}`,
    status: "draft",
  };
}

describe("buildResult", () => {
  const structuresById = new Map(
    [structure("s1", "B1", 1), structure("s2", "A2", 2), structure("s3", "B1", 3)].map((s) => [s.id, s]),
  );
  const itemsById = new Map([
    ["p1", item("p1", "s1")],
    ["p2", item("p2", "s2")],
    ["p3", item("p3", "s3")],
    ["c1", { ...item("c1", "s1"), role: "confirmation" as const }],
  ]);
  const answers = new Map<string, AnswerRecord>([
    ["p1", { itemId: "p1", selectedOptionId: "b", isCorrect: false }],
    ["p2", { itemId: "p2", selectedOptionId: "no_se", isCorrect: false }],
    ["p3", { itemId: "p3", selectedOptionId: "a", isCorrect: true }],
    ["c1", { itemId: "c1", selectedOptionId: "c", isCorrect: false }],
  ]);

  const result = buildResult({
    journey: [
      { kind: "placement", track: "int", itemIds: ["p1", "p2", "p3"] },
      { kind: "confirmation", track: "int", itemIds: ["c1"] },
    ],
    answers,
    itemsById,
    structuresById,
    outcome: "settled",
    placedTrack: "int",
  });

  test("splits confirmed holes from candidates, foundational first", () => {
    assert.deepEqual(result.confirmed.map((h) => h.structureId), ["s1"]);
    assert.deepEqual(result.candidates.map((h) => h.structureId), ["s2"]);
  });

  test("review lists wrong answers first and shows No sé", () => {
    assert.deepEqual(
      result.review.map((entry) => [entry.itemId, entry.isCorrect]),
      [
        ["p1", false],
        ["p2", false],
        ["c1", false],
        ["p3", true],
      ],
    );
    const noSe = result.review.find((entry) => entry.itemId === "p2");
    assert.equal(noSe?.choseNoSe, true);
    assert.equal(noSe?.selectedText, "No sé");
    assert.equal(noSe?.correctText, "Right");
    assert.equal(noSe?.ruleText, "Regla p2");
  });
});
