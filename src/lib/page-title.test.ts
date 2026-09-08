import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { documentTitle } from "./page-title";

describe("documentTitle", () => {
  test("uses the lesson name plus Profe Kyle", () => {
    assert.equal(documentTitle("Paris"), "Paris - Profe Kyle");
    assert.equal(documentTitle("Summer of '69"), "Summer of '69 - Profe Kyle");
  });

  test("falls back to Profe Kyle when the name is missing", () => {
    assert.equal(documentTitle(null), "Profe Kyle");
    assert.equal(documentTitle("   "), "Profe Kyle");
    assert.equal(documentTitle("Profe Kyle"), "Profe Kyle");
  });
});
