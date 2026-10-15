import { answersMatch } from "@/lib/drills";

export const IPLO_PLANNED_LESSONS = 23;
export const IPLO_FEEDBACK_HOLD_MS = 2500;
export const IPLO_STRUGGLE_BELOW = 0.6;
export const IPLO_FALLBACK_TIME_ZONE = "America/Mexico_City";
export const IPLO_BACK_SECONDS = 15;

export type IploWord = { w: string; start: number; end: number };

export type IploNarration = {
  t: "narration";
  start: number;
  end: number;
  text: string;
  words: IploWord[];
};

export type IploEnglish = {
  t: "english";
  start: number;
  end: number;
  text: string;
  words: IploWord[];
};

export type IploPrompt = {
  t: "prompt";
  start: number;
  pauseAt: number;
  end: number;
  spanish: string;
  expected: string[];
};

export type IploSegment = IploNarration | IploEnglish | IploPrompt;

export type IploScript = {
  audioUrl: string;
  grammarTagId: string;
  durationSeconds: number;
  seedVersion?: string;
  segments: IploSegment[];
};

export type ScreenLine =
  | { kind: "english"; segment: IploEnglish }
  | { kind: "narration"; segment: IploNarration };

export type IploPromptRef = { index: number; prompt: IploPrompt };

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseWords(value: unknown): IploWord[] {
  const words: IploWord[] = [];
  if (!Array.isArray(value)) return words;
  for (const word of value) {
    if (!word || typeof word !== "object") continue;
    const w = word as Record<string, unknown>;
    const label = str(w.w);
    const wStart = num(w.start);
    const wEnd = num(w.end);
    if (!label || wStart == null || wEnd == null) continue;
    words.push({ w: label, start: wStart, end: wEnd });
  }
  return words;
}

function narrationText(seg: Record<string, unknown>): string {
  const text = str(seg.text);
  if (text) return text;
  if (!Array.isArray(seg.lines)) return "";
  return seg.lines
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .map((line) => line.trim())
    .join(" ");
}

export function parseAudioScript(value: unknown): IploScript | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const audioUrl = str(row.audioUrl);
  const grammarTagId = str(row.grammarTagId);
  const durationSeconds = num(row.durationSeconds);
  const seedVersion = str(row.seedVersion) ?? undefined;
  if (!audioUrl || !grammarTagId || durationSeconds == null || !Array.isArray(row.segments)) {
    return null;
  }
  const segments: IploSegment[] = [];
  for (const item of row.segments) {
    if (!item || typeof item !== "object") continue;
    const seg = item as Record<string, unknown>;
    const start = num(seg.start);
    if (start == null) continue;
    if (seg.t === "narration") {
      const end = num(seg.end) ?? start;
      segments.push({
        t: "narration",
        start,
        end,
        text: narrationText(seg),
        words: parseWords(seg.words),
      });
    } else if (seg.t === "english") {
      const text = str(seg.text);
      const end = num(seg.end) ?? start;
      if (!text) continue;
      segments.push({ t: "english", start, end, text, words: parseWords(seg.words) });
    } else if (seg.t === "prompt") {
      const spanish = str(seg.spanish);
      const pauseAt = num(seg.pauseAt) ?? start;
      const end = num(seg.end) ?? pauseAt;
      const expected = Array.isArray(seg.expected)
        ? seg.expected.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
      if (!spanish || expected.length === 0) continue;
      segments.push({ t: "prompt", start, pauseAt, end, spanish, expected });
    }
  }
  if (segments.length === 0) return null;
  return { audioUrl, grammarTagId, durationSeconds, seedVersion, segments };
}

export function promptRefs(script: IploScript): IploPromptRef[] {
  const refs: IploPromptRef[] = [];
  script.segments.forEach((segment, index) => {
    if (segment.t === "prompt") refs.push({ index, prompt: segment });
  });
  return refs;
}

/** The English model spoken immediately after a prompt. The label waits for this line. */
export function confirmationAfter(
  segments: IploSegment[],
  promptIndex: number
): IploEnglish | null {
  for (let i = promptIndex + 1; i < segments.length; i++) {
    const item = segments[i];
    if (item.t === "english") return item;
    if (item.t === "prompt") return null;
  }
  return null;
}

/** The English sentence on screen: the current english segment, or, while the
 * teacher narrates over it, the most recent english sentence - but only for a
 * bounded hold after its audio ends. Short explanations keep the sentence up
 * (reading time); a long lecture clears it so a stale sentence doesn't sit
 * through a new topic. */
export const IPLO_ENGLISH_HOLD_S = 8;

export function englishOnScreen(
  segments: IploSegment[],
  time: number
): ScreenLine | null {
  const segment = segmentAt(segments, time);
  if (segment?.t === "english") return { kind: "english", segment };
  if (segment?.t !== "narration") return null;
  let last: IploEnglish | null = null;
  for (const item of segments) {
    if (item.start > time + 0.02) break;
    if (item.t === "english") last = item;
  }
  if (last && time <= last.end + IPLO_ENGLISH_HOLD_S) {
    return { kind: "english", segment: last };
  }
  if (!segment.text) return null;
  return { kind: "narration", segment };
}

function segmentAt(segments: IploSegment[], time: number): IploSegment | null {
  let current: IploSegment | null = null;
  for (const segment of segments) {
    if (segment.start <= time + 0.02) current = segment;
    else break;
  }
  return current;
}

export function courseLessonTotal(rowCount: number, hasAudioCourse: boolean): number {
  if (!hasAudioCourse) return rowCount;
  return Math.max(rowCount, IPLO_PLANNED_LESSONS);
}

export function isValidTimeZone(zone: string): boolean {
  try {
    Intl.DateTimeFormat("en-CA", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(zone: string | null | undefined): string {
  if (zone && isValidTimeZone(zone)) return zone;
  return IPLO_FALLBACK_TIME_ZONE;
}

/** Calendar date in that zone, YYYY-MM-DD. */
export function calendarDateKey(zone: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimeZone(zone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function clampSeek(input: {
  target: number;
  current: number;
  completedOnce: boolean;
  prompts: { pauseAt: number; answered: boolean }[];
}): number {
  const target = Math.max(0, input.target);
  if (input.completedOnce || target <= input.current + 0.05) return target;
  const wall = input.prompts
    .filter(
      (prompt) =>
        !prompt.answered &&
        prompt.pauseAt > input.current + 0.05 &&
        prompt.pauseAt < target
    )
    .map((prompt) => prompt.pauseAt)
    .sort((a, b) => a - b)[0];
  return wall ?? target;
}

export type AttemptAnswer = {
  index: number;
  given: string;
  skipped: boolean;
};

export type AttemptScore = {
  firstTryCorrect: number;
  totalPrompts: number;
  full: boolean;
  accuracy: number | null;
  shouldFlag: boolean;
  shouldClear: boolean;
  wrongPrompts: { spanish: string; expected: string; given: string }[];
};

export function scoreAttempt(
  prompts: IploPromptRef[],
  answers: AttemptAnswer[]
): AttemptScore {
  const byIndex = new Map(answers.map((answer) => [answer.index, answer]));
  let firstTryCorrect = 0;
  let skipped = 0;
  const wrongPrompts: AttemptScore["wrongPrompts"] = [];
  for (const ref of prompts) {
    const answer = byIndex.get(ref.index);
    if (!answer || answer.skipped || !answer.given.trim()) {
      skipped += 1;
      continue;
    }
    if (answersMatch(ref.prompt.expected, answer.given)) {
      firstTryCorrect += 1;
    } else {
      wrongPrompts.push({
        spanish: ref.prompt.spanish,
        expected: ref.prompt.expected[0] ?? "",
        given: answer.given.trim(),
      });
    }
  }
  const totalPrompts = prompts.length;
  const full = totalPrompts > 0 && skipped === 0;
  const accuracy = full ? firstTryCorrect / totalPrompts : null;
  return {
    firstTryCorrect,
    totalPrompts,
    full,
    accuracy,
    shouldFlag: accuracy != null && accuracy < IPLO_STRUGGLE_BELOW,
    shouldClear: accuracy != null && accuracy >= IPLO_STRUGGLE_BELOW,
    wrongPrompts,
  };
}

function foldToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[\u2018\u2019\u02bc']/g, "")
    .replace(/[^a-z]/g, "");
}

const PROMPT_LEADS = [
  /^dime otra vez\.\s*/i,
  /^otra vez[.,]\s*/i,
  /^ahora dime,?\s*/i,
  /^ahora di\s*/i,
];

/** Input screen only. The seeded prompt and the karaoke line keep the full sentence. */
export function promptQuestionText(spanish: string): string {
  const trimmed = spanish.trim();
  for (const lead of PROMPT_LEADS) {
    if (!lead.test(trimmed)) continue;
    const stripped = trimmed.replace(lead, "").replace(/^[\s,]+/, "").trim();
    return stripped || trimmed;
  }
  return trimmed;
}

/** First-seen content words from each prompt's first expected answer. Cap 12. */
export function lessonVocabulary(script: IploScript, cap = 12): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const segment of script.segments) {
    if (segment.t !== "prompt") continue;
    const line = segment.expected[0];
    if (!line) continue;
    for (const raw of line.split(/\s+/)) {
      const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!word) continue;
      const key = word.toLocaleLowerCase("en");
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(word);
      if (words.length >= cap) return words;
    }
  }
  return words;
}

/** A re-seeded script invalidates a tab that still holds the previous script. */
export function savedProgressIsStale(
  savedVersion: string | null | undefined,
  scriptVersion: string | null | undefined
): boolean {
  if (!scriptVersion) return false;
  return savedVersion !== scriptVersion;
}

export type KaraokePiece = { piece: string; active: boolean };

/** Visible line is always `text`. Timings that are not in that line are dropped. */
export function karaokePieces(
  text: string,
  words: IploWord[],
  time: number
): KaraokePiece[] {
  const pieces = text.split(/(\s+)/);
  const wordPieces = pieces.filter((piece) => /\S/.test(piece));
  let timingIndex = 0;
  const active = new Map<number, boolean>();
  wordPieces.forEach((piece, index) => {
    const folded = foldToken(piece);
    if (!folded) return;
    // look AHEAD a few words for a match, but never consume timing words when
    // this token has none (script/audio divergences like "Yep" sung as "Yeah"
    // or a script repeat the audio says once). The old matcher skipped forward
    // destructively, so one unmatched token darkened the rest of the line.
    for (let k = timingIndex; k < words.length && k <= timingIndex + 3; k++) {
      const w = foldToken(words[k].w);
      const exact = w === folded;
      const prefix =
        folded.length >= 2 &&
        w.length >= 2 &&
        (w.startsWith(folded) || folded.startsWith(w));
      if (exact || prefix) {
        // cumulative karaoke: a word lights up when its start passes and STAYS
        // lit (per-word windows leave gaps unhighlighted and flicker)
        active.set(index, time >= words[k].start);
        timingIndex = k + 1;
        return;
      }
    }
  });
  if (active.size === 0) return [{ piece: text, active: false }];
  let wordIndex = 0;
  return pieces.map((piece) => {
    if (!/\S/.test(piece)) return { piece, active: false };
    const on = active.get(wordIndex) ?? false;
    wordIndex += 1;
    return { piece, active: on };
  });
}
