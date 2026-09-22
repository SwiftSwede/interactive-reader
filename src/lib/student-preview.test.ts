import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isTeacherView,
  parseStudentPreviewLevel,
  studentPreviewLevelLabel,
} from "./student-preview";

describe("parseStudentPreviewLevel", () => {
  test("accepts the two course levels", () => {
    assert.equal(parseStudentPreviewLevel("intermediate"), "intermediate");
    assert.equal(
      parseStudentPreviewLevel("pre-intermediate"),
      "pre-intermediate"
    );
  });

  test("rejects anything else", () => {
    assert.equal(parseStudentPreviewLevel("beginner"), null);
    assert.equal(parseStudentPreviewLevel("teacher"), null);
    assert.equal(parseStudentPreviewLevel(""), null);
    assert.equal(parseStudentPreviewLevel(undefined), null);
    assert.equal(parseStudentPreviewLevel(null), null);
  });
});

describe("studentPreviewLevelLabel", () => {
  test("uses the Spanish level names", () => {
    assert.equal(studentPreviewLevelLabel("intermediate"), "Intermedio");
    assert.equal(
      studentPreviewLevelLabel("pre-intermediate"),
      "Pre-intermedio"
    );
  });
});

describe("isTeacherView", () => {
  test("teachers without preview keep teacher chrome", () => {
    assert.equal(isTeacherView("teacher", null), true);
  });

  test("teachers in preview take the student chrome", () => {
    assert.equal(isTeacherView("teacher", "intermediate"), false);
    assert.equal(isTeacherView("teacher", "pre-intermediate"), false);
  });

  test("students never get teacher chrome", () => {
    assert.equal(isTeacherView("student-classroom", null), false);
    assert.equal(isTeacherView("student-classroom", "intermediate"), false);
    assert.equal(isTeacherView("student-consumer", null), false);
    assert.equal(isTeacherView(null, "intermediate"), false);
  });
});
