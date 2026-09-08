import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isLiveOnlySessionType,
  isSessionType,
  isStoryBackedSessionType,
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

  test("accepts dialogue, movie talk, and song", () => {
    assert.equal(isSessionType("dialogue"), true);
    assert.equal(isSessionType("movie_talk"), true);
    assert.equal(isSessionType("song"), true);
    assert.equal(isLiveOnlySessionType("dialogue"), false);
    assert.equal(isLiveOnlySessionType("movie_talk"), false);
    assert.equal(isLiveOnlySessionType("song"), false);
    assert.equal(isStoryBackedSessionType("dialogue"), true);
    assert.equal(isStoryBackedSessionType("video_summary"), false);
    assert.equal(sessionTypeLabel("dialogue"), "Diálogo");
    assert.equal(sessionTypeLabel("movie_talk"), "Movie Talk");
    assert.equal(sessionTypeLabel("song"), "Música");
    assert.equal(
      studentSessionPath({
        sessionType: "dialogue",
        token: "tok",
        storySlug: "the-coffee-line",
      }),
      "/lesson/the-coffee-line?session=tok"
    );
    assert.equal(
      studentSessionPath({
        sessionType: "movie_talk",
        token: "tok",
        storySlug: "the-bus-stop",
      }),
      "/lesson/the-bus-stop?session=tok"
    );
    assert.equal(
      studentSessionPath({
        sessionType: "song",
        token: "tok",
        storySlug: "summer-of-69",
      }),
      "/lesson/summer-of-69?session=tok"
    );
    assert.equal(
      studentSessionPath({
        sessionType: "dialogue",
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
