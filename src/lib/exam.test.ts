import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultTask2Type,
  flattenFillSlots,
  nextGroupLabel,
  parseExamForm,
  parseFillInTranslation,
  parseParagraphRestructuring,
  parseSentenceCorrection,
  parseTranslationSentences,
  parseVocabList,
} from "./exam";

describe("exam parsers", () => {
  it("parses vocab lines", () => {
    const items = parseVocabList("go | ir\n\nwent | fue");
    assert.equal(items.length, 2);
    assert.equal(items[0].english, "go");
    assert.equal(items[1].spanish, "fue");
  });

  it("parses fill-in slots and flattens indexes", () => {
    const sentences = parseFillInTranslation(
      "The {niño|boy} {fue|went|gone} home."
    );
    assert.equal(sentences[0].sentence, "The (niño) (fue) home.");
    const flat = flattenFillSlots(sentences);
    assert.equal(flat.length, 2);
    assert.equal(flat[0].slot.expectedEnglish, "boy");
    assert.deepEqual(flat[1].slot.acceptableVariations, ["gone"]);
  });

  it("parses paragraph restructuring letters", () => {
    const items = parseParagraphRestructuring("C | Last\nA | First");
    assert.equal(items[0].correctPosition, "C");
    assert.equal(items[1].sentence, "First");
  });

  it("parses sentence correction flags", () => {
    const items = parseSentenceCorrection(
      "ok | She is here.\nfix | She are here. | She is here."
    );
    assert.equal(items[0].isCorrect, true);
    assert.equal(items[1].correctedVersion, "She is here.");
  });

  it("parses translations with variations", () => {
    const items = parseTranslationSentences(
      "Si yo fuera rico, viajaria. | If I were rich, I would travel. | If I was rich, I'd travel."
    );
    assert.equal(items[0].acceptedEnglish[0].startsWith("If I were"), true);
    assert.equal(items[0].acceptableVariations.length, 1);
  });

  it("picks the next group label", () => {
    assert.equal(nextGroupLabel([]), "Grupo A");
    assert.equal(nextGroupLabel(["Grupo A", "Grupo B"]), "Grupo C");
  });

  it("defaults task 2 from level", () => {
    assert.equal(defaultTask2Type("intermediate"), "paragraph_restructuring");
    assert.equal(defaultTask2Type("pre-intermediate"), "sentence_correction");
  });

  it("rejects a thin exam form", () => {
    const parsed = parseExamForm({
      title: "Noviembre",
      theme: "",
      vocabRaw: "a | b",
      task1Raw: "hello",
      task2Type: "sentence_correction",
      task2Raw: "",
      task3Raw: "",
      timeLimitMinutes: 35,
    });
    assert.ok(parsed.error);
  });
});
