import type {
  CourseLevel,
  ExamCorrectionItem,
  ExamFillSentence,
  ExamFillSlot,
  ExamParagraphItem,
  ExamTask2Type,
  ExamTranslationItem,
  ExamVocabItem,
  GroupExamPrompt,
} from "@/types";

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
    const correctPosition = trimmed.slice(0, pipe).trim().toUpperCase();
    const sentence = trimmed.slice(pipe + 1).trim();
    if (!/^[A-H]$/.test(correctPosition) || !sentence) continue;
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
    error = "Tarea 2: al menos 3 oraciones. Formato: A | The first sentence.";
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
    timeLimitMinutes: input.timeLimitMinutes || 35,
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
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
