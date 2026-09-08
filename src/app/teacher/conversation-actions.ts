"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import {
  isConversationPlan,
  nextRoundCurrent,
  roundLengthSeconds,
  roundTotal,
} from "@/lib/conversation";
import type {
  ConversationPlan,
  ConversationRoundState,
  CourseLevel,
} from "@/types";

export type ConversationRoundSnapshot = {
  conversationPlan: ConversationPlan;
  roundCurrent: number;
  roundState: ConversationRoundState;
  roundStartedAt: string | null;
};

export type ConversationActionResult =
  | ({ ok: true } & ConversationRoundSnapshot)
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const elapsedSchema = z.number().int().min(0).max(3600);

type RoundRow = {
  id: string;
  course_id: string;
  session_type: string;
  conversation_prompt_id: string | null;
  conversation_plan: string | null;
  round_current: number | null;
  round_state: string | null;
  round_started_at: string | null;
};

async function teacherConversationContext(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Tienes que entrar con tu email." };
  }
  const profile = await getProfile(user.id);
  if (profile?.role !== "teacher") {
    return { ok: false as const, error: "Solo el profe puede hacer eso." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select(
      "id, course_id, session_type, conversation_prompt_id, conversation_plan, round_current, round_state, round_started_at"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (
    !session ||
    session.session_type !== "conversation" ||
    !session.conversation_prompt_id
  ) {
    return { ok: false as const, error: "No encontré esa conversación." };
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, teacher_id, level")
    .eq("id", session.course_id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!course) {
    return { ok: false as const, error: "Esa clase no es tuya." };
  }

  const plan: ConversationPlan = isConversationPlan(session.conversation_plan)
    ? session.conversation_plan
    : "standard";
  const level: CourseLevel =
    course.level === "pre-intermediate" ? "pre-intermediate" : "intermediate";

  const roundState: ConversationRoundState =
    session.round_state === "running" || session.round_state === "stopped"
      ? session.round_state
      : "idle";

  return {
    ok: true as const,
    supabase,
    session: session as RoundRow,
    plan,
    level,
    roundCurrent: session.round_current ?? 0,
    roundState,
  };
}

function snapshot(
  plan: ConversationPlan,
  roundCurrent: number,
  roundState: ConversationRoundState,
  roundStartedAt: string | null
): ConversationRoundSnapshot {
  return {
    conversationPlan: plan,
    roundCurrent,
    roundState,
    roundStartedAt,
  };
}

export async function setConversationPlan(input: {
  sessionId: string;
  plan: ConversationPlan;
}): Promise<ConversationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  if (!sessionId.success || !isConversationPlan(input.plan)) {
    return { ok: false, error: "No pude cambiar el plan." };
  }

  const ctx = await teacherConversationContext(sessionId.data);
  if (!ctx.ok) return ctx;
  if (ctx.roundCurrent !== 0) {
    return { ok: false, error: "El plan ya está en marcha." };
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({ conversation_plan: input.plan })
    .eq("id", sessionId.data)
    .eq("round_current", 0);

  if (error) {
    console.error("setConversationPlan failed:", error);
    return { ok: false, error: "No pude cambiar el plan." };
  }

  return {
    ok: true,
    ...snapshot(input.plan, 0, ctx.roundState, ctx.session.round_started_at),
  };
}

export async function nextConversationRound(input: {
  sessionId: string;
}): Promise<ConversationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  if (!sessionId.success) {
    return { ok: false, error: "No pude pasar de ronda." };
  }

  const ctx = await teacherConversationContext(sessionId.data);
  if (!ctx.ok) return ctx;
  if (ctx.plan === "open") {
    return { ok: false, error: "Esta clase no usa rondas." };
  }

  const next = nextRoundCurrent(ctx.roundCurrent, ctx.plan);
  const total = roundTotal(ctx.plan);
  const done = next >= total + 1;
  const now = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      round_current: next,
      round_state: done ? "idle" : "running",
      round_started_at: done ? null : now,
    })
    .eq("id", sessionId.data);

  if (error) {
    console.error("nextConversationRound failed:", error);
    return { ok: false, error: "No pude pasar de ronda." };
  }

  return {
    ok: true,
    ...snapshot(ctx.plan, next, done ? "idle" : "running", done ? null : now),
  };
}

export async function resetConversationRound(input: {
  sessionId: string;
}): Promise<ConversationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  if (!sessionId.success) {
    return { ok: false, error: "No pude reiniciar la ronda." };
  }

  const ctx = await teacherConversationContext(sessionId.data);
  if (!ctx.ok) return ctx;
  if (ctx.plan === "open" || ctx.roundCurrent === 0) {
    return { ok: false, error: "Todavía no hay una ronda." };
  }
  if (ctx.roundCurrent >= roundTotal(ctx.plan) + 1) {
    return { ok: false, error: "Las rondas ya terminaron." };
  }

  const now = new Date().toISOString();
  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      round_state: "running",
      round_started_at: now,
    })
    .eq("id", sessionId.data);

  if (error) {
    console.error("resetConversationRound failed:", error);
    return { ok: false, error: "No pude reiniciar la ronda." };
  }

  return {
    ok: true,
    ...snapshot(ctx.plan, ctx.roundCurrent, "running", now),
  };
}

export async function pauseConversationRound(input: {
  sessionId: string;
}): Promise<ConversationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  if (!sessionId.success) {
    return { ok: false, error: "No pude pausar." };
  }

  const ctx = await teacherConversationContext(sessionId.data);
  if (!ctx.ok) return ctx;
  if (ctx.plan === "open" || ctx.roundCurrent === 0) {
    return { ok: false, error: "Todavía no hay una ronda." };
  }
  if (ctx.roundCurrent >= roundTotal(ctx.plan) + 1) {
    return { ok: false, error: "Las rondas ya terminaron." };
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({ round_state: "stopped" })
    .eq("id", sessionId.data);

  if (error) {
    console.error("pauseConversationRound failed:", error);
    return { ok: false, error: "No pude pausar." };
  }

  return {
    ok: true,
    ...snapshot(
      ctx.plan,
      ctx.roundCurrent,
      "stopped",
      ctx.session.round_started_at
    ),
  };
}

export async function resumeConversationRound(input: {
  sessionId: string;
  elapsedSeconds: number;
}): Promise<ConversationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const elapsed = elapsedSchema.safeParse(input.elapsedSeconds);
  if (!sessionId.success || !elapsed.success) {
    return { ok: false, error: "No pude reanudar." };
  }

  const ctx = await teacherConversationContext(sessionId.data);
  if (!ctx.ok) return ctx;
  if (ctx.plan === "open" || ctx.roundCurrent === 0) {
    return { ok: false, error: "Todavía no hay una ronda." };
  }
  if (ctx.roundCurrent >= roundTotal(ctx.plan) + 1) {
    return { ok: false, error: "Las rondas ya terminaron." };
  }

  const length = roundLengthSeconds(ctx.plan, ctx.level);
  const clamped = Math.min(elapsed.data, length);
  const startedAt = new Date(Date.now() - clamped * 1000).toISOString();

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      round_state: "running",
      round_started_at: startedAt,
    })
    .eq("id", sessionId.data);

  if (error) {
    console.error("resumeConversationRound failed:", error);
    return { ok: false, error: "No pude reanudar." };
  }

  return {
    ok: true,
    ...snapshot(ctx.plan, ctx.roundCurrent, "running", startedAt),
  };
}
