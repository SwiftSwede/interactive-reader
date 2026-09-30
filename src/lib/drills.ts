import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseLevel } from "@/types";
import { AppError } from "@/lib/errors";
import type { DrillLevel } from "@/lib/parse-drill-content";

export type { DrillLevel };

export const DAY_MS = 24 * 60 * 60 * 1000;
export const SPACING = [2 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS] as const;
export const CLEAN_RECALLS_TO_GRADUATE = 3;
export const DECK_SIZE = 6;

export type DrillFormat = "teach" | "cloze" | "translation" | "order";
export type DrillTagType = "grammar" | "phonetic" | "error";
export type DrillItemStatus = "learning" | "graduated";

export type DrillItem = {
  id: string;
  tagType: DrillTagType;
  tagId: string;
  format: DrillFormat;
  level: DrillLevel;
  content: Record<string, unknown>;
  active: boolean;
  createdAt: string;
};

export type DrillItemState = {
  id: string | null;
  userId: string;
  itemId: string;
  rounds: number;
  cleanRecalls: number;
  mcqUsed: boolean;
  lastPracticedAt: string | null;
  nextPracticeAt: string | null;
  status: DrillItemStatus;
  graduatedAt: string | null;
  updatedAt: string;
};

export type BuildDeckInput = {
  missionTagId: string;
  items: readonly DrillItem[];
  state: ReadonlyMap<string, DrillItemState>;
  now: Date;
  level: DrillLevel;
};

const FORMAT_ORDER: Record<DrillFormat, number> = {
  teach: 0,
  cloze: 1,
  translation: 2,
  order: 3,
};

export const STATE_COLUMNS =
  "id, user_id, item_id, rounds, clean_recalls, mcq_used, last_practiced_at, next_practice_at, status, graduated_at, updated_at";

export const ITEM_COLUMNS =
  "id, tag_type, tag_id, format, level, content, active, created_at";

export type StateRow = {
  id: string;
  user_id: string;
  item_id: string;
  rounds: number;
  clean_recalls: number;
  mcq_used: boolean;
  last_practiced_at: string | null;
  next_practice_at: string | null;
  status: string;
  graduated_at: string | null;
  updated_at: string;
};

export function toDrillLevel(courseLevel: CourseLevel): DrillLevel {
  return courseLevel === "pre-intermediate" ? "pre_int" : "int";
}

export function nextPracticeAt(stage: number, from: Date): Date {
  const index = Math.min(Math.max(stage, 0), SPACING.length - 1);
  return new Date(from.getTime() + SPACING[index]!);
}

export function emptyDrillItemState(
  userId: string,
  itemId: string,
  now: Date,
): DrillItemState {
  return {
    id: null,
    userId,
    itemId,
    rounds: 0,
    cleanRecalls: 0,
    mcqUsed: false,
    lastPracticedAt: null,
    nextPracticeAt: null,
    status: "learning",
    graduatedAt: null,
    updatedAt: now.toISOString(),
  };
}

export function applyResult(
  state: DrillItemState,
  result: { correct: boolean },
  now: Date,
): DrillItemState {
  const rounds = state.rounds + 1;
  const mcqUsed = state.mcqUsed || state.rounds === 0;
  const updatedAt = now.toISOString();
  const lastPracticedAt = now.toISOString();

  if (!result.correct) {
    return {
      ...state,
      rounds,
      cleanRecalls: 0,
      mcqUsed,
      lastPracticedAt,
      nextPracticeAt: nextPracticeAt(0, now).toISOString(),
      updatedAt,
    };
  }

  const cleanRecalls = state.cleanRecalls + 1;
  const justGraduated =
    cleanRecalls >= CLEAN_RECALLS_TO_GRADUATE && state.status !== "graduated";
  const status: DrillItemStatus =
    state.status === "graduated" || cleanRecalls >= CLEAN_RECALLS_TO_GRADUATE
      ? "graduated"
      : "learning";

  return {
    ...state,
    rounds,
    cleanRecalls,
    mcqUsed,
    lastPracticedAt,
    nextPracticeAt: nextPracticeAt(cleanRecalls - 1, now).toISOString(),
    status,
    graduatedAt: justGraduated ? now.toISOString() : state.graduatedAt,
    updatedAt,
  };
}

function isEligible(item: DrillItem, level: DrillLevel): boolean {
  if (!item.active) return false;
  if (item.format === "order") return false;
  if (item.format === "teach") return true;
  return item.level === level;
}

function byLadder(a: DrillItem, b: DrillItem): number {
  const format = FORMAT_ORDER[a.format] - FORMAT_ORDER[b.format];
  if (format !== 0) return format;
  const created = a.createdAt.localeCompare(b.createdAt);
  if (created !== 0) return created;
  return a.id.localeCompare(b.id);
}

function isDueOrUnscheduled(
  item: DrillItem,
  state: ReadonlyMap<string, DrillItemState>,
  now: Date,
): boolean {
  const row = state.get(item.id);
  if (!row) return item.format !== "teach";
  if (row.nextPracticeAt) return new Date(row.nextPracticeAt) <= now;
  return row.status !== "graduated";
}

function isDueGraduatedRepaso(
  item: DrillItem,
  missionTagId: string,
  state: ReadonlyMap<string, DrillItemState>,
  now: Date,
): boolean {
  if (item.tagId === missionTagId) return false;
  const row = state.get(item.id);
  if (!row || row.status !== "graduated" || !row.nextPracticeAt) return false;
  return new Date(row.nextPracticeAt) <= now;
}

export function buildDeck(input: BuildDeckInput): DrillItem[] {
  const eligible = input.items.filter((item) => isEligible(item, input.level));
  const missionItems = eligible
    .filter((item) => item.tagId === input.missionTagId)
    .sort(byLadder);
  const isSession1 = !missionItems.some((item) => input.state.has(item.id));

  if (isSession1) return missionItems.slice(0, DECK_SIZE);

  const dueMission = missionItems.filter((item) =>
    isDueOrUnscheduled(item, input.state, input.now),
  );
  const remaining = DECK_SIZE - dueMission.length;
  if (remaining <= 0) return dueMission.slice(0, DECK_SIZE);

  const repaso = eligible
    .filter((item) =>
      isDueGraduatedRepaso(item, input.missionTagId, input.state, input.now),
    )
    .sort((a, b) => {
      const aAt = input.state.get(a.id)?.nextPracticeAt ?? "";
      const bAt = input.state.get(b.id)?.nextPracticeAt ?? "";
      const byDue = aAt.localeCompare(bAt);
      if (byDue !== 0) return byDue;
      return a.id.localeCompare(b.id);
    })
    .slice(0, remaining);

  return [...dueMission, ...repaso];
}

function normalizeAnswer(value: string): string {
  return value
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]$/, "")
    .trim()
    .toLocaleLowerCase("en");
}

/** The stored answer for cloze and translation items, or null. */
export function storedAnswer(item: DrillItem): string | null {
  if (item.format !== "cloze" && item.format !== "translation") return null;
  const answer = item.content.answer;
  return typeof answer === "string" && answer.trim() ? answer : null;
}

/**
 * Case, spacing, curly apostrophes, and one final . ? ! do not count.
 * A different word does. Translations accept any " / " alternate.
 */
export function isCorrectAnswer(item: DrillItem, answer: string): boolean {
  const expected = storedAnswer(item);
  if (!expected) return false;
  const given = normalizeAnswer(answer);
  if (!given) return false;
  const accepted =
    item.format === "translation" ? expected.split(" / ") : [expected];
  return accepted.some((option) => normalizeAnswer(option) === given);
}

export type ItemRow = {
  id: string;
  tag_type: string;
  tag_id: string;
  format: string;
  level: string;
  content: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
};

const DRILL_FORMATS: readonly DrillFormat[] = ["teach", "cloze", "translation", "order"];
const DRILL_TAG_TYPES: readonly DrillTagType[] = ["grammar", "phonetic", "error"];

/** Null for a row whose format or family this engine does not know. */
export function mapItemRow(row: ItemRow): DrillItem | null {
  const format = DRILL_FORMATS.find((value) => value === row.format);
  const tagType = DRILL_TAG_TYPES.find((value) => value === row.tag_type);
  if (!format || !tagType) return null;
  return {
    id: row.id,
    tagType,
    tagId: row.tag_id,
    format,
    level: row.level === "pre_int" ? "pre_int" : "int",
    content: row.content ?? {},
    active: row.active,
    createdAt: row.created_at,
  };
}

export function mapStateRow(row: StateRow): DrillItemState {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    rounds: row.rounds,
    cleanRecalls: row.clean_recalls,
    mcqUsed: row.mcq_used,
    lastPracticedAt: row.last_practiced_at,
    nextPracticeAt: row.next_practice_at,
    status: row.status === "graduated" ? "graduated" : "learning",
    graduatedAt: row.graduated_at,
    updatedAt: row.updated_at,
  };
}

async function appendDrillEvent(
  adminClient: SupabaseClient,
  row: {
    userId: string;
    eventType: "drill_attempt" | "drill_item_graduated";
    detail: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await adminClient.from("learning_events").insert({
    user_id: row.userId,
    event_type: row.eventType,
    course_session_id: null,
    detail: row.detail,
  });

  if (error) {
    console.error(`${row.eventType} event failed:`, error.message);
    throw new AppError("No pude registrar la práctica.", "DRILL_EVENT_FAILED", 500);
  }
}

export async function recordDrillAttempt(
  adminClient: SupabaseClient,
  input: { userId: string; itemId: string; correct: boolean },
  now = new Date(),
): Promise<DrillItemState> {
  const { data, error } = await adminClient
    .from("drill_item_state")
    .select(STATE_COLUMNS)
    .eq("user_id", input.userId)
    .eq("item_id", input.itemId)
    .maybeSingle();

  if (error) {
    console.error("drill_item_state read failed:", error.message);
    throw new AppError("No pude leer la práctica.", "DRILL_STATE_READ_FAILED", 500);
  }

  const previous = data
    ? mapStateRow(data as StateRow)
    : emptyDrillItemState(input.userId, input.itemId, now);
  const next = applyResult(previous, { correct: input.correct }, now);
  const justGraduated =
    previous.status !== "graduated" && next.status === "graduated";

  const payload = {
    user_id: next.userId,
    item_id: next.itemId,
    rounds: next.rounds,
    clean_recalls: next.cleanRecalls,
    mcq_used: next.mcqUsed,
    last_practiced_at: next.lastPracticedAt,
    next_practice_at: next.nextPracticeAt,
    status: next.status,
    graduated_at: next.graduatedAt,
    updated_at: next.updatedAt,
  };

  const { data: saved, error: writeError } = next.id
    ? await adminClient
        .from("drill_item_state")
        .update(payload)
        .eq("id", next.id)
        .eq("user_id", input.userId)
        .select(STATE_COLUMNS)
        .single()
    : await adminClient
        .from("drill_item_state")
        .insert(payload)
        .select(STATE_COLUMNS)
        .single();

  if (writeError || !saved) {
    console.error("drill_item_state write failed:", writeError?.message);
    throw new AppError("No pude guardar la práctica.", "DRILL_STATE_WRITE_FAILED", 500);
  }

  const stored = mapStateRow(saved as StateRow);

  await appendDrillEvent(adminClient, {
    userId: input.userId,
    eventType: "drill_attempt",
    detail: { item_id: input.itemId, correct: input.correct },
  });

  if (justGraduated) {
    await appendDrillEvent(adminClient, {
      userId: input.userId,
      eventType: "drill_item_graduated",
      detail: { item_id: input.itemId },
    });
  }

  return stored;
}
