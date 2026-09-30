import assert from "node:assert/strict";
import { test } from "node:test";
import { isRepaso, mcqAllowed, parseInlineMarks, toSessionItem } from "./drill-session";
import type { DrillItem, DrillItemState } from "./drills";

function item(partial: Partial<DrillItem> & Pick<DrillItem, "id" | "format">): DrillItem {
  return {
    tagType: "error",
    tagId: "make",
    level: "pre_int",
    content: {},
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function state(partial: Partial<DrillItemState> = {}): DrillItemState {
  return {
    id: "state-1",
    userId: "student-1",
    itemId: "c",
    rounds: 1,
    cleanRecalls: 1,
    mcqUsed: true,
    lastPracticedAt: "2026-01-01T00:00:00.000Z",
    nextPracticeAt: "2026-01-03T00:00:00.000Z",
    status: "learning",
    graduatedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const cloze = item({
  id: "c",
  format: "cloze",
  content: {
    text: "I need to ___ a decision.",
    answer: "make",
    mcq: ["make", "do", "take"],
    note: "internal",
    sourceUrl: "https://example.com",
  },
});

test("MCQ is offered only before the first round", () => {
  assert.equal(mcqAllowed(cloze, undefined), true);
  assert.equal(mcqAllowed(cloze, state({ mcqUsed: false })), true);
  assert.equal(mcqAllowed(cloze, state({ mcqUsed: true })), false);
  assert.equal(mcqAllowed(item({ id: "x", format: "cloze", content: {} }), undefined), false);
});

test("repaso follows an existing state row", () => {
  assert.equal(isRepaso(undefined), false);
  assert.equal(isRepaso(state()), true);
});

test("teach hooks turn *italic* and **bold** into spans", () => {
  assert.deepEqual(
    parseInlineMarks("usa **MAKE** cuando *hacer* lo hace todo."),
    [
      { kind: "text", value: "usa " },
      { kind: "strong", value: "MAKE" },
      { kind: "text", value: " cuando " },
      { kind: "em", value: "hacer" },
      { kind: "text", value: " lo hace todo." },
    ],
  );
});

test("the client item carries no answer, note, or source", () => {
  const fresh = toSessionItem(cloze, undefined);
  assert.deepEqual(fresh, {
    id: "c",
    format: "cloze",
    repaso: false,
    text: "I need to ___ a decision.",
    options: ["make", "do", "take"],
  });

  const retest = toSessionItem(cloze, state());
  assert.deepEqual(retest, {
    id: "c",
    format: "cloze",
    repaso: true,
    text: "I need to ___ a decision.",
    options: null,
  });

  const teach = toSessionItem(
    item({
      id: "h",
      format: "teach",
      content: {
        lead: "En español, *hacer* lo hace todo. Usa **MAKE**.",
        examples: [
          "I'll make some pancakes for breakfast. He made a chair out of wood.",
          "Do your homework. What do you like to do in your free time?",
        ],
        closing: "Sí, hay excepciones.",
        wordBank: { make: [], do: [] },
        sourceUrl: "x",
      },
    }),
    undefined,
  );
  assert.deepEqual(teach, {
    id: "h",
    format: "teach",
    repaso: false,
    lead: "En español, *hacer* lo hace todo. Usa **MAKE**.",
    examples: [
      "I'll make some pancakes for breakfast. He made a chair out of wood.",
      "Do your homework. What do you like to do in your free time?",
    ],
    closing: "Sí, hay excepciones.",
  });

  const leftover = toSessionItem(
    item({
      id: "fresh",
      format: "cloze",
      content: { text: "I ___ pancakes.", answer: "make", mcq: ["make", "do"] },
    }),
    undefined,
  );
  assert.equal(leftover?.format, "cloze");
  if (leftover?.format === "cloze") {
    assert.equal(leftover.repaso, false);
    assert.deepEqual(leftover.options, ["make", "do"]);
  }
});
