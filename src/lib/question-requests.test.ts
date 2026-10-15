import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isQuestionSurface,
  isValidQuestionBody,
  newestFirst,
  oldestFirst,
  QUESTION_SURFACE_LABELS,
  trimQuestionBody,
  unaddressedCount,
} from "./question-requests";

test("trimQuestionBody strips ends and keeps inner spaces", () => {
  assert.equal(trimQuestionBody("  Cómo se dice  "), "Cómo se dice");
});

test("isValidQuestionBody rejects empty and over 500", () => {
  assert.equal(isValidQuestionBody(""), false);
  assert.equal(isValidQuestionBody("a"), true);
  assert.equal(isValidQuestionBody("x".repeat(500)), true);
  assert.equal(isValidQuestionBody("x".repeat(501)), false);
});

test("isQuestionSurface accepts the nine names", () => {
  assert.equal(isQuestionSurface("inicio"), true);
  assert.equal(isQuestionSurface("leccion"), true);
  assert.equal(isQuestionSurface("home"), false);
});

test("QUESTION_SURFACE_LABELS covers every surface", () => {
  assert.equal(QUESTION_SURFACE_LABELS.sonidos, "Guía de sonidos");
  assert.equal(QUESTION_SURFACE_LABELS.practica, "Práctica");
});

test("unaddressedCount ignores stamped rows", () => {
  assert.equal(
    unaddressedCount([
      { addressedAt: null },
      { addressedAt: "2026-10-14T12:00:00Z" },
      { addressedAt: null },
    ]),
    2
  );
});

test("oldestFirst and newestFirst order by createdAt", () => {
  const rows = [
    { id: "b", createdAt: "2026-10-14T12:00:00Z" },
    { id: "a", createdAt: "2026-10-14T11:00:00Z" },
    { id: "c", createdAt: "2026-10-14T13:00:00Z" },
  ];
  assert.deepEqual(
    oldestFirst(rows).map((row) => row.id),
    ["a", "b", "c"]
  );
  assert.deepEqual(
    newestFirst(rows).map((row) => row.id),
    ["c", "b", "a"]
  );
});
