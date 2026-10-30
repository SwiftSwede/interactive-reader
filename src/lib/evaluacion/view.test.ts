import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { currentItemId, questionView, transitionInto } from "./view";
import { NO_SE_OPTION_ID, type AnswerRecord, type EvalItem, type JourneyPass } from "./types";

function item(id: string, status: EvalItem["status"] = "draft"): EvalItem {
  return {
    id,
    structureId: `s_${id}`,
    role: "placement",
    format: "translation",
    prompt: `prompt ${id}`,
    options: ["a", "b", "c", "d"].map((letter) => ({ id: `${id}${letter}`, text: letter })),
    correctOptionId: `${id}a`,
    ruleText: "secret rule",
    status,
  };
}

const items = new Map(["i1", "i2", "c1"].map((id) => [id, item(id)]));

function answered(...ids: string[]): Map<string, AnswerRecord> {
  return new Map(ids.map((id) => [id, { itemId: id, selectedOptionId: "x", isCorrect: false }]));
}

describe("transitionInto", () => {
  test("first pass has no transition", () => {
    assert.equal(transitionInto([{ kind: "placement", track: "int", itemIds: [] }]), null);
  });

  test("climbing is promote, dropping is demote, confirmation is its own", () => {
    const base: JourneyPass = { kind: "placement", track: "pre_int", itemIds: [] };
    assert.equal(transitionInto([base, { ...base, track: "int" }]), "promote");
    assert.equal(transitionInto([base, { ...base, track: "beginner" }]), "demote");
    assert.equal(transitionInto([base, { ...base, kind: "confirmation" }]), "confirmation");
  });
});

describe("questionView", () => {
  const journey: JourneyPass[] = [{ kind: "placement", track: "int", itemIds: ["i1", "i2"] }];

  test("serves the first unanswered item without the key or the rule", () => {
    const view = questionView({
      journey,
      answers: answered("i1"),
      itemsById: items,
      seed: 7,
      showDraftBadge: false,
    });
    assert.ok(view);
    assert.equal(view.question.itemId, "i2");
    assert.equal(view.progress.answered, 1);
    assert.equal(view.progress.total, 2);
    assert.equal(view.transition, null);
    assert.equal(view.question.isDraft, false);
    assert.equal(view.question.options.at(-1)?.id, NO_SE_OPTION_ID);
    const json = JSON.stringify(view);
    assert.ok(!json.includes("secret rule"));
    assert.ok(!json.includes("correctOptionId"));
  });

  test("shows the draft badge only when asked", () => {
    const view = questionView({
      journey,
      answers: new Map(),
      itemsById: items,
      seed: 7,
      showDraftBadge: true,
    });
    assert.equal(view?.question.isDraft, true);
  });

  test("a finished pass has no current item", () => {
    assert.equal(currentItemId(journey, answered("i1", "i2")), null);
    assert.equal(
      questionView({
        journey,
        answers: answered("i1", "i2"),
        itemsById: items,
        seed: 7,
        showDraftBadge: false,
      }),
      null,
    );
  });

  test("the first item of a later pass carries the transition", () => {
    const later: JourneyPass[] = [...journey, { kind: "confirmation", track: "int", itemIds: ["c1"] }];
    const view = questionView({
      journey: later,
      answers: answered("i1", "i2"),
      itemsById: items,
      seed: 7,
      showDraftBadge: false,
    });
    assert.equal(view?.transition, "confirmation");
    assert.equal(view?.progress.passNumber, 2);
  });
});
