import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  flattenLessonCopy,
  flattenVideoSummaryCopy,
  flattenWelcomeCopy,
  LESSON_COPY,
  VIDEO_SUMMARY_COPY,
} from "./lesson-copy";

const STEPS = [
  "story",
  "comprehension",
  "personal",
  "dictation",
  "choral",
  "pronunciation",
] as const;

const ASCII_TELLS =
  /Sabias|ingles|oido|Traduccion|pronunciacion|calificacion(?!es)|Ortografia|escuchate|Graba la oracion[^,]|Clases te esperan/;

describe("LESSON_COPY", () => {
  test("has an entry for every story step", () => {
    for (const id of STEPS) {
      const entry = LESSON_COPY[id];
      assert.ok(entry.title.length > 0);
      assert.ok(entry.instructions.length > 0);
      assert.ok(entry.why.length > 0);
    }
  });

  test("story keeps the important-rule note", () => {
    assert.equal(LESSON_COPY.story.note?.lead, "La regla más importante:");
    assert.match(LESSON_COPY.story.note?.body ?? "", /\*significado\*/);
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenLessonCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /Léela/);
    assert.match(blob, /inglés/);
    assert.match(blob, /oído/);
    assert.match(blob, /pronunciación/);
    assert.match(blob, /calificación/);
    assert.match(blob, /ortografía/);
    assert.match(blob, /escúchate/i);
    assert.match(blob, /oración/);
    assert.match(blob, /recuperación/);
    assert.match(blob, /retroalimentación/);
    assert.match(blob, /Grábate/);
  });
});

describe("VIDEO_SUMMARY_COPY", () => {
  const VIDEO_STEPS = ["video", "write", "translate"] as const;

  test("has an entry for every video-summary step", () => {
    for (const id of VIDEO_STEPS) {
      const entry = VIDEO_SUMMARY_COPY[id];
      assert.ok(entry.title.length > 0);
      assert.ok(entry.instructions.length > 0);
      assert.equal("why" in entry, false);
    }
  });

  test("titles match the Traducción step labels", () => {
    assert.equal(VIDEO_SUMMARY_COPY.video.title, "El Video");
    assert.equal(VIDEO_SUMMARY_COPY.write.title, "Tu Resumen");
    assert.equal(VIDEO_SUMMARY_COPY.translate.title, "Traducción");
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenVideoSummaryCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.doesNotMatch(blob, /toma notas de lo que ves/i);
    assert.match(blob, /inglés/);
    assert.match(blob, /traducción/);
    assert.match(blob, /atención/);
  });
});

describe("WELCOME_COPY", () => {
  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenWelcomeCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /Bienvenido a tu app de inglés/);
    assert.match(blob, /calificaciones/);
    assert.match(blob, /Tus clases te esperan/);
    assert.match(blob, /Entendido, vamos/);
  });
});
