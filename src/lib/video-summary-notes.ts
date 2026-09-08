import type {
  VideoSummaryNoteSide,
  VideoSummaryTeachingNote,
} from "@/types";

export function notesOnSide(
  notes: VideoSummaryTeachingNote[],
  side: VideoSummaryNoteSide
): VideoSummaryTeachingNote[] {
  return notes.filter((note) => note.textSide === side);
}

export function markFirstMatch(text: string, needle: string): string[] {
  if (!needle) return [text];
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isToken = /^[\p{L}\p{N}'’-]+$/u.test(needle);
  const pattern = isToken
    ? new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u")
    : null;
  const match = pattern?.exec(text);
  const index = match ? match.index : pattern ? -1 : text.indexOf(needle);
  if (index < 0) return [text];
  const found = match ? match[0] : needle;
  return [text.slice(0, index), found, text.slice(index + found.length)];
}
