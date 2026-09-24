import type {
  CourseLevel,
  ExamClassAnswerItem,
  ExamClassAnswers,
  ExamCorrectionItem,
  ExamFillSentence,
  ExamFillSlot,
  ExamParagraphItem,
  ExamTask1Answer,
  ExamTask2CorrectionAnswer,
  ExamTask2LetterAnswer,
  ExamTask2Type,
  ExamTask3Answer,
  ExamTimerMode,
  ExamTranslationItem,
  ExamVocabItem,
  GroupExamPrompt,
} from "@/types";

export const EXAM_MAKEUP_MINUTES = 45;
export const EXAM_DEFAULT_TIMER_MINUTES = 20;

export type ExamTaskCopy = {
  task1Title: string;
  task1Instructions: string;
  task2Title: string;
  task2Instructions: string;
  task3Title: string;
  task3Instructions: string;
};

export function defaultExamTaskCopy(task2Type: ExamTask2Type): ExamTaskCopy {
  const order = task2Type === "paragraph_restructuring";
  return {
    task1Title: "Fill in the translation",
    task1Instructions:
      "Using the list of vocabulary from the past month, correctly match.",
    task2Title: order ? "Order" : "Correct",
    task2Instructions: order
      ? "Order the following sentences numerically starting with 1."
      : "7 of the following sentences have an error, 3 don't. Find and correct the incorrect sentences.",
    task3Title: "Translate",
    task3Instructions: "Translate from Spanish to English.",
  };
}

export function resolveExamTaskCopy(
  prompt: Pick<
    GroupExamPrompt,
    | "task2Type"
    | "task1Title"
    | "task1Instructions"
    | "task2Title"
    | "task2Instructions"
    | "task3Title"
    | "task3Instructions"
  >
): ExamTaskCopy {
  const defaults = defaultExamTaskCopy(prompt.task2Type);
  return {
    task1Title: prompt.task1Title?.trim() || defaults.task1Title,
    task1Instructions:
      prompt.task1Instructions?.trim() || defaults.task1Instructions,
    task2Title: prompt.task2Title?.trim() || defaults.task2Title,
    task2Instructions:
      prompt.task2Instructions?.trim() || defaults.task2Instructions,
    task3Title: prompt.task3Title?.trim() || defaults.task3Title,
    task3Instructions:
      prompt.task3Instructions?.trim() || defaults.task3Instructions,
  };
}

export function defaultTask2Type(level: CourseLevel): ExamTask2Type {
  return level === "intermediate"
    ? "paragraph_restructuring"
    : "sentence_correction";
}

export function parseVocabList(raw: string): ExamVocabItem[] {
  const items: ExamVocabItem[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [english, spanish] = trimmed.split("|").map((part) => part.trim());
    if (!english || !spanish) continue;
    items.push({ id: items.length + 1, english, spanish });
  }
  return items;
}

function parseSlotToken(token: string): ExamFillSlot | null {
  const inner = token.replace(/^\{/, "").replace(/\}$/, "");
  const [spanishWord, expectedEnglish, rest] = inner
    .split("|")
    .map((part) => part.trim());
  if (!spanishWord || !expectedEnglish) return null;
  const acceptableVariations = rest
    ? rest
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  return {
    spanishWord,
    expectedEnglish,
    acceptableVariations,
    morphologicalNote: null,
  };
}

export function parseFillInTranslation(raw: string): ExamFillSentence[] {
  const sentences: ExamFillSentence[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const slots: ExamFillSlot[] = [];
    const slotPattern = /\{[^}]+\}/g;
    let match: RegExpExecArray | null;
    while ((match = slotPattern.exec(trimmed)) !== null) {
      const slot = parseSlotToken(match[0]);
      if (slot) slots.push(slot);
    }
    const sentence = trimmed.replace(slotPattern, (token) => {
      const slot = parseSlotToken(token);
      return slot ? `(${slot.spanishWord})` : token;
    });
    sentences.push({
      number: sentences.length + 1,
      sentence,
      slots,
    });
  }
  return sentences;
}

export function flattenFillSlots(
  sentences: ExamFillSentence[]
): Array<{ slotIndex: number; sentenceNumber: number; slot: ExamFillSlot }> {
  const flat: Array<{
    slotIndex: number;
    sentenceNumber: number;
    slot: ExamFillSlot;
  }> = [];
  for (const sentence of sentences) {
    for (const slot of sentence.slots) {
      flat.push({
        slotIndex: flat.length,
        sentenceNumber: sentence.number,
        slot,
      });
    }
  }
  return flat;
}

export function parseParagraphRestructuring(raw: string): ExamParagraphItem[] {
  const items: ExamParagraphItem[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pipe = trimmed.indexOf("|");
    if (pipe < 0) continue;
    const rawPosition = trimmed.slice(0, pipe).trim();
    const sentence = trimmed.slice(pipe + 1).trim();
    const correctPosition = parseOrderPosition(rawPosition);
    if (!correctPosition || !sentence) continue;
    items.push({
      number: items.length + 1,
      sentence,
      correctPosition,
    });
  }
  return items;
}

export function parseSentenceCorrection(raw: string): ExamCorrectionItem[] {
  const items: ExamCorrectionItem[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|").map((part) => part.trim());
    const flag = (parts[0] ?? "").toLowerCase();
    if (flag === "ok" && parts[1]) {
      items.push({
        number: items.length + 1,
        sentence: parts[1],
        isCorrect: true,
        correctedVersion: null,
      });
      continue;
    }
    if (flag === "fix" && parts[1] && parts[2]) {
      items.push({
        number: items.length + 1,
        sentence: parts[1],
        isCorrect: false,
        correctedVersion: parts[2],
      });
    }
  }
  return items;
}

export function serializeVocabList(items: ExamVocabItem[]): string {
  return items
    .map((item) => `${item.english} | ${item.spanish}`)
    .join("\n");
}

export function serializeFillInTranslation(
  sentences: ExamFillSentence[]
): string {
  return sentences
    .map((row) => {
      let text = row.sentence;
      for (const slot of row.slots) {
        const token = `(${slot.spanishWord})`;
        const at = text.indexOf(token);
        if (at < 0) continue;
        const vars = slot.acceptableVariations.length
          ? `|${slot.acceptableVariations.join(",")}`
          : "";
        const replacement = `{${slot.spanishWord}|${slot.expectedEnglish}${vars}}`;
        text =
          text.slice(0, at) + replacement + text.slice(at + token.length);
      }
      return text;
    })
    .join("\n");
}

export function serializeParagraphRestructuring(
  items: ExamParagraphItem[]
): string {
  return items
    .map((item) => `${item.correctPosition} | ${item.sentence}`)
    .join("\n");
}

export function serializeSentenceCorrection(
  items: ExamCorrectionItem[]
): string {
  return items
    .map((item) =>
      item.isCorrect
        ? `ok | ${item.sentence}`
        : `fix | ${item.sentence} | ${item.correctedVersion ?? ""}`
    )
    .join("\n");
}

export function serializeTranslationSentences(
  items: ExamTranslationItem[]
): string {
  return items
    .map((item) => {
      const english = [
        ...(item.acceptedEnglish[0] ? [item.acceptedEnglish[0]] : []),
        ...item.acceptableVariations,
      ];
      return [item.spanish, ...english].join(" | ");
    })
    .join("\n");
}

export type ExamItemCounts = {
  vocab: number;
  fillSlots: number;
  task2: number;
  task3: number;
};

export function examItemCounts(input: {
  vocabularyList: ExamVocabItem[];
  fillInTranslation: ExamFillSentence[];
  paragraphRestructuring: ExamParagraphItem[] | null;
  sentenceCorrection: ExamCorrectionItem[] | null;
  translationSentences: ExamTranslationItem[];
}): ExamItemCounts {
  return {
    vocab: input.vocabularyList.length,
    fillSlots: flattenFillSlots(input.fillInTranslation).length,
    task2:
      (input.paragraphRestructuring?.length ?? 0) +
      (input.sentenceCorrection?.length ?? 0),
    task3: input.translationSentences.length,
  };
}

export function examCountsDropped(
  stored: ExamItemCounts,
  next: ExamItemCounts
): boolean {
  return (
    next.vocab < stored.vocab ||
    next.fillSlots < stored.fillSlots ||
    next.task2 < stored.task2 ||
    next.task3 < stored.task3
  );
}

export function parseTranslationSentences(raw: string): ExamTranslationItem[] {
  const items: ExamTranslationItem[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
    const spanish = parts[0];
    const english = parts.slice(1);
    if (!spanish || english.length === 0) continue;
    items.push({
      number: items.length + 1,
      spanish,
      acceptedEnglish: [english[0]],
      acceptableVariations: english.slice(1),
    });
  }
  return items;
}

export function nextGroupLabel(existing: string[]): string {
  const used = new Set(existing.map((label) => label.trim().toUpperCase()));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const letter of letters) {
    const label = `Grupo ${letter}`;
    if (!used.has(label.toUpperCase())) return label;
  }
  return `Grupo ${existing.length + 1}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function remainingMs(
  startedAt: string,
  minutes: number,
  now = Date.now()
): number {
  const end = new Date(startedAt).getTime() + minutes * 60 * 1000;
  return end - now;
}

export type ParsedExamPrompt = {
  title: string;
  theme: string | null;
  vocabularyList: ExamVocabItem[];
  fillInTranslation: ExamFillSentence[];
  task2Type: ExamTask2Type;
  paragraphRestructuring: ExamParagraphItem[] | null;
  sentenceCorrection: ExamCorrectionItem[] | null;
  translationSentences: ExamTranslationItem[];
  timeLimitMinutes: number;
  error: string | null;
};

export function parseExamForm(input: {
  title: string;
  theme: string;
  vocabRaw: string;
  task1Raw: string;
  task2Type: ExamTask2Type;
  task2Raw: string;
  task3Raw: string;
  timeLimitMinutes: number;
}): ParsedExamPrompt {
  const title = input.title.trim();
  const theme = input.theme.trim() || null;
  const vocabularyList = parseVocabList(input.vocabRaw);
  const fillInTranslation = parseFillInTranslation(input.task1Raw);
  const translationSentences = parseTranslationSentences(input.task3Raw);
  const paragraphRestructuring =
    input.task2Type === "paragraph_restructuring"
      ? parseParagraphRestructuring(input.task2Raw)
      : null;
  const sentenceCorrection =
    input.task2Type === "sentence_correction"
      ? parseSentenceCorrection(input.task2Raw)
      : null;

  let error: string | null = null;
  if (!title) error = "Ponle un nombre al examen.";
  else if (vocabularyList.length < 4) {
    error = "Necesito al menos 4 palabras en la lista (english | spanish).";
  } else if (flattenFillSlots(fillInTranslation).length < 1) {
    error =
      "En Tarea 1 usa {español|english} para marcar cada hueco. Al menos uno.";
  } else if (
    input.task2Type === "paragraph_restructuring" &&
    (paragraphRestructuring?.length ?? 0) < 3
  ) {
    error = "Tarea 2: al menos 3 oraciones. Formato: 3 | The first sentence.";
  } else if (
    input.task2Type === "sentence_correction" &&
    (sentenceCorrection?.length ?? 0) < 3
  ) {
    error =
      "Tarea 2: al menos 3 oraciones. ok | sentence  o  fix | wrong | corrected.";
  } else if (translationSentences.length < 3) {
    error = "Tarea 3: al menos 3 oraciones. español | english | variation.";
  }

  return {
    title,
    theme,
    vocabularyList,
    fillInTranslation,
    task2Type: input.task2Type,
    paragraphRestructuring,
    sentenceCorrection,
    translationSentences,
    timeLimitMinutes: input.timeLimitMinutes || EXAM_MAKEUP_MINUTES,
    error,
  };
}

export type ExamPromptRow = {
  id: string;
  title: string;
  level: CourseLevel;
  theme: string | null;
  vocabulary_list: ExamVocabItem[];
  fill_in_translation: ExamFillSentence[];
  task2_type: ExamTask2Type;
  paragraph_restructuring: ExamParagraphItem[] | null;
  sentence_correction: ExamCorrectionItem[] | null;
  translation_sentences: ExamTranslationItem[];
  time_limit_minutes: number;
  task1_title?: string | null;
  task1_instructions?: string | null;
  task2_title?: string | null;
  task2_instructions?: string | null;
  task3_title?: string | null;
  task3_instructions?: string | null;
  created_by: string;
  created_at: string;
};

export function mapExamPromptRow(row: ExamPromptRow): GroupExamPrompt {
  return {
    id: row.id,
    title: row.title,
    level: row.level,
    theme: row.theme,
    vocabularyList: row.vocabulary_list ?? [],
    fillInTranslation: row.fill_in_translation ?? [],
    task2Type: row.task2_type,
    paragraphRestructuring: row.paragraph_restructuring,
    sentenceCorrection: row.sentence_correction,
    translationSentences: row.translation_sentences ?? [],
    timeLimitMinutes: row.time_limit_minutes,
    task1Title: row.task1_title ?? null,
    task1Instructions: row.task1_instructions ?? null,
    task2Title: row.task2_title ?? null,
    task2Instructions: row.task2_instructions ?? null,
    task3Title: row.task3_title ?? null,
    task3Instructions: row.task3_instructions ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export const EXAM_PROMPT_SELECT =
  "id, title, level, theme, vocabulary_list, fill_in_translation, task2_type, paragraph_restructuring, sentence_correction, translation_sentences, time_limit_minutes, task1_title, task1_instructions, task2_title, task2_instructions, task3_title, task3_instructions, created_by, created_at";

export type ExamStepId = "parte-1" | "parte-2" | "parte-3" | "puntaje";

export type ExamStep = { id: ExamStepId; label: string };

export const EXAM_STEPS: ExamStep[] = [
  { id: "parte-1", label: "Parte 1" },
  { id: "parte-2", label: "Parte 2" },
  { id: "parte-3", label: "Parte 3" },
  { id: "puntaje", label: "Puntaje" },
];

export function isExamStepId(value: string): value is ExamStepId {
  return EXAM_STEPS.some((step) => step.id === value);
}

export function encodeExamStep(step: ExamStepId): string {
  return step;
}

export function decodeExamStep(value: string | null): ExamStepId {
  if (value && isExamStepId(value)) return value;
  return "parte-1";
}

export function examStepIndex(id: ExamStepId): number {
  return Math.max(
    0,
    EXAM_STEPS.findIndex((step) => step.id === id)
  );
}

export function examRowLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function parseOrderPosition(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^[1-9]$/.test(trimmed)) return trimmed;
  const letter = trimmed.toUpperCase();
  if (/^[A-I]$/.test(letter)) {
    return String(letter.charCodeAt(0) - 64);
  }
  return null;
}

export function normalizeExamAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function examAnswerMatches(typed: string, accepted: string[]): boolean {
  const normalized = normalizeExamAnswer(typed);
  if (!normalized) return false;
  return accepted.some(
    (value) => normalizeExamAnswer(value) === normalized
  );
}

export function parseExamTimerMode(raw: unknown): ExamTimerMode {
  return raw === "from_start" ? "from_start" : "until_end_offset";
}

export function parseExamTimerMinutes(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return EXAM_DEFAULT_TIMER_MINUTES;
  return Math.min(90, n);
}

/** Positive delta adds remaining work time. Clamped to 1-90. */
export function applyExamWorkTimeDelta(
  mode: ExamTimerMode,
  minutes: number,
  deltaWorkMinutes: number
): number {
  const next =
    mode === "from_start"
      ? minutes + deltaWorkMinutes
      : minutes - deltaWorkMinutes;
  return Math.min(90, Math.max(1, next));
}

export function examReviewDeadlineMs(input: {
  mode: ExamTimerMode;
  minutes: number;
  timerStartedAt: string | null;
  sessionEndTime: string | null;
}): number | null {
  if (!input.timerStartedAt) return null;
  if (input.mode === "from_start") {
    return (
      new Date(input.timerStartedAt).getTime() + input.minutes * 60 * 1000
    );
  }
  if (!input.sessionEndTime) return null;
  return new Date(input.sessionEndTime).getTime() - input.minutes * 60 * 1000;
}

export function examRemainingMs(
  input: {
    mode: ExamTimerMode;
    minutes: number;
    timerStartedAt: string | null;
    sessionEndTime: string | null;
  },
  now = Date.now()
): number {
  const deadline = examReviewDeadlineMs(input);
  if (deadline == null) return 0;
  return Math.max(0, deadline - now);
}

export function makeupRemainingMs(
  startedAt: string | null,
  minutes = EXAM_MAKEUP_MINUTES,
  now = Date.now()
): number {
  if (!startedAt) return minutes * 60 * 1000;
  return Math.max(0, remainingMs(startedAt, minutes, now));
}

export function examTimerFrozen(
  input: {
    mode: ExamTimerMode;
    minutes: number;
    timerStartedAt: string | null;
    sessionEndTime: string | null;
  },
  now = Date.now()
): boolean {
  if (!input.timerStartedAt) return true;
  return examRemainingMs(input, now) <= 0;
}

const CLASS_ANSWER_MAX = 500;

export function parseExamClassAnswers(raw: unknown): ExamClassAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next: ExamClassAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isExamItemKey(key)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as { accepted?: unknown; revealed?: unknown };
    const accepted = Array.isArray(row.accepted)
      ? row.accepted
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.slice(0, CLASS_ANSWER_MAX))
          .filter((item) => item.trim())
      : [];
    next[key] = {
      accepted,
      revealed: row.revealed === true,
    };
  }
  return next;
}

export function emptyExamClassAnswer(): ExamClassAnswerItem {
  return { accepted: [""], revealed: false };
}

export function examItemKeys(prompt: GroupExamPrompt): string[] {
  const keys: string[] = [];
  const slots = flattenFillSlots(prompt.fillInTranslation);
  for (const slot of slots) keys.push(`t1-${slot.slotIndex}`);
  if (prompt.task2Type === "paragraph_restructuring") {
    for (const item of prompt.paragraphRestructuring ?? []) {
      keys.push(`t2-${item.number}`);
    }
  } else {
    for (const item of prompt.sentenceCorrection ?? []) {
      keys.push(`t2-${item.number}`);
    }
  }
  for (const item of prompt.translationSentences) {
    keys.push(`t3-${item.number}`);
  }
  return keys;
}

export function isExamItemKey(value: string): boolean {
  return /^t[123]-\d+$/.test(value);
}

export function examItemTask(key: string): 1 | 2 | 3 | null {
  if (key.startsWith("t1-")) return 1;
  if (key.startsWith("t2-")) return 2;
  if (key.startsWith("t3-")) return 3;
  return null;
}

export function catalogAcceptedForItem(
  prompt: GroupExamPrompt,
  key: string
): string[] {
  const slots = flattenFillSlots(prompt.fillInTranslation);
  if (key.startsWith("t1-")) {
    const index = Number(key.slice(3));
    const slot = slots.find((row) => row.slotIndex === index)?.slot;
    if (!slot) return [];
    return [slot.expectedEnglish, ...slot.acceptableVariations].filter(Boolean);
  }
  if (key.startsWith("t2-")) {
    const number = Number(key.slice(3));
    if (prompt.task2Type === "paragraph_restructuring") {
      const item = (prompt.paragraphRestructuring ?? []).find(
        (row) => row.number === number
      );
      return item?.correctPosition ? [item.correctPosition] : [];
    }
    const item = (prompt.sentenceCorrection ?? []).find(
      (row) => row.number === number
    );
    if (!item) return [];
    if (item.isCorrect) return [item.sentence];
    return item.correctedVersion ? [item.correctedVersion] : [];
  }
  if (key.startsWith("t3-")) {
    const number = Number(key.slice(3));
    const item = prompt.translationSentences.find(
      (row) => row.number === number
    );
    if (!item) return [];
    return [...item.acceptedEnglish, ...item.acceptableVariations].filter(
      Boolean
    );
  }
  return [];
}

export function assignedOrderPosition(
  answers: ExamTask2LetterAnswer[],
  sentenceNumber: number
): string {
  const row = answers.find((item) => item.sentenceNumber === sentenceNumber);
  if (!row) return "";
  const raw = (row as ExamTask2LetterAnswer & { assignedLetter?: string })
    .assignedPosition;
  if (raw) return raw;
  const legacy = (row as { assignedLetter?: string }).assignedLetter ?? "";
  return parseOrderPosition(legacy) ?? "";
}

export function studentAnswerForItem(input: {
  prompt: GroupExamPrompt;
  key: string;
  task1: ExamTask1Answer[];
  task2: ExamTask2LetterAnswer[] | ExamTask2CorrectionAnswer[];
  task3: ExamTask3Answer[];
}): string {
  const { prompt, key } = input;
  if (key.startsWith("t1-")) {
    const index = Number(key.slice(3));
    return (
      input.task1.find((row) => row.slotIndex === index)?.answer ?? ""
    );
  }
  if (key.startsWith("t2-")) {
    const number = Number(key.slice(3));
    if (prompt.task2Type === "paragraph_restructuring") {
      return assignedOrderPosition(
        input.task2 as ExamTask2LetterAnswer[],
        number
      );
    }
    const row = (input.task2 as ExamTask2CorrectionAnswer[]).find(
      (item) => item.sentenceNumber === number
    );
    const item = (prompt.sentenceCorrection ?? []).find(
      (sentence) => sentence.number === number
    );
    if (!row || !item) return "";
    if (row.isCorrect) return item.sentence;
    return row.correctedText ?? "";
  }
  if (key.startsWith("t3-")) {
    const number = Number(key.slice(3));
    return (
      input.task3.find((row) => row.sentenceNumber === number)
        ?.englishTranslation ?? ""
    );
  }
  return "";
}

export function acceptedForItem(
  prompt: GroupExamPrompt,
  key: string,
  classAnswers: ExamClassAnswers,
  useCatalogFallback: boolean
): string[] {
  const typed = (classAnswers[key]?.accepted ?? []).filter((value) =>
    value.trim()
  );
  if (typed.length > 0) return typed;
  if (useCatalogFallback) return catalogAcceptedForItem(prompt, key);
  return [];
}

export function itemIsRevealed(input: {
  key: string;
  live: boolean;
  classEnded: boolean;
  attended: boolean;
  classAnswers: ExamClassAnswers;
  taskSubmittedAt: {
    1: string | null;
    2: string | null;
    3: string | null;
  };
}): boolean {
  if (input.live) return input.classAnswers[input.key]?.revealed === true;
  const task = examItemTask(input.key);
  if (!task) return false;
  if (input.classEnded && input.attended) return true;
  return Boolean(input.taskSubmittedAt[task]);
}

export type ExamScore = {
  correct: number;
  total: number;
  percent: number;
};

export function examScore(input: {
  prompt: GroupExamPrompt;
  task1: ExamTask1Answer[];
  task2: ExamTask2LetterAnswer[] | ExamTask2CorrectionAnswer[];
  task3: ExamTask3Answer[];
  classAnswers: ExamClassAnswers;
  useCatalogFallback: boolean;
}): ExamScore {
  const keys = examItemKeys(input.prompt);
  let correct = 0;
  for (const key of keys) {
    const typed = studentAnswerForItem({
      prompt: input.prompt,
      key,
      task1: input.task1,
      task2: input.task2,
      task3: input.task3,
    });
    const accepted = acceptedForItem(
      input.prompt,
      key,
      input.classAnswers,
      input.useCatalogFallback
    );
    if (examAnswerMatches(typed, accepted)) correct += 1;
  }
  const total = keys.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent };
}

export function allExamItemsChecked(
  prompt: GroupExamPrompt,
  classAnswers: ExamClassAnswers
): boolean {
  const keys = examItemKeys(prompt);
  if (keys.length === 0) return false;
  return keys.every((key) => classAnswers[key]?.revealed === true);
}

export function puntajeReachable(scorePublishedAt: string | null): boolean {
  return Boolean(scorePublishedAt);
}

export function formatExamReviewTime(
  deadlineMs: number | null,
  timeZone?: string
): string | null {
  if (deadlineMs == null) return null;
  try {
    return new Date(deadlineMs).toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    return new Date(deadlineMs).toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
}
