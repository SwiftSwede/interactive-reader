import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { SessionType } from "@/lib/activities";
import { evaluacionConfig } from "./config";
import {
  drawConfirmationPass,
  drawPlacementPass,
  hasServableBank,
  indexBank,
  servableStatuses,
  type BankIndex,
} from "./draw";
import { computeHoles, finalStep, planNext, trackForOpener } from "./engine";
import { buildResult } from "./result";
import {
  NO_SE_OPTION_ID,
  type AnswerRecord,
  type EgpLevel,
  type EvalItem,
  type EvalOption,
  type EvalStructure,
  type ItemFormat,
  type ItemRole,
  type ItemStatus,
  type JourneyPass,
  type Opener,
  type Outcome,
  type Track,
} from "./types";
import { currentItemId, questionView, type EvalView } from "./view";

export type EvalEnv = { nodeEnv?: string; includeDrafts?: string };

type AttemptRow = {
  id: string;
  seed: number;
  status: "in_progress" | "finished" | "redirected";
  journey: JourneyPass[];
  outcome: Outcome | "redirected" | null;
  placed_track: Track | null;
  email: string | null;
};

type Bank = {
  index: BankIndex;
  itemsById: Map<string, EvalItem>;
  structuresById: Map<string, EvalStructure>;
};

type Context = { client: SupabaseClient; bank: Bank; env: EvalEnv };

const ATTEMPT_COLUMNS = "id, seed, status, journey, outcome, placed_track, email";

function evalError(code: string, statusCode: number, message: string): AppError {
  return new AppError(message, code, statusCode);
}

function showDraftBadge(env: EvalEnv): boolean {
  return env.nodeEnv !== "production";
}

/** Approvals in Supabase show up within a minute; every answer no longer re-reads 180 rows. */
const BANK_CACHE_MS = 60_000;
let bankCache: { bank: Bank; loadedAt: number } | null = null;

async function loadBank(client: SupabaseClient): Promise<Bank> {
  if (bankCache && Date.now() - bankCache.loadedAt < BANK_CACHE_MS) return bankCache.bank;
  const bank = await readBank(client);
  bankCache = { bank, loadedAt: Date.now() };
  return bank;
}

async function readBank(client: SupabaseClient): Promise<Bank> {
  const [structuresRes, itemsRes] = await Promise.all([
    client
      .from("eval_structures")
      .select("id, track, kind, display_name_es, egp_ref, egp_level, l1_focus, class_type, position"),
    client
      .from("eval_items")
      .select("id, structure_id, role, format, prompt, options, correct_option_id, rule_text, status"),
  ]);
  if (structuresRes.error || itemsRes.error) {
    throw evalError("EVAL_BANK_READ", 500, "Could not read the evaluation bank");
  }

  const structures: EvalStructure[] = (structuresRes.data ?? []).map((row) => ({
    id: row.id as string,
    track: row.track as Track,
    kind: row.kind as EvalStructure["kind"],
    displayNameEs: row.display_name_es as string,
    egpRef: (row.egp_ref as string | null) ?? null,
    egpLevel: row.egp_level as EgpLevel,
    l1Focus: Boolean(row.l1_focus),
    classType: row.class_type as SessionType,
    position: row.position as number,
  }));
  const items: EvalItem[] = (itemsRes.data ?? []).map((row) => ({
    id: row.id as string,
    structureId: row.structure_id as string,
    role: row.role as ItemRole,
    format: row.format as ItemFormat,
    prompt: row.prompt as string,
    options: row.options as EvalOption[],
    correctOptionId: row.correct_option_id as string,
    ruleText: row.rule_text as string,
    status: row.status as ItemStatus,
  }));

  return {
    index: indexBank(structures, items),
    itemsById: new Map(items.map((item) => [item.id, item])),
    structuresById: new Map(structures.map((structure) => [structure.id, structure])),
  };
}

function toAttempt(row: Record<string, unknown>): AttemptRow {
  return {
    id: row.id as string,
    seed: row.seed as number,
    status: row.status as AttemptRow["status"],
    journey: Array.isArray(row.journey) ? (row.journey as JourneyPass[]) : [],
    outcome: (row.outcome as AttemptRow["outcome"]) ?? null,
    placed_track: (row.placed_track as Track | null) ?? null,
    email: (row.email as string | null) ?? null,
  };
}

async function latestAttempt(
  client: SupabaseClient,
  tokenHash: string,
): Promise<AttemptRow | null> {
  const { data, error } = await client
    .from("eval_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("token_hash", tokenHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw evalError("EVAL_ATTEMPT_READ", 500, "Could not read the attempt");
  return data ? toAttempt(data) : null;
}

async function loadAnswers(
  client: SupabaseClient,
  attemptId: string,
): Promise<Map<string, AnswerRecord>> {
  const { data, error } = await client
    .from("eval_answers")
    .select("item_id, selected_option_id, is_correct")
    .eq("attempt_id", attemptId);
  if (error) throw evalError("EVAL_ANSWER_READ", 500, "Could not read answers");
  return new Map(
    (data ?? []).map((row) => [
      row.item_id as string,
      {
        itemId: row.item_id as string,
        selectedOptionId: row.selected_option_id as string,
        isCorrect: Boolean(row.is_correct),
      },
    ]),
  );
}

/** Items from earlier attempts on this device or under any email it has given. */
async function seenItemIds(
  client: SupabaseClient,
  tokenHash: string,
  excludeAttemptId: string | null,
): Promise<Set<string>> {
  const byToken = await client
    .from("eval_attempts")
    .select("id, journey, email")
    .eq("token_hash", tokenHash);
  if (byToken.error) throw evalError("EVAL_SEEN_READ", 500, "Could not read past attempts");

  const rows = [...(byToken.data ?? [])];
  const emails = [...new Set(rows.map((row) => row.email as string | null).filter(Boolean))];
  if (emails.length > 0) {
    const byEmail = await client
      .from("eval_attempts")
      .select("id, journey, email")
      .in("email", emails as string[]);
    if (byEmail.error) throw evalError("EVAL_SEEN_READ", 500, "Could not read past attempts");
    rows.push(...(byEmail.data ?? []));
  }

  const seen = new Set<string>();
  for (const row of rows) {
    if (row.id === excludeAttemptId || !Array.isArray(row.journey)) continue;
    for (const pass of row.journey as JourneyPass[]) {
      for (const itemId of pass.itemIds ?? []) seen.add(itemId);
    }
  }
  return seen;
}

function resultView(ctx: Context, attempt: AttemptRow, answers: Map<string, AnswerRecord>): EvalView {
  const outcome = attempt.outcome;
  if (!outcome || outcome === "redirected" || !attempt.placed_track) {
    throw evalError("EVAL_RESULT_MISSING", 500, "Finished attempt has no outcome");
  }
  return {
    screen: "result",
    result: buildResult({
      journey: attempt.journey,
      answers,
      itemsById: ctx.bank.itemsById,
      structuresById: ctx.bank.structuresById,
      outcome,
      placedTrack: attempt.placed_track,
    }),
    emailCaptured: Boolean(attempt.email),
  };
}

function inProgressView(
  ctx: Context,
  attempt: AttemptRow,
  answers: Map<string, AnswerRecord>,
): EvalView {
  const view = questionView({
    journey: attempt.journey,
    answers,
    itemsById: ctx.bank.itemsById,
    seed: attempt.seed,
    showDraftBadge: showDraftBadge(ctx.env),
  });
  if (!view) throw evalError("EVAL_STUCK", 500, "Attempt has no next item");
  return view;
}

async function finishAttempt(
  ctx: Context,
  attempt: AttemptRow,
  answers: Map<string, AnswerRecord>,
  outcome: Outcome,
  placedTrack: Track,
): Promise<EvalView> {
  const now = new Date().toISOString();
  const { error } = await ctx.client
    .from("eval_attempts")
    .update({
      status: "finished",
      outcome,
      placed_track: placedTrack,
      journey: attempt.journey,
      finished_at: now,
      updated_at: now,
    })
    .eq("id", attempt.id);
  if (error) throw evalError("EVAL_FINISH", 500, "Could not finish the attempt");

  const holes = computeHoles(attempt.journey, answers, ctx.bank.itemsById);
  if (holes.size > 0) {
    const { error: tagError } = await ctx.client.from("eval_error_tags").upsert(
      [...holes].map(([structureId, status]) => ({
        attempt_id: attempt.id,
        structure_id: structureId,
        status,
      })),
      { onConflict: "attempt_id,structure_id" },
    );
    if (tagError) console.error("evaluacion: could not save error tags", attempt.id, tagError.message);
  }

  return resultView(
    ctx,
    { ...attempt, status: "finished", outcome, placed_track: placedTrack },
    answers,
  );
}

async function saveJourney(ctx: Context, attempt: AttemptRow): Promise<void> {
  const { error } = await ctx.client
    .from("eval_attempts")
    .update({ journey: attempt.journey, updated_at: new Date().toISOString() })
    .eq("id", attempt.id);
  if (error) throw evalError("EVAL_JOURNEY", 500, "Could not save progress");
}

/** Called once the current pass is fully answered. */
async function advance(
  ctx: Context,
  attempt: AttemptRow,
  answers: Map<string, AnswerRecord>,
  tokenHash: string,
): Promise<EvalView> {
  const { bank } = ctx;
  const servable = servableStatuses(ctx.env);
  const step = planNext({
    journey: attempt.journey,
    answers,
    itemsById: bank.itemsById,
    structuresById: bank.structuresById,
  });

  if (step.type === "continue") return inProgressView(ctx, attempt, answers);
  if (step.type === "finish") {
    return finishAttempt(ctx, attempt, answers, step.outcome, step.placedTrack);
  }

  const seen = await seenItemIds(ctx.client, tokenHash, attempt.id);
  for (const pass of attempt.journey) for (const itemId of pass.itemIds) seen.add(itemId);

  if (step.type === "placement") {
    const itemIds = drawPlacementPass(bank.index, step.track, servable, seen);
    if (itemIds.length === 0) {
      const current = attempt.journey[attempt.journey.length - 1];
      return step.transition === "promote"
        ? finishAttempt(ctx, attempt, answers, "settled", current.track)
        : finishAttempt(ctx, attempt, answers, "gentle", step.track);
    }
    attempt.journey = [...attempt.journey, { kind: "placement", track: step.track, itemIds }];
    await saveJourney(ctx, attempt);
    return inProgressView(ctx, attempt, answers);
  }

  const itemIds = drawConfirmationPass(bank.index, step.structureIds, servable, seen);
  if (itemIds.length === 0) {
    const final = finalStep(attempt.journey, answers, bank.itemsById);
    return finishAttempt(ctx, attempt, answers, final.outcome, final.placedTrack);
  }
  attempt.journey = [...attempt.journey, { kind: "confirmation", track: step.track, itemIds }];
  await saveJourney(ctx, attempt);
  return inProgressView(ctx, attempt, answers);
}

export async function getEvaluacionView(
  client: SupabaseClient,
  args: { tokenHash: string | null; env: EvalEnv },
): Promise<EvalView | null> {
  if (!args.tokenHash) return null;
  const attempt = await latestAttempt(client, args.tokenHash);
  if (!attempt || attempt.status === "redirected") return null;

  const [bank, answers] = await Promise.all([loadBank(client), loadAnswers(client, attempt.id)]);
  const ctx: Context = { client, bank, env: args.env };
  if (attempt.status === "finished") return resultView(ctx, attempt, answers);
  if (currentItemId(attempt.journey, answers)) return inProgressView(ctx, attempt, answers);
  return advance(ctx, attempt, answers, args.tokenHash);
}

export async function startEvaluacion(
  client: SupabaseClient,
  args: { tokenHash: string; ipHash: string | null; opener: Opener; env: EvalEnv },
): Promise<EvalView> {
  if (args.ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await client
      .from("eval_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", args.ipHash)
      .gte("created_at", since);
    if (error) throw evalError("EVAL_RATE_READ", 500, "Could not check the rate limit");
    if ((count ?? 0) >= evaluacionConfig.startsPerIpPerHour) {
      throw evalError("EVAL_RATE_LIMITED", 429, "Too many attempts from this network");
    }
  }

  const base = {
    token_hash: args.tokenHash,
    ip_hash: args.ipHash,
    opener: args.opener,
    seed: randomInt(0, 2 ** 31 - 1),
  };

  const track = trackForOpener(args.opener);
  if (!track) {
    const { error } = await client
      .from("eval_attempts")
      .insert({ ...base, status: "redirected", outcome: "redirected", finished_at: new Date().toISOString() });
    if (error) throw evalError("EVAL_START", 500, "Could not save the attempt");
    return { screen: "redirected", url: evaluacionConfig.beginnerRedirectUrl };
  }

  const servable = servableStatuses(args.env);
  const [bank, seen] = await Promise.all([
    loadBank(client),
    seenItemIds(client, args.tokenHash, null),
  ]);
  if (!hasServableBank(bank.index, servable)) {
    throw evalError("EVAL_UNAVAILABLE", 503, "No servable items");
  }
  const itemIds = drawPlacementPass(bank.index, track, servable, seen);
  if (itemIds.length === 0) throw evalError("EVAL_UNAVAILABLE", 503, "No servable items");

  const journey: JourneyPass[] = [{ kind: "placement", track, itemIds }];
  const { data, error } = await client
    .from("eval_attempts")
    .insert({ ...base, journey })
    .select(ATTEMPT_COLUMNS)
    .single();
  if (error || !data) throw evalError("EVAL_START", 500, "Could not save the attempt");

  return inProgressView({ client, bank, env: args.env }, toAttempt(data), new Map());
}

export async function answerEvaluacion(
  client: SupabaseClient,
  args: { tokenHash: string; itemId: string; optionId: string; env: EvalEnv },
): Promise<EvalView> {
  const attempt = await latestAttempt(client, args.tokenHash);
  if (!attempt || attempt.status === "redirected") {
    throw evalError("EVAL_NO_ATTEMPT", 404, "No attempt in progress");
  }
  const [bank, answers] = await Promise.all([loadBank(client), loadAnswers(client, attempt.id)]);
  const ctx: Context = { client, bank, env: args.env };

  if (attempt.status === "finished") return resultView(ctx, attempt, answers);
  const resume = (current: Map<string, AnswerRecord>) =>
    currentItemId(attempt.journey, current)
      ? inProgressView(ctx, attempt, current)
      : advance(ctx, attempt, current, args.tokenHash);
  // A double tap or a stale tab: show what is current, not what was sent.
  if (answers.has(args.itemId)) return resume(answers);

  const expected = currentItemId(attempt.journey, answers);
  if (!expected) return resume(answers);
  if (expected !== args.itemId) {
    throw evalError("EVAL_OUT_OF_ORDER", 409, "That is not the current question");
  }

  const item = bank.itemsById.get(args.itemId);
  if (!item) throw evalError("EVAL_ITEM_MISSING", 409, "That question is gone");
  const validOption =
    args.optionId === NO_SE_OPTION_ID || item.options.some((option) => option.id === args.optionId);
  if (!validOption) throw evalError("EVAL_INVALID_OPTION", 422, "Unknown option");

  const record: AnswerRecord = {
    itemId: item.id,
    selectedOptionId: args.optionId,
    isCorrect: args.optionId === item.correctOptionId,
  };
  const { error } = await client.from("eval_answers").insert({
    attempt_id: attempt.id,
    item_id: item.id,
    pass_index: attempt.journey.length - 1,
    selected_option_id: record.selectedOptionId,
    is_correct: record.isCorrect,
  });
  if (error) {
    if (error.code === "23505") return resume(await loadAnswers(client, attempt.id));
    throw evalError("EVAL_ANSWER_SAVE", 500, "Could not save the answer");
  }
  answers.set(item.id, record);
  return resume(answers);
}

/** Email goes on the latest finished attempt. MailerLite stays a stub (config flag). */
export async function captureEvaluacionEmail(
  client: SupabaseClient,
  args: { tokenHash: string; email: string },
): Promise<void> {
  const attempt = await latestAttempt(client, args.tokenHash);
  if (!attempt || attempt.status !== "finished") {
    throw evalError("EVAL_NO_RESULT", 404, "No finished attempt");
  }
  const now = new Date().toISOString();
  const { error } = await client
    .from("eval_attempts")
    .update({ email: args.email, email_captured_at: now, updated_at: now })
    .eq("id", attempt.id);
  if (error) throw evalError("EVAL_EMAIL_SAVE", 500, "Could not save the email");
}
