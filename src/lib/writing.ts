import { diffWords } from "diff";
import type { SessionPhase } from "@/lib/session-phase";

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

export function hasWritingText(text: string | null | undefined): boolean {
  return countWords(text ?? "") > 0;
}

export type WritingSubmissionStatus = "draft" | "submitted" | "corrected";

export type WritingTimerInput = {
  phase: SessionPhase;
  sessionTimerStartedAt: string | null;
  personalStartedAt: string | null;
  status: WritingSubmissionStatus;
  text: string;
  minutes: number;
  now?: number;
};

function isMakeupTimer(
  personalStartedAt: string | null,
  sessionTimerStartedAt: string | null
): boolean {
  if (!personalStartedAt) return false;
  if (!sessionTimerStartedAt) return true;
  return personalStartedAt !== sessionTimerStartedAt;
}

function personalMakeupRemaining(
  input: WritingTimerInput,
  now: number
): number {
  if (!isMakeupTimer(input.personalStartedAt, input.sessionTimerStartedAt)) {
    return 0;
  }
  return remainingMs(input.personalStartedAt as string, input.minutes, now);
}

export function activeWritingTimer(input: WritingTimerInput): string | null {
  const now = input.now ?? Date.now();
  if (input.status === "corrected") return null;
  if (input.status === "submitted" && hasWritingText(input.text)) return null;
  if (input.phase === "before") return null;

  if (input.phase === "live") {
    return input.sessionTimerStartedAt;
  }

  if (hasWritingText(input.text)) {
    if (
      input.sessionTimerStartedAt &&
      remainingMs(input.sessionTimerStartedAt, input.minutes, now) > 0
    ) {
      return input.sessionTimerStartedAt;
    }
    return null;
  }

  if (personalMakeupRemaining(input, now) > 0) {
    return input.personalStartedAt;
  }
  return null;
}

export function canStartAfterClassWriting(input: WritingTimerInput): boolean {
  const now = input.now ?? Date.now();
  if (input.phase !== "after") return false;
  if (input.status === "corrected") return false;
  if (hasWritingText(input.text)) return false;
  if (personalMakeupRemaining(input, now) > 0) return false;
  return true;
}

export function isLateWritingSubmit(
  submittedAt: string | null | undefined,
  teachingEndedAtMs: number
): boolean {
  if (!submittedAt) return false;
  return new Date(submittedAt).getTime() > teachingEndedAtMs;
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
