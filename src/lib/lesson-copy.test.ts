import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  flattenLessonCopy,
  flattenPresentationCopy,
  flattenVideoSummaryCopy,
  flattenWelcomeCopy,
  LESSON_COPY,
  PRESENTATION_COPY,
  PRESENTATION_CYCLE_STEPS,
  stepCopyForMode,
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
      assert.ok(entry.line.length > 0);
      assert.ok(entry.whyShort.length > 0);
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
      assert.ok((entry.why ?? "").length > 0);
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
    assert.match(blob, /oración por oración/);
    assert.match(blob, /colaborativa/);
  });

  test("Traducción uses live override only in live mode", () => {
    const copy = VIDEO_SUMMARY_COPY.translate;
    assert.match(
      stepCopyForMode(copy, true).instructions.join("\n"),
      /colaborativa/,
    );
    assert.match(
      stepCopyForMode(copy, false).instructions.join("\n"),
      /oración por oración/,
    );
    assert.equal(
      stepCopyForMode(copy, true).line,
      "Di tu versión en voz alta; el Profe escribe la real.",
    );
    assert.equal(
      stepCopyForMode(copy, false).line,
      "Escribe tu traducción y compárala con la del Profe.",
    );
  });
});

describe("PRESENTATION_COPY", () => {
  test("has an entry for every cycle step", () => {
    for (const id of PRESENTATION_CYCLE_STEPS) {
      const entry = PRESENTATION_COPY[id];
      assert.ok(entry.title.length > 0);
      assert.ok(entry.instructions.length > 0);
    }
    assert.ok(PRESENTATION_COPY.vocabulario.why);
    assert.ok(PRESENTATION_COPY.preguntas.why);
    assert.ok(PRESENTATION_COPY.respuestas.why);
    assert.equal(PRESENTATION_COPY.video.why, undefined);
    assert.equal(PRESENTATION_COPY.video.whyShort, undefined);
    assert.ok(PRESENTATION_COPY.video.line.length > 0);
  });

  test("titles match the Presentación cycle labels", () => {
    assert.equal(PRESENTATION_COPY.vocabulario.title, "Vocabulario");
    assert.equal(PRESENTATION_COPY.preguntas.title, "Preguntas");
    assert.equal(PRESENTATION_COPY.video.title, "Video");
    assert.equal(PRESENTATION_COPY.respuestas.title, "Respuestas");
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenPresentationCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /rezar/);
    assert.match(blob, /inglés/);
    assert.match(blob, /Léelas/);
    assert.match(blob, /vocabulario/);
  });

  test("Respuestas uses live override only in live mode", () => {
    const copy = PRESENTATION_COPY.respuestas;
    assert.match(
      stepCopyForMode(copy, true).instructions.join("\n"),
      /en vivo/,
    );
    assert.match(
      stepCopyForMode(copy, false).instructions.join("\n"),
      /propias palabras/,
    );
    assert.equal(
      stepCopyForMode(copy, true).line,
      "El Profe pregunta; da tu versión en voz alta.",
    );
    assert.equal(
      stepCopyForMode(copy, false).line,
      "Escribe tu respuesta y compárala.",
    );
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
