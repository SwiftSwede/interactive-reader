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
  /** End of the spoken question. */
  pauseAt: number;
  /** End of a lead such as "Otra vez". The input opens here. */
  leadEnd?: number;
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
      const leadEnd = num(seg.leadEnd) ?? undefined;
      const end = num(seg.end) ?? pauseAt;
      const expected = Array.isArray(seg.expected)
        ? seg.expected.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
      if (!spanish || expected.length === 0) continue;
      segments.push({ t: "prompt", start, pauseAt, leadEnd, end, spanish, expected });
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

/** English while an English line is playing. Spanish as soon as the teaching starts. */
export function englishOnScreen(
  segments: IploSegment[],
  time: number
): ScreenLine | null {
  const segment = segmentAt(segments, time);
  if (segment?.t === "english") return { kind: "english", segment };
  if (segment?.t === "narration" && segment.text) return { kind: "narration", segment };
  return null;
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

/** About one caption line of body-main inside an 18rem measure. */
export const IPLO_SUBTITLE_CHARS = 34;
export const IPLO_SUBTITLE_MAX_LINES = 3;

export type SubtitleCue = { text: string; start: number; end: number };

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let buf = "";
  let quotes = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    if (ch === "\u201c") quotes += 1;
    else if (ch === "\u201d" || ch === "\u00bb") quotes = Math.max(0, quotes - 1);
    else if (ch === '"') quotes = quotes > 0 ? quotes - 1 : quotes + 1;
    if (quotes > 0 || !/[.!?]/.test(ch)) continue;
    const rest = text.slice(i + 1).replace(/^\s+/, "");
    if (!rest || /^[A-ZÁÉÍÓÚÑ¿¡]/.test(rest)) {
      const sentence = buf.trim();
      if (sentence) sentences.push(sentence);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) sentences.push(tail);
  return sentences;
}

function wrapLines(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function lineCount(text: string): number {
  return wrapLines(text, IPLO_SUBTITLE_CHARS).length;
}

/** Keep a whole sentence when it fits in three lines. Longer sentences break on a clause. */
function packSentence(sentence: string): string[] {
  if (lineCount(sentence) <= IPLO_SUBTITLE_MAX_LINES) return [sentence];
  const clauses = sentence.split(/(?<=[,;:])\s+/).filter(Boolean);
  const packed: string[] = [];
  let buffer = "";
  for (const clause of clauses) {
    const next = buffer ? `${buffer} ${clause}` : clause;
    if (buffer && lineCount(next) > IPLO_SUBTITLE_MAX_LINES) {
      packed.push(buffer);
      buffer = clause;
    } else {
      buffer = next;
    }
  }
  if (buffer) packed.push(buffer);
  return packed.flatMap((cue) => {
    if (lineCount(cue) <= IPLO_SUBTITLE_MAX_LINES) return [cue];
    const lines = wrapLines(cue, IPLO_SUBTITLE_CHARS);
    const groups: string[] = [];
    for (let i = 0; i < lines.length; i += IPLO_SUBTITLE_MAX_LINES) {
      groups.push(lines.slice(i, i + IPLO_SUBTITLE_MAX_LINES).join(" "));
    }
    return groups;
  });
}

function cueTexts(text: string): string[] {
  return splitSentences(text).flatMap(packSentence);
}

function tokenMatches(script: string, heard: string): boolean {
  if (!script || !heard) return false;
  if (script === heard) return true;
  if (script.length >= 3 && heard.length >= 3 && (heard.startsWith(script) || script.startsWith(heard))) {
    return true;
  }
  return false;
}

function assignCueTimes(
  texts: string[],
  words: IploWord[],
  start: number,
  end: number
): SubtitleCue[] {
  let wordIndex = 0;
  const matched = texts.map((text) => {
    const tokens = text.split(/\s+/).map(foldToken).filter(Boolean);
    let first = -1;
    let last = -1;
    for (const token of tokens) {
      const windowEnd = Math.min(words.length, wordIndex + 6);
      for (let k = wordIndex; k < windowEnd; k++) {
        if (!tokenMatches(token, foldToken(words[k].w))) continue;
        if (first < 0) first = k;
        last = k;
        wordIndex = k + 1;
        break;
      }
    }
    return { text, first, last };
  });

  const cues: SubtitleCue[] = matched.map((item) => ({
    text: item.text,
    start: item.first >= 0 ? words[item.first].start : Number.NaN,
    end: item.last >= 0 ? words[item.last].end : Number.NaN,
  }));

  const timed = cues.map((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end));
  let index = 0;
  while (index < cues.length) {
    if (timed[index]) {
      index += 1;
      continue;
    }
    const runStart = index;
    while (index < cues.length && !timed[index]) index += 1;
    const left = runStart > 0 ? cues[runStart - 1].end : start;
    const right = index < cues.length ? cues[index].start : end;
    const run = cues.slice(runStart, index);
    const weight = run.reduce((sum, cue) => sum + cue.text.length, 0) || run.length;
    let cursor = left;
    for (const cue of run) {
      const span = Math.max(0, right - left) * (cue.text.length / weight);
      cue.start = cursor;
      cue.end = cursor + span;
      cursor = cue.end;
    }
  }
  if (cues.length > 0 && cues[0].start > start) cues[0].start = start;
  const last = cues[cues.length - 1];
  if (last && last.end < end) last.end = end;
  return cues;
}

/** Spanish teaching, one caption at a time. No highlight. */
export function subtitleCues(segment: IploNarration): SubtitleCue[] {
  const texts = cueTexts(segment.text);
  if (texts.length === 0) return [];
  return assignCueTimes(texts, segment.words, segment.start, segment.end);
}

export function subtitleAt(segment: IploNarration, time: number): string | null {
  const cues = subtitleCues(segment);
  let current: SubtitleCue | null = null;
  for (const cue of cues) {
    if (cue.start <= time + 0.02) current = cue;
    else break;
  }
  if (!current) return cues[0]?.text ?? null;
  return current.text;
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

/** The teaching caption while the lead is spoken. "Otra vez", not the question. */
export function promptLeadText(spanish: string): string | null {
  const trimmed = spanish.trim();
  const match = trimmed.match(/^(dime otra vez\.|otra vez\.|otra vez|ahora dime|ahora di)/i);
  if (!match) return null;
  return trimmed.slice(0, match[1].length);
}

/** When the question and the input appear. Only repeat-lead prompts ("Otra vez,
 * ¿cómo se dice...?") open at the lead's end, so the student hears the lead
 * first. "Ahora di ..." prompts open at the pause: the sentence itself is the
 * question, and it must be heard in full before the input appears. Never open
 * at the segment start or before the question is spoken. */
export function promptInputAt(prompt: IploPrompt): number {
  const lead = prompt.leadEnd;
  const repeatLead = /^dime otra vez\.|^otra vez[.,]/i.test(prompt.spanish.trim());
  if (
    lead != null &&
    repeatLead &&
    lead > prompt.start + 0.05 &&
    lead < prompt.pauseAt - 0.05
  ) {
    return lead;
  }
  return prompt.pauseAt;
}

/** When the audio pauses. Always after the question has been asked. */
export function promptAnswerAt(prompt: IploPrompt): number {
  return prompt.pauseAt;
}

/** Input screen only. Repeat prompts ("Otra vez, ¿cómo...?") drop the lead and
 * show the bare question. "Ahora di ..." / "Ahora dime cómo decir ..." keep the
 * full sentence: the lead is the sentence's subject, not a repeat prompt.
 * Whisper transcripts lowercase after ¿ ("¿cómo...") - normalize casing here. */
export function promptQuestionText(spanish: string): string {
  const trimmed = spanish.trim();
  if (/^(dime otra vez\.|otra vez\.|otra vez)[.,]?\s*/i.test(trimmed)) {
    const stripped = trimmed.replace(/^(dime otra vez\.|otra vez\.|otra vez)[.,]?\s*/i, "").trim();
    if (!stripped.startsWith("¿")) return trimmed;
    return normalizeQuestion(stripped);
  }
  return normalizeQuestion(trimmed);
}

function normalizeQuestion(q: string): string {
  if (q.startsWith("¿")) {
    const rest = q.slice(1);
    return "¿" + rest.charAt(0).toLocaleUpperCase("es") + rest.slice(1);
  }
  if (/^(cómo|qué|cuál|cuáles|dónde|adónde|quién|quiénes|puedes|puede)\b/i.test(q)) {
    return "¿" + q.charAt(0).toLocaleUpperCase("es") + q.slice(1);
  }
  return q;
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
