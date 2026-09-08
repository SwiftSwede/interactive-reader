import type {
  PresentationPrompt,
  PresentationQuestion,
  PresentationResponse,
  PresentationSegment,
  PresentationVocabItem,
} from "@/types";

export type PresentationPromptRow = {
  id: string;
  title: string;
  level: string;
  theme: string | null;
  warmup_question: string | null;
  segments: unknown;
  created_by?: string;
  created_at: string;
};

export type PresentationStepKind = "warmup" | "vocab" | "questions" | "video" | "answers" | "done";

export type PresentationStep =
  | { kind: "warmup" }
  | { kind: "vocab"; segmentId: number }
  | { kind: "questions"; segmentId: number }
  | { kind: "video"; segmentId: number }
  | { kind: "answers"; segmentId: number }
  | { kind: "done" };

const SEGMENT_KINDS = ["vocab", "questions", "video", "answers"] as const;

export function parsePresentationSegments(
  raw: unknown
): PresentationSegment[] {
  if (!Array.isArray(raw)) return [];
  const segments: PresentationSegment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = Number(row.id);
    if (!Number.isInteger(id) || id < 1) continue;
    const youtubeUrl =
      typeof row.youtube_url === "string" ? row.youtube_url.trim() : "";
    if (!youtubeUrl) continue;
    segments.push({
      id,
      youtubeUrl,
      title: typeof row.title === "string" && row.title.trim() ? row.title : null,
      vocabulary: parseVocab(row.vocabulary),
      comprehensionQuestions: parseQuestions(row.comprehension_questions),
    });
  }
  return segments.sort((a, b) => a.id - b.id);
}

function parseVocab(raw: unknown): PresentationVocabItem[] {
  if (!Array.isArray(raw)) return [];
  const items: PresentationVocabItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const english = typeof row.english === "string" ? row.english.trim() : "";
    const spanish = typeof row.spanish === "string" ? row.spanish.trim() : "";
    if (!english || !spanish) continue;
    items.push({
      english,
      spanish,
      exampleSentence:
        typeof row.example_sentence === "string" && row.example_sentence.trim()
          ? row.example_sentence
          : null,
    });
  }
  return items.sort((a, b) =>
    a.english.localeCompare(b.english, "en", { sensitivity: "base" })
  );
}

function parseQuestions(raw: unknown): PresentationQuestion[] {
  if (!Array.isArray(raw)) return [];
  const items: PresentationQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = Number(row.id);
    const question = typeof row.question === "string" ? row.question.trim() : "";
    const answer = typeof row.answer === "string" ? row.answer.trim() : "";
    if (!Number.isInteger(id) || id < 1 || !question || !answer) continue;
    items.push({ id, question, answer });
  }
  return items;
}

export function mapPresentationPromptRow(
  row: PresentationPromptRow
): PresentationPrompt {
  return {
    id: row.id,
    title: row.title,
    level: "intermediate",
    theme: row.theme,
    warmupQuestion: row.warmup_question,
    segments: parsePresentationSegments(row.segments),
    createdAt: row.created_at,
  };
}

export const PRESENTATION_STEP_EVENT = "step";

export function presentationStepChannelName(sessionId: string): string {
  return `presentation-step-${sessionId}`;
}

export function encodePresentationStep(step: PresentationStep): string {
  if (step.kind === "warmup") return "warmup";
  if (step.kind === "done") return "done";
  return `${step.segmentId}:${step.kind}`;
}

/** Apply a remote step only when the payload actually carries one. */
export function remotePresentationStep(
  value: unknown,
  prompt: Pick<PresentationPrompt, "warmupQuestion" | "segments">
): PresentationStep | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return parsePresentationStep(value, prompt);
}

export function parsePresentationStep(
  value: string | null | undefined,
  prompt: Pick<PresentationPrompt, "warmupQuestion" | "segments">
): PresentationStep {
  const steps = presentationStepList(prompt);
  if (!value) return steps[0] ?? { kind: "done" };
  const parsed = decodePresentationStep(value);
  if (parsed && stepExists(parsed, prompt)) return parsed;
  return steps[0] ?? { kind: "done" };
}

export function decodePresentationStep(
  value: string
): PresentationStep | null {
  const trimmed = value.trim();
  if (trimmed === "warmup") return { kind: "warmup" };
  if (trimmed === "done") return { kind: "done" };
  const [idRaw, kindRaw] = trimmed.split(":");
  const segmentId = Number(idRaw);
  if (!Number.isInteger(segmentId) || segmentId < 1) return null;
  if (
    kindRaw !== "vocab" &&
    kindRaw !== "questions" &&
    kindRaw !== "video" &&
    kindRaw !== "answers"
  ) {
    return null;
  }
  return { kind: kindRaw, segmentId };
}

export function presentationStepList(
  prompt: Pick<PresentationPrompt, "warmupQuestion" | "segments">
): PresentationStep[] {
  const steps: PresentationStep[] = [];
  if (prompt.warmupQuestion?.trim()) {
    steps.push({ kind: "warmup" });
  }
  for (const segment of prompt.segments) {
    for (const kind of SEGMENT_KINDS) {
      steps.push({ kind, segmentId: segment.id });
    }
  }
  steps.push({ kind: "done" });
  return steps;
}

export function defaultPresentationStep(
  prompt: Pick<PresentationPrompt, "warmupQuestion" | "segments">
): PresentationStep {
  return presentationStepList(prompt)[0] ?? { kind: "done" };
}

function stepExists(
  step: PresentationStep,
  prompt: Pick<PresentationPrompt, "warmupQuestion" | "segments">
): boolean {
  return presentationStepList(prompt).some(
    (item) => encodePresentationStep(item) === encodePresentationStep(step)
  );
}

export function adjacentPresentationStep(
  current: PresentationStep,
  prompt: Pick<PresentationPrompt, "warmupQuestion" | "segments">,
  direction: -1 | 1
): PresentationStep | null {
  const steps = presentationStepList(prompt);
  const index = steps.findIndex(
    (item) => encodePresentationStep(item) === encodePresentationStep(current)
  );
  if (index < 0) return null;
  return steps[index + direction] ?? null;
}

export function segmentCycleIndex(step: PresentationStep): number {
  if (step.kind === "vocab") return 0;
  if (step.kind === "questions") return 1;
  if (step.kind === "video") return 2;
  if (step.kind === "answers") return 3;
  return -1;
}

export function cycleKindAt(index: number): PresentationStepKind | null {
  return SEGMENT_KINDS[index] ?? null;
}

export function presentationStepLabel(step: PresentationStep): string {
  if (step.kind === "warmup") return "Inicio";
  if (step.kind === "vocab") return "Vocabulario";
  if (step.kind === "questions") return "Preguntas";
  if (step.kind === "video") return "Video";
  if (step.kind === "answers") return "Respuestas";
  return "Listo";
}

export function vocabNoteKey(segmentId: number, english: string): string {
  return `${segmentId}:${english}`;
}

export function stripPresentationText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function serializePresentationSegments(
  segments: PresentationSegment[]
): unknown[] {
  return segments.map((segment) => ({
    id: segment.id,
    youtube_url: segment.youtubeUrl,
    title: segment.title,
    vocabulary: segment.vocabulary.map((item) => ({
      english: item.english,
      spanish: item.spanish,
      example_sentence: item.exampleSentence,
    })),
    comprehension_questions: segment.comprehensionQuestions.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
    })),
  }));
}

export const PRESENTATION_ANSWER_EVENT = "answer";

export function presentationAnswerChannelName(sessionId: string): string {
  return `presentation-answers-${sessionId}`;
}

export type PresentationClassAnswer = {
  segmentId: number;
  questionId: number;
  text: string;
  ready: boolean;
};

export type PresentationResponseRow = {
  id: string;
  presentation_prompt_id: string;
  user_id: string;
  course_session_id: string | null;
  segment_id: number;
  question_id: number;
  response_text: string | null;
  revealed_answer: boolean;
  revealed_at: string | null;
  submitted_at: string;
};

export function mapPresentationResponseRow(
  row: PresentationResponseRow
): PresentationResponse {
  return {
    id: row.id,
    presentationPromptId: row.presentation_prompt_id,
    userId: row.user_id,
    courseSessionId: row.course_session_id,
    segmentId: row.segment_id,
    questionId: row.question_id,
    responseText: row.response_text ?? "",
    revealedAnswer: row.revealed_answer,
    revealedAt: row.revealed_at,
    submittedAt: row.submitted_at,
  };
}

export function classAnswerFromResponse(
  row: Pick<
    PresentationResponse,
    "segmentId" | "questionId" | "responseText" | "revealedAnswer"
  >
): PresentationClassAnswer {
  return {
    segmentId: row.segmentId,
    questionId: row.questionId,
    text: row.responseText,
    ready: row.revealedAnswer,
  };
}

export function classAnswerForQuestion(
  answers: PresentationClassAnswer[],
  segmentId: number,
  questionId: number
): PresentationClassAnswer | null {
  return (
    answers.find(
      (item) => item.segmentId === segmentId && item.questionId === questionId
    ) ?? null
  );
}

export function upsertClassAnswer(
  answers: PresentationClassAnswer[],
  next: PresentationClassAnswer
): PresentationClassAnswer[] {
  return [
    ...answers.filter(
      (item) =>
        !(item.segmentId === next.segmentId && item.questionId === next.questionId)
    ),
    next,
  ];
}
