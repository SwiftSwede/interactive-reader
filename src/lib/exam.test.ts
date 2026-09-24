import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GroupExamPrompt } from "@/types";
import {
  allExamItemsChecked,
  applyExamWorkTimeDelta,
  assignedOrderPosition,
  defaultExamTaskCopy,
  defaultTask2Type,
  examAnswerMatches,
  examItemKeys,
  examRemainingMs,
  examReviewDeadlineMs,
  examScore,
  examTimerFrozen,
  flattenFillSlots,
  itemIsRevealed,
  nextGroupLabel,
  parseExamClassAnswers,
  parseExamForm,
  parseFillInTranslation,
  parseParagraphRestructuring,
  parseSentenceCorrection,
  parseTranslationSentences,
  parseVocabList,
  puntajeReachable,
  usedExamVocabIds,
} from "./exam";

const basePrompt: GroupExamPrompt = {
  id: "prompt",
  title: "Examen",
  level: "pre-intermediate",
  theme: null,
  vocabularyList: [
    { id: 1, english: "boy", spanish: "niño" },
    { id: 2, english: "went", spanish: "fue" },
    { id: 3, english: "home", spanish: "casa" },
    { id: 4, english: "look after", spanish: "cuidar de" },
  ],
  fillInTranslation: parseFillInTranslation(
    "The {niño|boy} {fue|went|gone} home."
  ),
  task2Type: "sentence_correction",
  paragraphRestructuring: null,
  sentenceCorrection: parseSentenceCorrection(
    "ok | She is here.\nfix | She are here. | She is here."
  ),
  translationSentences: parseTranslationSentences(
    "Hola. | Hello.\nAdios. | Goodbye."
  ),
  timeLimitMinutes: 45,
  task1Title: null,
  task1Instructions: null,
  task2Title: null,
  task2Instructions: null,
  task3Title: null,
  task3Instructions: null,
  createdBy: "teacher",
  createdAt: new Date().toISOString(),
};

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

  it("parses paragraph restructuring as numeric positions", () => {
    const items = parseParagraphRestructuring("3 | Last\n1 | First");
    assert.equal(items[0].correctPosition, "3");
    assert.equal(items[1].sentence, "First");
    const legacy = parseParagraphRestructuring("C | Last");
    assert.equal(legacy[0].correctPosition, "3");
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

  it("uses Correct vs Order copy from task2 type", () => {
    assert.equal(defaultExamTaskCopy("sentence_correction").task2Title, "Correct");
    assert.equal(defaultExamTaskCopy("paragraph_restructuring").task2Title, "Order");
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
      timeLimitMinutes: 45,
    });
    assert.ok(parsed.error);
  });
});

describe("exam matching and score", () => {
  it("matches any accepted variant after normalize", () => {
    assert.equal(
      examAnswerMatches("I'd travel", ["I'd travel", "I would travel"]),
      true
    );
    assert.equal(
      examAnswerMatches("I would travel", ["I'd travel", "I would travel"]),
      true
    );
    assert.equal(examAnswerMatches("I will travel", ["I'd travel"]), false);
    assert.equal(examAnswerMatches("  LOOK   AFTER ", ["look after"]), true);
    assert.equal(examAnswerMatches("", ["look after"]), false);
  });

  it("scores fraction and whole percent", () => {
    const keys = examItemKeys(basePrompt);
    assert.equal(keys.length, 6);
    const result = examScore({
      prompt: basePrompt,
      task1: [
        { slotIndex: 0, answer: "boy" },
        { slotIndex: 1, answer: "gone" },
      ],
      task2: [
        { sentenceNumber: 1, isCorrect: true, correctedText: null },
        {
          sentenceNumber: 2,
          isCorrect: false,
          correctedText: "She is here.",
        },
      ],
      task3: [
        { sentenceNumber: 1, englishTranslation: "Hello." },
        { sentenceNumber: 2, englishTranslation: "wrong" },
      ],
      classAnswers: {},
      useCatalogFallback: true,
    });
    assert.equal(result.total, 6);
    assert.equal(result.correct, 5);
    assert.equal(result.percent, 83);
  });

  it("does not count blanks as correct", () => {
    const result = examScore({
      prompt: basePrompt,
      task1: [],
      task2: [],
      task3: [],
      classAnswers: {},
      useCatalogFallback: true,
    });
    assert.equal(result.correct, 0);
    assert.equal(result.percent, 0);
  });
});

describe("exam timer", () => {
  it("counts down to session_end minus N after Iniciar", () => {
    const timerStartedAt = "2026-09-23T19:15:00.000Z";
    const sessionEndTime = "2026-09-23T20:30:00.000Z";
    const now = Date.parse("2026-09-23T19:20:00.000Z");
    const remaining = examRemainingMs(
      {
        mode: "until_end_offset",
        minutes: 20,
        timerStartedAt,
        sessionEndTime,
      },
      now
    );
    assert.equal(remaining, 50 * 60 * 1000);
  });

  it("freezes at 0 when Iniciar is after the review instant", () => {
    const remaining = examRemainingMs(
      {
        mode: "until_end_offset",
        minutes: 20,
        timerStartedAt: "2026-09-23T20:15:00.000Z",
        sessionEndTime: "2026-09-23T20:30:00.000Z",
      },
      Date.parse("2026-09-23T20:16:00.000Z")
    );
    assert.equal(remaining, 0);
    assert.equal(
      examTimerFrozen(
        {
          mode: "until_end_offset",
          minutes: 20,
          timerStartedAt: "2026-09-23T20:15:00.000Z",
          sessionEndTime: "2026-09-23T20:30:00.000Z",
        },
        Date.parse("2026-09-23T20:16:00.000Z")
      ),
      true
    );
  });

  it("does not run until Iniciar", () => {
    assert.equal(
      examReviewDeadlineMs({
        mode: "until_end_offset",
        minutes: 20,
        timerStartedAt: null,
        sessionEndTime: "2026-09-23T20:30:00.000Z",
      }),
      null
    );
    assert.equal(
      examTimerFrozen({
        mode: "until_end_offset",
        minutes: 20,
        timerStartedAt: null,
        sessionEndTime: "2026-09-23T20:30:00.000Z",
      }),
      true
    );
  });

  it("from_start counts N minutes after Iniciar", () => {
    const remaining = examRemainingMs(
      {
        mode: "from_start",
        minutes: 40,
        timerStartedAt: "2026-09-23T19:00:00.000Z",
        sessionEndTime: "2026-09-23T20:30:00.000Z",
      },
      Date.parse("2026-09-23T19:10:00.000Z")
    );
    assert.equal(remaining, 30 * 60 * 1000);
  });

  it("add work time raises N on from_start and lowers N on until_end_offset", () => {
    assert.equal(applyExamWorkTimeDelta("from_start", 40, 5), 45);
    assert.equal(applyExamWorkTimeDelta("until_end_offset", 20, 5), 15);
    assert.equal(applyExamWorkTimeDelta("from_start", 40, -5), 35);
    assert.equal(applyExamWorkTimeDelta("until_end_offset", 20, -5), 25);
    assert.equal(applyExamWorkTimeDelta("from_start", 90, 5), 90);
    assert.equal(applyExamWorkTimeDelta("until_end_offset", 1, 5), 1);
  });
});

describe("exam vocab used", () => {
  it("marks exact words and regular endings", () => {
    const used = usedExamVocabIds(basePrompt.vocabularyList, [
      "boys",
      "looked after",
      "walked",
    ]);
    assert.equal(used.has(1), true);
    assert.equal(used.has(4), true);
    assert.equal(used.has(2), false);
    assert.equal(used.has(3), false);
  });

  it("does not treat irregulars or similar short words as a match", () => {
    assert.equal(usedExamVocabIds([{ id: 1, english: "go", spanish: "ir" }], ["went"]).has(1), false);
    assert.equal(usedExamVocabIds([{ id: 1, english: "on", spanish: "en" }], ["one"]).has(1), false);
  });
});

describe("exam reveal and puntaje", () => {
  it("reveals live items only when checked", () => {
    const classAnswers = parseExamClassAnswers({
      "t1-0": { accepted: ["boy"], revealed: true },
      "t1-1": { accepted: ["went"], revealed: false },
    });
    assert.equal(
      itemIsRevealed({
        key: "t1-0",
        live: true,
        classEnded: false,
        attended: true,
        classAnswers,
        taskSubmittedAt: { 1: null, 2: null, 3: null },
      }),
      true
    );
    assert.equal(
      itemIsRevealed({
        key: "t1-1",
        live: true,
        classEnded: false,
        attended: true,
        classAnswers,
        taskSubmittedAt: { 1: null, 2: null, 3: null },
      }),
      false
    );
  });

  it("shows all keys after class for attendees", () => {
    assert.equal(
      itemIsRevealed({
        key: "t3-1",
        live: false,
        classEnded: true,
        attended: true,
        classAnswers: {},
        taskSubmittedAt: { 1: null, 2: null, 3: null },
      }),
      true
    );
  });

  it("gates absentee keys per Entregar", () => {
    assert.equal(
      itemIsRevealed({
        key: "t1-0",
        live: false,
        classEnded: true,
        attended: false,
        classAnswers: {},
        taskSubmittedAt: { 1: "2026-09-23T21:00:00.000Z", 2: null, 3: null },
      }),
      true
    );
    assert.equal(
      itemIsRevealed({
        key: "t2-1",
        live: false,
        classEnded: true,
        attended: false,
        classAnswers: {},
        taskSubmittedAt: { 1: "2026-09-23T21:00:00.000Z", 2: null, 3: null },
      }),
      false
    );
  });

  it("gates Puntaje until publish", () => {
    assert.equal(puntajeReachable(null), false);
    assert.equal(puntajeReachable("2026-09-23T21:00:00.000Z"), true);
    assert.equal(allExamItemsChecked(basePrompt, {}), false);
    assert.equal(
      allExamItemsChecked(basePrompt, {
        "t1-0": { accepted: ["boy"], revealed: true },
        "t1-1": { accepted: ["went"], revealed: true },
        "t2-1": { accepted: ["She is here."], revealed: true },
        "t2-2": { accepted: ["She is here."], revealed: true },
        "t3-1": { accepted: ["Hello"], revealed: true },
        "t3-2": { accepted: ["Goodbye"], revealed: true },
      }),
      true
    );
  });

  it("reads numeric order answers", () => {
    assert.equal(
      assignedOrderPosition(
        [{ sentenceNumber: 1, assignedPosition: "3" }],
        1
      ),
      "3"
    );
  });
});
