import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isLiveOnlySessionType,
  isSessionType,
  sessionTypeLabel,
  studentSessionPath,
  teacherJoinAppHref,
} from "./activities";

describe("session types", () => {
  test("accepts conversation and pronunciation", () => {
    assert.equal(isSessionType("conversation"), true);
    assert.equal(isSessionType("pronunciation"), true);
    assert.equal(isLiveOnlySessionType("conversation"), false);
    assert.equal(isLiveOnlySessionType("pronunciation"), true);
    assert.equal(isLiveOnlySessionType("story"), false);
  });

  test("labels live-only types in Spanish", () => {
    assert.equal(sessionTypeLabel("conversation"), "Conversación");
    assert.equal(sessionTypeLabel("pronunciation"), "Pronunciación");
  });

  test("studentSessionPath is null for pronunciation only", () => {
    assert.equal(
      studentSessionPath({
        sessionType: "conversation",
        token: "tok",
      }),
      "/conversation?session=tok"
    );
    assert.equal(
      studentSessionPath({
        sessionType: "pronunciation",
        token: "tok",
      }),
      null
    );
  });

  test("teacher Abrir la clase opens the conversation lesson", () => {
    assert.equal(
      teacherJoinAppHref({
        sessionType: "conversation",
        token: "tok",
        courseId: "c1",
        sessionId: "s1",
        conversationPromptId: "p1",
      }),
      "/conversation?session=tok"
    );
    assert.equal(
      teacherJoinAppHref({
        sessionType: "conversation",
        token: "tok",
        courseId: "c1",
        sessionId: "s1",
        conversationPromptId: null,
      }),
      "/teacher/classes/c1/sessions/s1"
    );
    assert.equal(
      teacherJoinAppHref({
        sessionType: "pronunciation",
        token: "tok",
        courseId: "c1",
        sessionId: "s1",
      }),
      null
    );
  });

  test("studentSessionPath is null for story without a slug", () => {
    assert.equal(
      studentSessionPath({
        sessionType: "story",
        token: "tok",
      }),
      null
    );
  });

  test("studentSessionPath still builds writing and exam URLs", () => {
    assert.equal(
      studentSessionPath({ sessionType: "writing", token: "abc" }),
      "/writing?session=abc"
    );
    assert.equal(
      studentSessionPath({ sessionType: "exam", token: "abc" }),
      "/exam?session=abc"
    );
  });
});
