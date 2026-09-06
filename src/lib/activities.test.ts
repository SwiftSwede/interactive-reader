import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isLiveOnlySessionType,
  isSessionType,
  sessionTypeLabel,
  studentSessionPath,
} from "./activities";

describe("session types", () => {
  test("accepts conversation and pronunciation", () => {
    assert.equal(isSessionType("conversation"), true);
    assert.equal(isSessionType("pronunciation"), true);
    assert.equal(isLiveOnlySessionType("conversation"), true);
    assert.equal(isLiveOnlySessionType("story"), false);
  });

  test("labels live-only types in Spanish", () => {
    assert.equal(sessionTypeLabel("conversation"), "Conversación");
    assert.equal(sessionTypeLabel("pronunciation"), "Pronunciación");
  });

  test("studentSessionPath is null for live-only types", () => {
    assert.equal(
      studentSessionPath({
        sessionType: "conversation",
        token: "tok",
      }),
      null
    );
    assert.equal(
      studentSessionPath({
        sessionType: "pronunciation",
        token: "tok",
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
