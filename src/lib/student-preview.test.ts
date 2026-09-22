import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isTeacherView,
  lessonSessionNext,
  lessonViewToggle,
  parseLessonPreviewNext,
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

describe("parseLessonPreviewNext", () => {
  test("accepts session-backed lesson paths", () => {
    assert.equal(
      parseLessonPreviewNext("/lesson/the-soccer-jersey?session=abc"),
      "/lesson/the-soccer-jersey?session=abc"
    );
    assert.equal(
      parseLessonPreviewNext("/writing?session=tok"),
      "/writing?session=tok"
    );
    assert.equal(parseLessonPreviewNext("/exam?session=tok"), "/exam?session=tok");
    assert.equal(
      parseLessonPreviewNext("/conversation?session=tok"),
      "/conversation?session=tok"
    );
    assert.equal(
      parseLessonPreviewNext("/presentation?session=tok"),
      "/presentation?session=tok"
    );
  });

  test("rejects open redirects and non-lesson paths", () => {
    assert.equal(parseLessonPreviewNext("/dashboard"), null);
    assert.equal(parseLessonPreviewNext("//evil.example"), null);
    assert.equal(parseLessonPreviewNext("https://evil.example"), null);
    assert.equal(parseLessonPreviewNext("/teacher"), null);
    assert.equal(parseLessonPreviewNext(""), null);
  });
});

describe("lessonViewToggle", () => {
  test("builds a toggle only for teachers with a course level and lesson next", () => {
    assert.deepEqual(
      lessonViewToggle({
        role: "teacher",
        courseLevel: "intermediate",
        nextPath: "/writing?session=tok",
      }),
      { level: "intermediate", next: "/writing?session=tok" }
    );
  });

  test("students and missing session get no toggle", () => {
    assert.equal(
      lessonViewToggle({
        role: "student-classroom",
        courseLevel: "intermediate",
        nextPath: "/writing?session=tok",
      }),
      null
    );
    assert.equal(
      lessonViewToggle({
        role: "teacher",
        courseLevel: "intermediate",
        nextPath: null,
      }),
      null
    );
    assert.equal(
      lessonViewToggle({
        role: "teacher",
        courseLevel: null,
        nextPath: "/lesson/foo?session=tok",
      }),
      null
    );
  });
});

describe("lessonSessionNext", () => {
  test("encodes the session token on the pathname", () => {
    assert.equal(
      lessonSessionNext("/writing", "a b"),
      "/writing?session=a%20b"
    );
    assert.equal(lessonSessionNext("/writing", undefined), null);
  });
});
