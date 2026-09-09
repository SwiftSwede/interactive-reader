import type { LyricBlank } from "@/types";

export const MUSIC_STEP_IDS = [
  "bio",
  "video",
  "blind_listen",
  "blanks",
  "lyrics_meaning",
  "truquitos_karaoke",
] as const;

export type MusicStepId = (typeof MUSIC_STEP_IDS)[number];

export type MusicStep = {
  id: MusicStepId;
  label: string;
};

export type LyricIpaLine = {
  lineIndex: number;
  ipaText: string;
};

export type LyricLineTimestamp = {
  lineIndex: number;
  startSeconds: number;
  endSeconds: number;
};

export type LyricSegment =
  | { kind: "text"; text: string }
  | { kind: "blank"; blankId: number; answer: string };

export type PlacedLyricLine = {
  /** 0-based among non-empty lyric lines. Null on stanza breaks. */
  lineIndex: number | null;
  segments: LyricSegment[];
};

export type MusicStoryFields = {
  artistBio?: string | null;
  youtubeUrl?: string | null;
  lyricBlanks?: LyricBlank[] | unknown;
  artist_bio?: string | null;
  youtube_url?: string | null;
  lyric_blanks?: unknown;
};

const LABELS: Record<MusicStepId, string> = {
  bio: "El artista",
  video: "El video",
  blind_listen: "Primera escucha",
  blanks: "Completa la canción",
  lyrics_meaning: "La letra",
  truquitos_karaoke: "Truquitos y karaoke",
};

export function musicStepLabel(step: MusicStepId): string {
  return LABELS[step];
}

export function parseLyricBlanks(raw: unknown): LyricBlank[] {
  if (!Array.isArray(raw)) return [];
  const blanks: LyricBlank[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; prompt?: unknown; answer?: unknown };
    const id = Number(row.id);
    if (!Number.isInteger(id) || id < 1) continue;
    if (typeof row.prompt !== "string" || typeof row.answer !== "string") {
      continue;
    }
    blanks.push({ id, prompt: row.prompt, answer: row.answer });
  }
  return blanks;
}

export function parseSongClassAnswers(raw: unknown): Record<number, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next: Record<number, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || id > 99) continue;
    if (typeof value !== "string") continue;
    next[id] = value.slice(0, 200);
  }
  return next;
}

export function serializeSongClassAnswers(
  answers: Record<number, string>
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    next[key] = value.slice(0, 200);
  }
  return next;
}

export function allLyricBlanksFilled(
  values: Record<number, string>,
  blanks: { id: number }[]
): boolean {
  return blanks.every((blank) => (values[blank.id] ?? "").trim().length > 0);
}

function artistBioOf(story: MusicStoryFields): string {
  return (story.artistBio ?? story.artist_bio ?? "").trim();
}

function youtubeUrlOf(story: MusicStoryFields): string {
  return (story.youtubeUrl ?? story.youtube_url ?? "").trim();
}

function blanksOf(story: MusicStoryFields): LyricBlank[] {
  return parseLyricBlanks(story.lyricBlanks ?? story.lyric_blanks);
}

export function musicStepList(story: MusicStoryFields): MusicStep[] {
  const list: MusicStep[] = [];
  if (artistBioOf(story)) {
    list.push({ id: "bio", label: LABELS.bio });
  }
  if (youtubeUrlOf(story)) {
    list.push({ id: "blind_listen", label: LABELS.blind_listen });
  }
  if (blanksOf(story).length > 0) {
    list.push({ id: "blanks", label: LABELS.blanks });
  }
  list.push({ id: "lyrics_meaning", label: LABELS.lyrics_meaning });
  if (youtubeUrlOf(story)) {
    list.push({ id: "truquitos_karaoke", label: LABELS.truquitos_karaoke });
  }
  return list;
}

export function encodeMusicStep(step: MusicStepId): string {
  return step;
}

export function isMusicStepId(value: string): value is MusicStepId {
  return (MUSIC_STEP_IDS as readonly string[]).includes(value);
}

export function decodeMusicStep(
  value: string | null | undefined,
  story: MusicStoryFields
): MusicStepId {
  const steps = musicStepList(story);
  const fallback = steps[0]?.id ?? "lyrics_meaning";
  if (!value) return fallback;
  const trimmed = value.trim();
  const mapped = trimmed === "video" ? "blind_listen" : trimmed;
  if (!isMusicStepId(mapped)) return fallback;
  if (!steps.some((step) => step.id === mapped)) return fallback;
  return mapped;
}

export function musicStepIndex(
  step: MusicStepId,
  story: MusicStoryFields
): number {
  const steps = musicStepList(story);
  const index = steps.findIndex((row) => row.id === step);
  return index < 0 ? 0 : index;
}

export function adjacentMusicStep(
  story: MusicStoryFields,
  current: MusicStepId,
  direction: "next" | "prev"
): MusicStepId {
  const steps = musicStepList(story);
  if (steps.length === 0) return current;
  const index = steps.findIndex((row) => row.id === current);
  const from = index < 0 ? 0 : index;
  const next = direction === "next" ? from + 1 : from - 1;
  const clamped = Math.min(steps.length - 1, Math.max(0, next));
  return steps[clamped]?.id ?? current;
}

export function normalizeBlankAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreBlank(typed: string, answer: string): boolean {
  return normalizeBlankAnswer(typed) === normalizeBlankAnswer(answer);
}

export function parseLyricsIpa(raw: unknown): LyricIpaLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: LyricIpaLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { line_index?: unknown; ipa_text?: unknown };
    const lineIndex = Number(row.line_index);
    if (!Number.isInteger(lineIndex) || lineIndex < 0) continue;
    if (typeof row.ipa_text !== "string" || !row.ipa_text.trim()) continue;
    lines.push({ lineIndex, ipaText: row.ipa_text });
  }
  return lines;
}

export function parseLineTimestamps(raw: unknown): LyricLineTimestamp[] {
  if (!Array.isArray(raw)) return [];
  const lines: LyricLineTimestamp[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      line_index?: unknown;
      start_seconds?: unknown;
      end_seconds?: unknown;
    };
    const lineIndex = Number(row.line_index);
    const startSeconds = Number(row.start_seconds);
    const endSeconds = Number(row.end_seconds);
    if (!Number.isInteger(lineIndex) || lineIndex < 0) continue;
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
      continue;
    }
    lines.push({ lineIndex, startSeconds, endSeconds });
  }
  return lines;
}

/** Non-empty lyric lines, 0-based. Stanza breaks are skipped. */
export function indexedLyricLines(bodyText: string): string[] {
  return bodyText.split("\n").filter((line) => line.trim().length > 0);
}

function normalizeForMatch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function reconstructPromptLine(prompt: string, answer: string): string {
  const start = prompt.search(/_{2,}/);
  const runs = [...prompt.matchAll(/_{2,}'?/g)];
  const last = runs[runs.length - 1];
  if (start < 0 || !last || last.index === undefined) {
    return normalizeForMatch(prompt);
  }
  const end = last.index + last[0].length;
  const filled = `${prompt.slice(0, start)}${answer}${prompt.slice(end)}`;
  return normalizeForMatch(filled.replace(/'{2,}/g, "'"));
}

function tokenize(line: string): string[] {
  return line.split(/\s+/).filter(Boolean);
}

function stripTrailPunct(token: string): string {
  return token.replace(/[.,!?;:]+$/g, "");
}

function tokensMatchAnswer(tokens: string[], answerTokens: string[]): boolean {
  if (tokens.length !== answerTokens.length) return false;
  return tokens.every(
    (token, index) =>
      stripTrailPunct(token).toLowerCase() ===
      stripTrailPunct(answerTokens[index] ?? "").toLowerCase()
  );
}

function findAnswerWindow(
  tokens: string[],
  answer: string
): { start: number; count: number } | null {
  const answerTokens = tokenize(answer);
  if (answerTokens.length === 0) return null;
  for (let i = 0; i <= tokens.length - answerTokens.length; i += 1) {
    const window = tokens.slice(i, i + answerTokens.length);
    if (tokensMatchAnswer(window, answerTokens)) {
      return { start: i, count: answerTokens.length };
    }
  }
  return null;
}

/**
 * Inline blank slots from `{id, prompt, answer}` against lyric lines.
 * Repeated ids share one typed value and appear at every matching line.
 */
export function placeLyricBlanks(
  bodyText: string,
  blanks: LyricBlank[]
): PlacedLyricLine[] {
  const rawLines = bodyText.split("\n");
  let indexed = 0;
  const usedWindows = new Set<string>();

  return rawLines.map((line) => {
    if (!line.trim()) {
      return { lineIndex: null, segments: [] };
    }
    const lineIndex = indexed;
    indexed += 1;
    const tokens = tokenize(line);
    const blankAt = new Map<number, LyricBlank>();

    for (const blank of blanks) {
      const reconstructed = reconstructPromptLine(blank.prompt, blank.answer);
      const hay = normalizeForMatch(line);
      if (hay !== reconstructed && !hay.startsWith(reconstructed)) continue;
      const window = findAnswerWindow(tokens, blank.answer);
      if (!window) continue;
      const key = `${lineIndex}:${window.start}`;
      if (usedWindows.has(key)) continue;
      usedWindows.add(key);
      blankAt.set(window.start, blank);
      for (let i = 1; i < window.count; i += 1) {
        blankAt.set(window.start + i, blank);
      }
    }

    const segments: LyricSegment[] = [];
    let i = 0;
    while (i < tokens.length) {
      const blank = blankAt.get(i);
      if (blank) {
        const answerTokens = tokenize(blank.answer);
        segments.push({
          kind: "blank",
          blankId: blank.id,
          answer: blank.answer,
        });
        i += Math.max(1, answerTokens.length);
        continue;
      }
      const word = tokens[i] ?? "";
      const last = segments[segments.length - 1];
      if (last?.kind === "text") {
        last.text = `${last.text} ${word}`;
      } else {
        segments.push({ kind: "text", text: word });
      }
      i += 1;
    }

    return { lineIndex, segments };
  });
}

export function blankIdsOnLine(
  line: PlacedLyricLine | undefined
): number[] {
  if (!line) return [];
  const ids: number[] = [];
  for (const segment of line.segments) {
    if (segment.kind === "blank" && !ids.includes(segment.blankId)) {
      ids.push(segment.blankId);
    }
  }
  return ids;
}

export function seekBackSeconds(startSeconds: number): number {
  return Math.max(0, startSeconds - 3);
}
