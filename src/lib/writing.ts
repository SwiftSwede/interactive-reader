import { diffWords } from "diff";

export type DiffSegment = {
  text: string;
  type: "kept" | "added" | "deleted";
};

export type InlineNote = {
  word_index: number;
  note: string;
};

export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

export function tokenizeWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function wordsPerMinute(
  wordCount: number,
  elapsedSeconds: number
): number | null {
  if (elapsedSeconds <= 0 || wordCount <= 0) return null;
  return Math.round((wordCount / elapsedSeconds) * 60 * 10) / 10;
}

export function promptTitleFromText(promptText: string): string {
  const compact = promptText.replace(/\s+/g, " ").trim();
  if (!compact) return "Escritura";
  if (compact.length <= 72) return compact;
  return `${compact.slice(0, 69).trim()}...`;
}

export function wordDiff(original: string, corrected: string): DiffSegment[] {
  return diffWords(original, corrected)
    .filter((part) => part.value.length > 0)
    .map((part) => ({
      text: part.value,
      type: part.added ? "added" : part.removed ? "deleted" : "kept",
    }));
}

export function remainingMs(
  timerStartedAt: string,
  writingTimeMinutes: number,
  now = Date.now()
): number {
  const end =
    new Date(timerStartedAt).getTime() + writingTimeMinutes * 60 * 1000;
  return end - now;
}

export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
