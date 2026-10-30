import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  bandFor,
  computeHoles,
  confirmationStructureIds,
  decideAfterPlacement,
  planNext,
  trackForOpener,
  type PlacementResult,
} from "./engine";
import type { AnswerRecord, EvalItem, EvalStructure, JourneyPass, Track } from "./types";

function pass(track: Track, correct: number, total = 15, missed: string[] = []): PlacementResult {
  return { track, correct, total, band: bandFor(correct, total), missedStructureIds: missed };
}

describe("bandFor", () => {
  test("keeps the original 15-item bands", () => {
    assert.equal(bandFor(15, 15), "promote");
    assert.equal(bandFor(12, 15), "promote");
    assert.equal(bandFor(11, 15), "settle");
    assert.equal(bandFor(7, 15), "settle");
    assert.equal(bandFor(6, 15), "demote");
    assert.equal(bandFor(0, 15), "demote");
  });

  test("compares exact fractions on other track sizes", () => {
    assert.equal(bandFor(6, 8), "settle");
    assert.equal(bandFor(7, 8), "promote");
    assert.equal(bandFor(14, 17), "promote");
    assert.equal(bandFor(13, 17), "settle");
    assert.equal(bandFor(8, 17), "settle");
    assert.equal(bandFor(7, 17), "demote");
    assert.equal(bandFor(7, 14), "settle");
    assert.equal(bandFor(6, 14), "demote");
  });
});

describe("trackForOpener", () => {
  test("routes each opener and redirects No sé nada", () => {
    assert.equal(trackForOpener("no_se_nada"), null);
    assert.equal(trackForOpener("principiante"), "beginner");
    assert.equal(trackForOpener("armo_oraciones"), "pre_int");
    assert.equal(trackForOpener("converso"), "int");
    assert.equal(trackForOpener("pulir"), "int");
  });
});

describe("decideAfterPlacement", () => {
  test("settles in the band", () => {
    const decision = decideAfterPlacement([pass("int", 9)]);
    assert.equal(decision.type, "settle");
    assert.equal(decision.type === "settle" && decision.track, "int");
  });

  test("promotes one track up", () => {
    assert.deepEqual(decideAfterPlacement([pass("pre_int", 13)]), {
      type: "placement",
      track: "int",
      transition: "promote",
    });
  });

  test("top track promote settles at top", () => {
    const decision = decideAfterPlacement([pass("int", 13), pass("upper", 14)]);
    assert.equal(decision.type, "settle");
    if (decision.type !== "settle") return;
    assert.equal(decision.top, true);
    assert.equal(decision.track, "upper");
    assert.equal(decision.promotedFrom?.track, "int");
  });

  test("demotes one track down", () => {
    assert.deepEqual(decideAfterPlacement([pass("int", 3)]), {
      type: "placement",
      track: "pre_int",
      transition: "demote",
    });
  });

  test("failing the bottom track is the gentle ending", () => {
    assert.deepEqual(decideAfterPlacement([pass("beginner", 2)]), {
      type: "gentle",
      placedTrack: "beginner",
    });
  });

  test("a second demote ends the quiz instead of looping", () => {
    assert.deepEqual(decideAfterPlacement([pass("upper", 2), pass("int", 4)]), {
      type: "gentle",
      placedTrack: "pre_int",
    });
  });

  test("promote after a demote settles instead of climbing back", () => {
    const decision = decideAfterPlacement([pass("int", 3), pass("pre_int", 14)]);
    assert.equal(decision.type, "settle");
    if (decision.type !== "settle") return;
    assert.equal(decision.track, "pre_int");
    assert.equal(decision.top, false);
    assert.equal(decision.promotedFrom, null);
  });

  test("failing after a promotion settles at the passed track", () => {
    const beginner = pass("beginner", 13, 15, ["b1"]);
    const decision = decideAfterPlacement([beginner, pass("pre_int", 3)]);
    assert.equal(decision.type, "settle");
    if (decision.type !== "settle") return;
    assert.equal(decision.track, "beginner");
    assert.equal(decision.settledPass, beginner);
    assert.equal(decision.promotedFrom, null);
  });

  test("double promoter settles with the promoted-from pass", () => {
    const decision = decideAfterPlacement([
      pass("beginner", 14),
      pass("pre_int", 13),
      pass("int", 9),
    ]);
    assert.equal(decision.type, "settle");
    if (decision.type !== "settle") return;
    assert.equal(decision.track, "int");
    assert.equal(decision.promotedFrom?.track, "pre_int");
  });
});

function structure(id: string, egpLevel: EvalStructure["egpLevel"], position: number): EvalStructure {
  return {
    id,
    track: "int",
    kind: "grammar",
    displayNameEs: id,
    egpRef: null,
    egpLevel,
    l1Focus: false,
    classType: "writing",
    position,
  };
}

describe("confirmationStructureIds", () => {
  const structures = new Map(
    [
      structure("s_b1_late", "B1", 9),
      structure("s_a2", "A2", 5),
      structure("s_b1_early", "B1", 2),
      structure("s_b2", "B2", 1),
      structure("p_a2", "A2", 3),
    ].map((s) => [s.id, s]),
  );

  test("foundational first, max three, then promoted-from misses", () => {
    const decision = decideAfterPlacement([
      pass("pre_int", 13, 15, ["p_a2"]),
      pass("int", 8, 15, ["s_b2", "s_b1_late", "s_a2", "s_b1_early"]),
    ]);
    assert.equal(decision.type, "settle");
    if (decision.type !== "settle") return;
    assert.deepEqual(confirmationStructureIds(decision, structures), [
      "s_a2",
      "s_b1_early",
      "s_b1_late",
      "p_a2",
    ]);
  });
});

function item(id: string, structureId: string): EvalItem {
  return {
    id,
    structureId,
    role: "placement",
    format: "mc",
    prompt: id,
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
    correctOptionId: "a",
    ruleText: "rule",
    status: "draft",
  };
}

function answersFor(results: Record<string, boolean>): Map<string, AnswerRecord> {
  return new Map(
    Object.entries(results).map(([itemId, isCorrect]) => [
      itemId,
      { itemId, selectedOptionId: isCorrect ? "a" : "b", isCorrect },
    ]),
  );
}

describe("planNext", () => {
  const ids = ["i1", "i2", "i3", "i4", "i5"];
  const itemsById = new Map(ids.map((id) => [id, item(id, `s_${id}`)]));
  itemsById.set("c1", { ...item("c1", "s_i1"), role: "confirmation" });
  const structuresById = new Map(
    ids.map((id, index) => [`s_${id}`, { ...structure(`s_${id}`, "B1", index), track: "int" as Track }]),
  );
  const journey: JourneyPass[] = [{ kind: "placement", track: "int", itemIds: ids }];

  test("continues while the pass has unanswered items", () => {
    const next = planNext({
      journey,
      answers: answersFor({ i1: true }),
      itemsById,
      structuresById,
    });
    assert.deepEqual(next, { type: "continue" });
  });

  test("asks for confirmation of the settled misses", () => {
    const next = planNext({
      journey,
      answers: answersFor({ i1: false, i2: true, i3: true, i4: true, i5: false }),
      itemsById,
      structuresById,
    });
    assert.deepEqual(next, { type: "confirmation", track: "int", structureIds: ["s_i1", "s_i5"] });
  });

  test("finishes after the confirmation pass", () => {
    const next = planNext({
      journey: [...journey, { kind: "confirmation", track: "int", itemIds: ["c1"] }],
      answers: answersFor({ i1: false, i2: false, i3: true, i4: true, i5: true, c1: false }),
      itemsById,
      structuresById,
    });
    assert.deepEqual(next, { type: "finish", outcome: "settled", placedTrack: "int" });
  });

  test("a perfect top track finishes with no confirmation", () => {
    const next = planNext({
      journey: [{ kind: "placement", track: "upper", itemIds: ids }],
      answers: answersFor({ i1: true, i2: true, i3: true, i4: true, i5: true }),
      itemsById,
      structuresById,
    });
    assert.deepEqual(next, { type: "finish", outcome: "top", placedTrack: "upper" });
  });
});

describe("computeHoles", () => {
  test("two misses confirm, one stays a candidate", () => {
    const itemsById = new Map([
      ["p1", item("p1", "s1")],
      ["c1", item("c1", "s1")],
      ["p2", item("p2", "s2")],
      ["p3", item("p3", "s3")],
    ]);
    const holes = computeHoles(
      [
        { kind: "placement", track: "int", itemIds: ["p1", "p2", "p3"] },
        { kind: "confirmation", track: "int", itemIds: ["c1"] },
      ],
      answersFor({ p1: false, p2: false, p3: true, c1: false }),
      itemsById,
    );
    assert.deepEqual(Object.fromEntries(holes), { s1: "confirmed", s2: "candidate" });
  });
});
