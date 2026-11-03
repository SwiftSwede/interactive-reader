import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { openerOptions } from "./copy";
import { MINIMAL_PAIRS } from "./pairs";
import type { Opener, Track } from "./types";

/** Same short labels as `NIVEL` in whatsapp.ts. Top is an outcome, not a fifth track. */
const TRACK_NIVEL: Record<Track, string> = {
  beginner: "A1",
  pre_int: "A2",
  int: "B1",
  upper: "B2",
};

const TRACK_ORDER: Track[] = ["beginner", "pre_int", "int", "upper"];

const OUTCOME_LABEL: Record<(typeof OUTCOME_ORDER)[number], string> = {
  settled: "Asentado",
  top: "Tope",
  gentle: "Base",
};

const OUTCOME_ORDER = ["settled", "top", "gentle"] as const;

export const EVAL_STATS_MIN_SAMPLE = 5;
export const EVAL_STATS_ROW_CAP = 20;

export type AttemptStat = {
  status: "in_progress" | "finished" | "redirected";
  opener: Opener;
  outcome: "settled" | "top" | "gentle" | "redirected" | null;
  placedTrack: Track | null;
};

export type AnswerStat = { itemId: string; isCorrect: boolean };

export type ItemStatMeta = { id: string; prompt: string; structureName: string };

export type PairAnswerStat = { pairId: string; isCorrect: boolean };

export type CountRow = { label: string; count: number };

export type RankedRow = {
  id: string;
  label: string;
  detail: string | null;
  answers: number;
  wrong: number;
  missPercent: number;
};

export type EvalStats = {
  started: number;
  finished: number;
  redirected: number;
  open: number;
  /** finished / (finished + open). Null when nobody entered the quiz. Redirects stay out. */
  completionRate: number | null;
  tracks: CountRow[];
  outcomes: CountRow[];
  openers: CountRow[];
  questions: RankedRow[];
  sounds: RankedRow[];
};

export function rollupEvalStats(input: {
  attempts: AttemptStat[];
  answers: AnswerStat[];
  items: ItemStatMeta[];
  pairAnswers: PairAnswerStat[];
  pairLabels?: Map<string, string>;
}): EvalStats {
  const finished = input.attempts.filter((row) => row.status === "finished").length;
  const redirected = input.attempts.filter((row) => row.status === "redirected").length;
  const open = input.attempts.filter((row) => row.status === "in_progress").length;
  const quizStarts = finished + open;

  const trackCounts = new Map<Track, number>();
  const outcomeCounts = new Map<(typeof OUTCOME_ORDER)[number], number>();
  const openerCounts = new Map<Opener, number>();
  for (const attempt of input.attempts) {
    openerCounts.set(attempt.opener, (openerCounts.get(attempt.opener) ?? 0) + 1);
    if (attempt.placedTrack) {
      trackCounts.set(attempt.placedTrack, (trackCounts.get(attempt.placedTrack) ?? 0) + 1);
    }
    if (attempt.outcome === "settled" || attempt.outcome === "top" || attempt.outcome === "gentle") {
      outcomeCounts.set(attempt.outcome, (outcomeCounts.get(attempt.outcome) ?? 0) + 1);
    }
  }

  const itemMeta = new Map(input.items.map((item) => [item.id, item]));

  return {
    started: input.attempts.length,
    finished,
    redirected,
    open,
    completionRate: quizStarts === 0 ? null : Math.round((finished / quizStarts) * 100),
    tracks: TRACK_ORDER.map((track) => ({
      label: TRACK_NIVEL[track],
      count: trackCounts.get(track) ?? 0,
    })),
    outcomes: OUTCOME_ORDER.map((outcome) => ({
      label: OUTCOME_LABEL[outcome],
      count: outcomeCounts.get(outcome) ?? 0,
    })),
    openers: openerOptions.map((option) => ({
      label: option.label,
      count: openerCounts.get(option.id) ?? 0,
    })),
    questions: rankMisses(
      input.answers.map((answer) => ({ key: answer.itemId, isCorrect: answer.isCorrect })),
      (itemId) => {
        const meta = itemMeta.get(itemId);
        return {
          label: meta?.structureName ?? itemId,
          detail: meta?.prompt ?? null,
        };
      },
    ),
    sounds: rankMisses(
      input.pairAnswers.map((answer) => ({ key: answer.pairId, isCorrect: answer.isCorrect })),
      (pairId) => ({
        label: input.pairLabels?.get(pairId) ?? pairLabel(pairId),
        detail: null,
      }),
    ),
  };
}

function pairLabel(pairId: string): string {
  const pair = MINIMAL_PAIRS.find((row) => row.id === pairId);
  if (!pair) return pairId;
  return `/${pair.sounds[0]}/ y /${pair.sounds[1]}/`;
}

function rankMisses(
  answers: { key: string; isCorrect: boolean }[],
  labelFor: (key: string) => { label: string; detail: string | null },
): RankedRow[] {
  const buckets = new Map<string, { answers: number; wrong: number }>();
  for (const answer of answers) {
    const bucket = buckets.get(answer.key) ?? { answers: 0, wrong: 0 };
    bucket.answers += 1;
    if (!answer.isCorrect) bucket.wrong += 1;
    buckets.set(answer.key, bucket);
  }
  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.answers >= EVAL_STATS_MIN_SAMPLE)
    .map(([id, bucket]) => {
      const named = labelFor(id);
      return {
        id,
        label: named.label,
        detail: named.detail,
        answers: bucket.answers,
        wrong: bucket.wrong,
        missPercent: Math.round((bucket.wrong / bucket.answers) * 100),
      };
    })
    .sort((a, b) => b.missPercent - a.missPercent || b.answers - a.answers || a.id.localeCompare(b.id))
    .slice(0, EVAL_STATS_ROW_CAP);
}

const PAGE = 1000;

async function selectAll(
  client: SupabaseClient,
  table: string,
  columns: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) {
      throw new AppError("No pude leer las evaluaciones.", "EVAL_STATS_READ", 500);
    }
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

export async function loadEvalStats(client: SupabaseClient): Promise<EvalStats> {
  const [attempts, answers, items, structures, pairAnswers] = await Promise.all([
    selectAll(client, "eval_attempts", "status, opener, outcome, placed_track"),
    selectAll(client, "eval_answers", "item_id, is_correct"),
    selectAll(client, "eval_items", "id, prompt, structure_id"),
    selectAll(client, "eval_structures", "id, display_name_es"),
    selectAll(client, "eval_pair_answers", "pair_id, is_correct"),
  ]);

  const structureName = new Map(
    structures.map((row) => [String(row.id), String(row.display_name_es ?? "")]),
  );

  return rollupEvalStats({
    attempts: attempts.map((row) => ({
      status: row.status as AttemptStat["status"],
      opener: row.opener as Opener,
      outcome: (row.outcome as AttemptStat["outcome"]) ?? null,
      placedTrack: (row.placed_track as Track | null) ?? null,
    })),
    answers: answers.map((row) => ({
      itemId: String(row.item_id),
      isCorrect: Boolean(row.is_correct),
    })),
    items: items.map((row) => ({
      id: String(row.id),
      prompt: String(row.prompt ?? ""),
      structureName: structureName.get(String(row.structure_id)) || String(row.structure_id),
    })),
    pairAnswers: pairAnswers.map((row) => ({
      pairId: String(row.pair_id),
      isCorrect: Boolean(row.is_correct),
    })),
  });
}
