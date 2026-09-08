import assert from "node:assert/strict";
import { test } from "node:test";
import { markFirstMatch, notesOnSide } from "./video-summary-notes";
import type { VideoSummaryTeachingNote } from "@/types";

function note(
  selectedText: string,
  textSide: VideoSummaryTeachingNote["textSide"]
): VideoSummaryTeachingNote {
  return {
    id: selectedText,
    storyId: "s",
    courseSessionId: "c",
    paragraphPosition: 0,
    selectedText,
    note: "x",
    noteType: "vocabulary",
    textSide,
    createdBy: "t",
    createdAt: "2026-09-07T00:00:00.000Z",
  };
}

test("spanish notes do not attach to english text", () => {
  const notes = [note("al", "spanish"), note("finally", "english")];
  const english = notesOnSide(notes, "english");
  assert.deepEqual(
    english.map((row) => row.selectedText),
    ["finally"]
  );
  assert.equal(
    english.some((row) => "finally".includes(row.selectedText) && row.textSide === "spanish"),
    false
  );
});

test("does not highlight al inside finally", () => {
  assert.deepEqual(markFirstMatch("finally woke up", "al"), ["finally woke up"]);
  assert.deepEqual(markFirstMatch("pero al chocar", "al"), [
    "pero ",
    "al",
    " chocar",
  ]);
});
