import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addPresentationVocabItem,
  adjacentPresentationStep,
  classAnswerForQuestion,
  defaultPresentationStep,
  encodePresentationStep,
  mapPresentationPromptRow,
  parsePresentationStep,
  presentationStepList,
  remotePresentationStep,
  removePresentationVocabItem,
  segmentCycleIndex,
  stripPresentationText,
  upsertClassAnswer,
} from "./presentation";
import { youtubeStartSeconds } from "./youtube-sync";

describe("presentation steps", () => {
  const prompt = mapPresentationPromptRow({
    id: "p1",
    title: "Paris",
    level: "intermediate",
    theme: "Paris, France",
    warmup_question: "Have you ever been to Paris?",
    created_at: "2026-09-05T00:00:00Z",
    segments: [
      {
        id: 1,
        youtube_url: "https://www.youtube.com/watch?v=WoOEWvhj_0M",
        title: "Part 1",
        vocabulary: [
          { english: "Neat", spanish: "ordenado" },
          { english: "Cramped", spanish: "estrecho" },
          { english: "Barred from", spanish: "prohibido de" },
        ],
        comprehension_questions: [
          { id: 1, question: "How tall?", answer: "37 meters" },
        ],
      },
      {
        id: 2,
        youtube_url: "https://www.youtube.com/watch?v=TfI9nEKdGfg&t=417s",
        title: null,
        vocabulary: [
          {
            english: "Quintessential",
            spanish: "por excelencia",
            example_sentence: "The arepa is quintessential Colombian food.",
          },
        ],
        comprehension_questions: [
          { id: 1, question: "Breakfast?", answer: "Local bakery" },
        ],
      },
    ],
  });

  it("parses segments and vocab", () => {
    assert.equal(prompt.segments.length, 2);
    assert.equal(
      prompt.segments[1].vocabulary[0].exampleSentence?.includes("arepa"),
      true
    );
  });

  it("sorts vocabulary A to Z by English", () => {
    assert.deepEqual(
      prompt.segments[0].vocabulary.map((item) => item.english),
      ["Barred from", "Cramped", "Neat"]
    );
  });

  it("inserts a new vocab item in A to Z order", () => {
    const next = addPresentationVocabItem(prompt.segments[0].vocabulary, {
      english: "Appoint",
      spanish: "nombrar",
      exampleSentence: null,
    });
    assert.deepEqual(
      next?.map((item) => item.english),
      ["Appoint", "Barred from", "Cramped", "Neat"]
    );
  });

  it("refuses a duplicate English word", () => {
    assert.equal(
      addPresentationVocabItem(prompt.segments[0].vocabulary, {
        english: "neat",
        spanish: "ordenado",
        exampleSentence: null,
      }),
      null
    );
  });

  it("removes a vocab item by English", () => {
    const next = removePresentationVocabItem(
      prompt.segments[0].vocabulary,
      "Cramped"
    );
    assert.deepEqual(
      next.map((item) => item.english),
      ["Barred from", "Neat"]
    );
  });

  it("starts at warmup when present", () => {
    const first = defaultPresentationStep(prompt);
    assert.equal(encodePresentationStep(first), "warmup");
  });

  it("walks warmup then each segment cycle then done", () => {
    const steps = presentationStepList(prompt);
    assert.equal(encodePresentationStep(steps[0]), "warmup");
    assert.equal(encodePresentationStep(steps[1]), "1:vocab");
    assert.equal(encodePresentationStep(steps[5]), "2:vocab");
    assert.equal(encodePresentationStep(steps[steps.length - 1]), "done");
    const next = adjacentPresentationStep({ kind: "warmup" }, prompt, 1);
    assert.equal(next && encodePresentationStep(next), "1:vocab");
  });

  it("falls back to a valid step", () => {
    const step = parsePresentationStep("9:video", prompt);
    assert.equal(encodePresentationStep(step), "warmup");
  });

  it("ignores incomplete remote payloads so video ticks cannot reset the step", () => {
    assert.equal(remotePresentationStep(undefined, prompt), null);
    assert.equal(remotePresentationStep(null, prompt), null);
    assert.equal(remotePresentationStep("", prompt), null);
    assert.equal(
      encodePresentationStep(remotePresentationStep("2:vocab", prompt)!),
      "2:vocab"
    );
  });

  it("maps cycle indexes", () => {
    assert.equal(segmentCycleIndex({ kind: "video", segmentId: 1 }), 2);
  });

  it("strips html from input", () => {
    assert.equal(stripPresentationText("<b>37</b> meters"), "37 meters");
  });

  it("upserts a class answer per question without dropping the others", () => {
    const first = upsertClassAnswer([], {
      segmentId: 1,
      questionId: 1,
      text: "Driving",
      ready: false,
    });
    const both = upsertClassAnswer(first, {
      segmentId: 1,
      questionId: 2,
      text: "Magical realism",
      ready: true,
    });
    const updated = upsertClassAnswer(both, {
      segmentId: 1,
      questionId: 1,
      text: "Driving to Acapulco",
      ready: true,
    });
    assert.equal(classAnswerForQuestion(updated, 1, 1)?.text, "Driving to Acapulco");
    assert.equal(classAnswerForQuestion(updated, 1, 1)?.ready, true);
    assert.equal(classAnswerForQuestion(updated, 1, 2)?.ready, true);
    assert.equal(classAnswerForQuestion(updated, 2, 1), null);
  });
});

describe("youtubeStartSeconds", () => {
  it("reads t= seconds", () => {
    assert.equal(
      youtubeStartSeconds("https://www.youtube.com/watch?v=abc&t=417s"),
      417
    );
  });

  it("reads t= minutes", () => {
    assert.equal(
      youtubeStartSeconds("https://www.youtube.com/watch?v=abc&t=6m57s"),
      417
    );
  });

  it("starts at zero when the URL has no t=", () => {
    assert.equal(
      youtubeStartSeconds("https://www.youtube.com/watch?v=n2S2Neswudw"),
      0
    );
  });
});
