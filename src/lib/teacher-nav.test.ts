import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isTeacherNavActive, parentTeacherPath } from "./teacher-nav";

describe("isTeacherNavActive", () => {
  test("Este mes is exact /teacher only", () => {
    assert.equal(isTeacherNavActive("/teacher", "/teacher"), true);
    assert.equal(isTeacherNavActive("/teacher/groups", "/teacher"), false);
    assert.equal(isTeacherNavActive("/teacher/classes/abc", "/teacher"), false);
  });

  test("Grupos is active on nested class pages", () => {
    assert.equal(isTeacherNavActive("/teacher/groups", "/teacher/groups"), true);
    assert.equal(
      isTeacherNavActive("/teacher/classes/abc", "/teacher/groups"),
      true
    );
    assert.equal(
      isTeacherNavActive("/teacher/classes/abc/sessions/s1", "/teacher/groups"),
      true
    );
    assert.equal(
      isTeacherNavActive("/teacher/students", "/teacher/groups"),
      false
    );
  });
});

describe("parentTeacherPath", () => {
  test("course detail goes back to Grupos", () => {
    assert.equal(parentTeacherPath("/teacher/classes/abc"), "/teacher/groups");
  });

  test("session detail goes back to the course", () => {
    assert.equal(
      parentTeacherPath("/teacher/classes/abc/sessions/s1"),
      "/teacher/classes/abc"
    );
  });

  test("top-level teacher pages have no back link", () => {
    assert.equal(parentTeacherPath("/teacher"), null);
    assert.equal(parentTeacherPath("/teacher/groups"), null);
  });
});
