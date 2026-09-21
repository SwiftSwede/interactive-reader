import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assignedSessionMessage,
  catalogCreateDefaults,
  formatSimpleDeleteSummary,
  formatStoryDeleteSummary,
  formatStudentUseWarning,
  isCatalogAdminEmail,
  isCopyableConversation,
  isCopyableExam,
  isCopyableWriting,
  joinSpanishList,
} from "./catalog-crud";

describe("assignedSessionMessage", () => {
  test("uses the Spanish block copy with the count", () => {
    assert.equal(
      assignedSessionMessage(2),
      "Está asignado a 2 clase(s). Quítalo de esas clases primero."
    );
  });
});

describe("formatStoryDeleteSummary", () => {
  test("always lists the text and omits zero counts", () => {
    assert.equal(
      formatStoryDeleteSummary({
        words: 0,
        comprehension: 0,
        personal: 0,
        drills: 0,
        flags: 0,
        tags: 0,
        scenes: 0,
        paragraphs: 0,
        expressions: 0,
      }),
      "Se borrarán: el texto."
    );
  });

  test("lists only non-zero children", () => {
    const summary = formatStoryDeleteSummary({
      words: 12,
      comprehension: 4,
      personal: 0,
      drills: 1,
      flags: 2,
      tags: 3,
      scenes: 0,
      paragraphs: 0,
      expressions: 0,
    });
    assert.match(summary, /12 palabras anotadas/);
    assert.match(summary, /4 preguntas de comprensión/);
    assert.match(summary, /el dictado/);
    assert.match(summary, /las banderas de palabras/);
    assert.match(summary, /las etiquetas/);
    assert.doesNotMatch(summary, /pregunta personal/);
    assert.doesNotMatch(summary, /escena/);
  });
});

describe("formatSimpleDeleteSummary", () => {
  test("names the title", () => {
    assert.equal(
      formatSimpleDeleteSummary("Gabo"),
      'Se borrará "Gabo". Esta acción no se puede deshacer.'
    );
  });
});

describe("formatStudentUseWarning", () => {
  test("returns null when nobody practiced", () => {
    assert.equal(formatStudentUseWarning(0), null);
  });

  test("warns with the count", () => {
    assert.match(formatStudentUseWarning(1) ?? "", /1 estudiante/);
    assert.match(formatStudentUseWarning(4) ?? "", /4 estudiantes/);
  });
});

describe("joinSpanishList", () => {
  test("uses y before the last item", () => {
    assert.equal(joinSpanishList(["a", "b"]), "a y b");
    assert.equal(joinSpanishList(["a", "b", "c"]), "a, b, y c");
  });
});

describe("copyable shells", () => {
  test("writing needs prompt text", () => {
    assert.equal(isCopyableWriting("  "), false);
    assert.equal(isCopyableWriting("If I were rich"), true);
  });

  test("exam needs at least one task field", () => {
    assert.equal(
      isCopyableExam({ vocab: 0, fillSlots: 0, task2: 0, task3: 0 }),
      false
    );
    assert.equal(
      isCopyableExam({ vocab: 4, fillSlots: 0, task2: 0, task3: 0 }),
      true
    );
  });

  test("conversation needs 3 questions", () => {
    assert.equal(isCopyableConversation(2), false);
    assert.equal(isCopyableConversation(3), true);
  });
});

describe("catalogCreateDefaults", () => {
  test("writing minutes follow level", () => {
    assert.equal(
      catalogCreateDefaults("writing", "pre-intermediate").writingTimeMinutes,
      10
    );
    assert.equal(
      catalogCreateDefaults("writing", "intermediate").writingTimeMinutes,
      20
    );
  });

  test("exam task2 and time follow live CHECKs", () => {
    const pre = catalogCreateDefaults("exam", "pre-intermediate");
    assert.equal(pre.task2Type, "sentence_correction");
    assert.equal(pre.timeLimitMinutes, 35);
    const mid = catalogCreateDefaults("exam", "intermediate");
    assert.equal(mid.task2Type, "paragraph_restructuring");
    assert.equal(mid.presentationLevel, "intermediate");
  });
});

describe("isCatalogAdminEmail", () => {
  const env = { CATALOG_ADMIN_EMAILS: "profe@profekyle.com, other@x.com" };

  test("matches a listed email", () => {
    assert.equal(isCatalogAdminEmail("Profe@profekyle.com", env), true);
  });

  test("rejects everyone else", () => {
    assert.equal(isCatalogAdminEmail("helper@school.com", env), false);
    assert.equal(isCatalogAdminEmail(null, env), false);
  });
});
