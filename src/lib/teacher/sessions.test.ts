import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  readinessLabel,
  readySessionCount,
  sessionContentStatus,
  sessionRecordingStatus,
} from "./sessions";

describe("readinessLabel", () => {
  const emptyRefs = {
    writingPromptId: null as string | null,
    examPromptId: null as string | null,
    presentationPromptId: null as string | null,
    conversationPromptId: null as string | null,
  };

  test("counts pronunciation as ready without a catalog row", () => {
    const sessions = [
      { sessionType: "pronunciation" as const, storyId: null, ...emptyRefs },
      { sessionType: "story" as const, storyId: null, ...emptyRefs },
    ];
    assert.equal(readySessionCount(sessions), 1);
    assert.equal(readinessLabel(sessions), "1/8 clases listas");
  });

  test("counts a story with story_id as ready", () => {
    const sessions = [
      { sessionType: "story" as const, storyId: "s1", ...emptyRefs },
    ];
    assert.equal(readinessLabel(sessions), "1/8 clases listas");
  });
});

describe("sessionContentStatus", () => {
  test("labels conversation without a prompt as empty", () => {
    assert.equal(
      sessionContentStatus({
        sessionType: "conversation",
        storyId: null,
        writingPromptId: null,
        examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: null,
      }),
      "Sin contenido"
    );
  });

  test("labels conversation with a prompt as ready", () => {
    assert.equal(
      sessionContentStatus({
        sessionType: "conversation",
        storyId: null,
        writingPromptId: null,
        examPromptId: null,
        presentationPromptId: null,
        conversationPromptId: "p1",
      }),
      "Contenido listo"
    );
  });
});

describe("sessionRecordingStatus", () => {
  test("labels empty and set urls", () => {
    assert.equal(sessionRecordingStatus(null), "Sin grabación");
    assert.equal(
      sessionRecordingStatus("https://youtu.be/abc"),
      "Grabación"
    );
  });
});
