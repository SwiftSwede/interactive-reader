import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CONVERSATION_COPY,
  DIALOGUE_READ_COPY,
  flattenConversationCopy,
  flattenDialogueReadCopy,
  flattenLessonCopy,
  flattenMovieTalkCopy,
  flattenMusicCopy,
  flattenPresentationCopy,
  flattenVideoSummaryCopy,
  flattenWelcomeCopy,
  LESSON_COPY,
  MOVIE_TALK_COPY,
  MUSIC_COPY,
  MUSIC_COPY_IDS,
  PRESENTATION_COPY,
  PRESENTATION_CYCLE_STEPS,
  readStepCopy,
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

describe("MOVIE_TALK_COPY", () => {
  test("warmup has a line and no why card", () => {
    assert.equal(
      MOVIE_TALK_COPY.warmup.line,
      "Lee la pregunta y prepárate para comentarla con la clase.",
    );
    assert.equal(MOVIE_TALK_COPY.warmup.whyShort, undefined);
    assert.equal(MOVIE_TALK_COPY.warmup.why, undefined);
  });

  test("scene video reuses the presentation Preguntas why", () => {
    assert.equal(
      MOVIE_TALK_COPY.video.why,
      PRESENTATION_COPY.preguntas.why,
    );
    assert.ok(MOVIE_TALK_COPY.synopsis.whyShort);
    assert.equal(
      MOVIE_TALK_COPY.synopsis.why,
      MOVIE_TALK_COPY.synopsis.whyShort,
    );
    assert.equal(
      MOVIE_TALK_COPY.dialogo.why,
      MOVIE_TALK_COPY.dialogo.whyShort,
    );
    assert.equal(
      MOVIE_TALK_COPY.dialogo.line,
      "Lee el diálogo en voz alta con tus compañeros. Toca un personaje para marcar sus líneas.",
    );
    assert.ok(
      MOVIE_TALK_COPY.dialogo.instructions.some((line) =>
        line.includes("Toca fuera para quitar la marca"),
      ),
    );
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenMovieTalkCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /atención/);
    assert.match(blob, /sinopsis/);
    assert.match(blob, /diálogo/);
    assert.match(blob, /inglés/);
  });
});

describe("CONVERSATION_COPY", () => {
  test("keeps approved line, whyShort, and sheet copy", () => {
    assert.equal(
      CONVERSATION_COPY.line,
      "Habla en inglés en parejas. Son las mismas preguntas en cada ronda, con una persona nueva.",
    );
    assert.equal(
      CONVERSATION_COPY.whyShort,
      "Repetir lo mismo con una persona nueva es el método: tu inglés sale más rápido y más seguro en cada ronda. Es la técnica 4/3/2 del lingüista Paul Nation, con evidencia académica detrás.",
    );
    assert.equal(CONVERSATION_COPY.instructions.length, 5);
    assert.match(CONVERSATION_COPY.why ?? "", /técnica 4\/3\/2/);
    assert.match(CONVERSATION_COPY.why ?? "", /segunda vuelta/);
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenConversationCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /inglés/);
    assert.match(blob, /Léelas/);
    assert.match(blob, /técnica/);
  });
});

describe("DIALOGUE_READ_COPY", () => {
  test("readStepCopy uses dialogue copy only for kind=dialogue", () => {
    assert.equal(readStepCopy("story"), LESSON_COPY.story);
    assert.equal(readStepCopy("dialogue"), DIALOGUE_READ_COPY);
    assert.equal(readStepCopy("song"), LESSON_COPY.story);
  });

  test("keeps approved line, whyShort, and sheet copy", () => {
    assert.equal(
      DIALOGUE_READ_COPY.line,
      "Lee tu parte en voz alta con tu grupo. Es lectura fría: nadie la ha preparado, y eso es el punto.",
    );
    assert.equal(
      DIALOGUE_READ_COPY.whyShort,
      "Ningún material tiene la densidad de vocabulario de un texto, y un diálogo muestra el vocabulario de la conversación real: lo que la gente de verdad dice. Además, leerlo en voz alta ensaya tu boca para la próxima conversación.",
    );
    assert.equal(DIALOGUE_READ_COPY.instructions.length, 4);
    assert.match(DIALOGUE_READ_COPY.why, /No es teatro/);
    assert.match(DIALOGUE_READ_COPY.why, /calificación/);
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenDialogueReadCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /fría/);
    assert.match(blob, /diálogo/);
    assert.match(blob, /inglés/);
    assert.match(blob, /pronunciación/);
  });
});

describe("MUSIC_COPY", () => {
  test("has an entry for every music class step", () => {
    for (const id of MUSIC_COPY_IDS) {
      const entry = MUSIC_COPY[id];
      assert.ok(entry.title.length > 0);
      assert.ok(entry.line.length > 0);
      assert.ok(entry.whyShort);
      assert.ok(entry.instructions.length > 0);
    }
  });

  test("keeps approved lines and karaoke sheet copy", () => {
    assert.equal(
      MUSIC_COPY.blind_listen.line,
      "Mira el video y escucha sin letra. ¿Cuánto entiendes?",
    );
    assert.equal(MUSIC_COPY.blanks.instructions.length, 3);
    assert.equal(MUSIC_COPY.truquitos_karaoke.instructions.length, 2);
    assert.match(
      MUSIC_COPY.truquitos_karaoke.instructions[1] ?? "",
      /micrófono está apagado/,
    );
    assert.doesNotMatch(
      flattenMusicCopy().join("\n"),
      /No importa si no entiendes todo/,
    );
  });

  test("has no em dashes and keeps Spanish accents", () => {
    const blob = flattenMusicCopy().join("\n");
    assert.equal(blob.includes("\u2014"), false);
    assert.equal(blob.includes("—"), false);
    assert.doesNotMatch(blob, ASCII_TELLS);
    assert.match(blob, /canción/);
    assert.match(blob, /inglés/);
    assert.match(blob, /oído/);
    assert.match(blob, /fonética/);
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
