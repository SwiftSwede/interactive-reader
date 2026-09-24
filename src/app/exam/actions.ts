"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { getSessionPhase } from "@/lib/session-phase";

const answersSchema = z.object({
  sessionId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
  task1: z.array(
    z.object({
      slotIndex: z.number().int().min(0).max(200),
      answer: z.string().max(200),
    })
  ),
  task2: z.array(z.unknown()),
  task3: z.array(
    z.object({
      sentenceNumber: z.number().int().min(1).max(50),
      englishTranslation: z.string().max(500),
    })
  ),
});

const submitTaskSchema = answersSchema.extend({
  task: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type SaveExamResult =
  | { ok: true }
  | { ok: false; error: string };

async function studentExamContext(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Tienes que entrar con tu email." };
  }

  const profile = await getProfile(user.id);
  if (profile?.role === "teacher") {
    return { ok: false as const, error: "El profe no entrega el examen." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select(
      "id, exam_prompt_id, session_type, session_start_time, session_end_time, class_ended_at, timer_started_at"
    )
    .eq("id", sessionId)
    .maybeSingle();

  const examPromptId = session?.exam_prompt_id;
  if (!session || session.session_type !== "exam" || !examPromptId) {
    return { ok: false as const, error: "No encontré ese examen." };
  }

  return { ok: true as const, supabase, user, examPromptId, session };
}

function liveClass(session: {
  session_start_time: string;
  session_end_time: string;
  class_ended_at: string | null;
}) {
  return (
    getSessionPhase(
      {
        sessionStartTime: session.session_start_time,
        sessionEndTime: session.session_end_time,
        classEndedAt: session.class_ended_at,
      },
      new Date()
    ) === "live"
  );
}

export async function saveExamAnswers(
  input: z.infer<typeof answersSchema>
): Promise<SaveExamResult> {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Esas respuestas no se pudieron guardar." };
  }

  const ctx = await studentExamContext(parsed.data.sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const groupId = parsed.data.groupId ?? null;
  if (liveClass(ctx.session) && !groupId) {
    return { ok: false, error: "Todavía no estás en un grupo." };
  }

  if (groupId) {
    const { data: group } = await ctx.supabase
      .from("exam_groups")
      .select("id, member_ids")
      .eq("id", groupId)
      .eq("course_session_id", parsed.data.sessionId)
      .maybeSingle();
    const members = (group?.member_ids ?? []) as string[];
    if (!group || !members.includes(ctx.user.id)) {
      return { ok: false, error: "No encontré tu grupo." };
    }
  }

  const payload = {
    exam_prompt_id: ctx.examPromptId,
    exam_group_id: groupId,
    course_session_id: parsed.data.sessionId,
    user_id: ctx.user.id,
    task1_answers: parsed.data.task1,
    task2_answers: parsed.data.task2,
    task3_answers: parsed.data.task3,
  };

  const { data: existing } = await ctx.supabase
    .from("group_exam_submissions")
    .select("id, status, started_at")
    .eq("course_session_id", parsed.data.sessionId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (existing?.status === "submitted") {
    return { ok: true };
  }

  const { error } = existing
    ? await ctx.supabase
        .from("group_exam_submissions")
        .update(payload)
        .eq("id", existing.id)
        .eq("status", "in_progress")
    : await ctx.supabase.from("group_exam_submissions").insert({
        ...payload,
        started_at: new Date().toISOString(),
        status: "in_progress",
      });

  if (error) {
    console.error("saveExamAnswers failed:", error);
    return { ok: false, error: "No pude guardar. Inténtalo de nuevo." };
  }

  return { ok: true };
}

export async function freezeExamAnswers(
  input: z.infer<typeof answersSchema>
): Promise<SaveExamResult> {
  const saved = await saveExamAnswers(input);
  if (!saved.ok) return saved;

  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No pude guardar." };
  }

  const ctx = await studentExamContext(parsed.data.sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("group_exam_submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("course_session_id", parsed.data.sessionId)
    .eq("user_id", ctx.user.id)
    .eq("status", "in_progress");

  if (error) {
    console.error("freezeExamAnswers failed:", error);
    return { ok: false, error: "No pude guardar. Inténtalo de nuevo." };
  }

  return { ok: true };
}

export async function submitExamTask(
  input: z.infer<typeof submitTaskSchema>
): Promise<SaveExamResult> {
  const parsed = submitTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No pude entregar." };
  }

  const saved = await saveExamAnswers(parsed.data);
  if (!saved.ok) return saved;

  const ctx = await studentExamContext(parsed.data.sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (liveClass(ctx.session)) {
    return { ok: false, error: "En clase no hay que entregar por partes." };
  }

  const now = new Date().toISOString();
  const column =
    parsed.data.task === 1
      ? "task1_submitted_at"
      : parsed.data.task === 2
        ? "task2_submitted_at"
        : "task3_submitted_at";

  const { data: row } = await ctx.supabase
    .from("group_exam_submissions")
    .select("id, task1_submitted_at, task2_submitted_at, task3_submitted_at")
    .eq("course_session_id", parsed.data.sessionId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "No pude entregar." };
  }

  const next = {
    [column]: now,
  };
  const task1 = parsed.data.task === 1 ? now : row.task1_submitted_at;
  const task2 = parsed.data.task === 2 ? now : row.task2_submitted_at;
  const task3 = parsed.data.task === 3 ? now : row.task3_submitted_at;
  if (task1 && task2 && task3) {
    Object.assign(next, {
      status: "submitted",
      submitted_at: now,
    });
  }

  const { error } = await ctx.supabase
    .from("group_exam_submissions")
    .update(next)
    .eq("id", row.id);

  if (error) {
    console.error("submitExamTask failed:", error);
    return { ok: false, error: "No pude entregar. Inténtalo de nuevo." };
  }

  return { ok: true };
}
