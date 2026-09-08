import type {
  ConversationPlan,
  ConversationPrompt,
  ConversationQuestion,
  ConversationRoundState,
  CourseLevel,
} from "@/types";

export type ConversationPromptRow = {
  id: string;
  title: string;
  level: string;
  theme: string | null;
  questions: unknown;
  created_by?: string;
  created_at: string;
};

export function isConversationPlan(value: unknown): value is ConversationPlan {
  return value === "standard" || value === "compact" || value === "open";
}

export function isConversationRoundState(
  value: unknown
): value is ConversationRoundState {
  return value === "idle" || value === "running" || value === "stopped";
}

export function parseConversationQuestions(
  raw: unknown
): ConversationQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: ConversationQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = Number(row.id);
    const question =
      typeof row.question === "string" ? row.question.trim() : "";
    if (!Number.isInteger(id) || id < 1 || !question) continue;
    questions.push({ id, question });
  }
  return questions;
}

export function mapConversationPromptRow(
  row: ConversationPromptRow
): ConversationPrompt {
  const level: CourseLevel =
    row.level === "pre-intermediate" ? "pre-intermediate" : "intermediate";
  return {
    id: row.id,
    title: row.title,
    level,
    theme: typeof row.theme === "string" && row.theme.trim() ? row.theme : null,
    questions: parseConversationQuestions(row.questions),
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
  };
}

export function serializeConversationQuestions(
  questions: ConversationQuestion[]
): { id: number; question: string }[] {
  return questions.map((row) => ({
    id: row.id,
    question: row.question,
  }));
}

export function roundTotal(plan: ConversationPlan): number {
  if (plan === "standard") return 6;
  if (plan === "compact") return 3;
  return 0;
}

export function roundLengthSeconds(
  plan: ConversationPlan,
  level: CourseLevel
): number {
  if (plan === "compact") return 600;
  if (plan === "standard") {
    return level === "pre-intermediate" ? 240 : 300;
  }
  return 0;
}

export function secondsLeft(input: {
  roundLengthSeconds: number;
  roundStartedAt: string | null;
  now?: Date;
}): number {
  if (input.roundLengthSeconds <= 0) return 0;
  if (!input.roundStartedAt) return input.roundLengthSeconds;
  const started = new Date(input.roundStartedAt).getTime();
  if (!Number.isFinite(started)) return input.roundLengthSeconds;
  const now = (input.now ?? new Date()).getTime();
  const elapsed = Math.floor((now - started) / 1000);
  return Math.max(0, input.roundLengthSeconds - elapsed);
}

export function formatRoundClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function isRoundsComplete(
  roundCurrent: number,
  plan: ConversationPlan
): boolean {
  const total = roundTotal(plan);
  return total > 0 && roundCurrent >= total + 1;
}

export function nextRoundCurrent(
  roundCurrent: number,
  plan: ConversationPlan
): number {
  const total = roundTotal(plan);
  if (total === 0) return 0;
  if (roundCurrent >= total + 1) return total + 1;
  return roundCurrent + 1;
}

export function conversationPlanLabels(
  level: CourseLevel
): { plan: ConversationPlan; label: string }[] {
  return [
    {
      plan: "standard",
      label: level === "pre-intermediate" ? "6 × 4 min" : "6 × 5 min",
    },
    { plan: "compact", label: "3 × 10 min" },
    { plan: "open", label: "Sin rondas" },
  ];
}

export function numberedQuestionList(questions: string[]): string {
  return questions
    .map((question, index) => `${index + 1}. ${question.trim()}`)
    .filter((line) => !/^\d+\.\s*$/.test(line))
    .join("\n");
}

export function appendNumberedQuestions(
  existing: string,
  questions: string[]
): string {
  const block = numberedQuestionList(questions);
  if (!block) return existing;
  const trimmed = existing.trimEnd();
  return trimmed ? `${trimmed}\n${block}` : block;
}
