"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";

const answersSchema = z.object({
  sessionId: z.string().uuid(),
  groupId: z.string().uuid(),
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

export type SaveExamResult =
  | { ok: true }
  | { ok: false; error: string };

async function writerContext(sessionId: string, groupId: string) {
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

  const { data: group } = await supabase
    .from("exam_groups")
    .select("id, writer_id, course_session_id")
    .eq("id", groupId)
    .eq("course_session_id", sessionId)
    .maybeSingle();

  if (!group || group.writer_id !== user.id) {
    return { ok: false as const, error: "Solo quien escribe puede guardar." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select("id, exam_prompt_id, session_type")
    .eq("id", sessionId)
    .maybeSingle();

  const examPromptId = session?.exam_prompt_id;
  if (!session || session.session_type !== "exam" || !examPromptId) {
    return { ok: false as const, error: "No encontré ese examen." };
  }

  return { ok: true as const, supabase, examPromptId };
}

export async function saveExamAnswers(
  input: z.infer<typeof answersSchema>
): Promise<SaveExamResult> {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Esas respuestas no se pudieron guardar." };
  }

  const sessionId = parsed.data.sessionId ?? "";
  const groupId = parsed.data.groupId ?? "";
  if (!sessionId || !groupId) {
    return { ok: false, error: "No encontré ese examen." };
  }

  const ctx = await writerContext(sessionId, groupId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const payload = {
    exam_prompt_id: ctx.examPromptId,
    exam_group_id: groupId,
    course_session_id: sessionId,
    task1_answers: parsed.data.task1,
    task2_answers: parsed.data.task2,
    task3_answers: parsed.data.task3,
  };

  const { data: existing } = await ctx.supabase
    .from("group_exam_submissions")
    .select("id, status")
    .eq("exam_group_id", groupId)
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
    : await ctx.supabase.from("group_exam_submissions").insert(payload);

  if (error) {
    console.error("saveExamAnswers failed:", error);
    return { ok: false, error: "No pude guardar. Inténtalo de nuevo." };
  }

  return { ok: true };
}

export async function submitExamAnswers(
  input: z.infer<typeof answersSchema>
): Promise<SaveExamResult> {
  const saved = await saveExamAnswers(input);
  if (!saved.ok) return saved;

  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No pude entregar." };
  }

  const sessionId = parsed.data.sessionId ?? "";
  const groupId = parsed.data.groupId ?? "";
  if (!sessionId || !groupId) {
    return { ok: false, error: "No encontré ese examen." };
  }

  const ctx = await writerContext(sessionId, groupId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("group_exam_submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("exam_group_id", groupId)
    .eq("status", "in_progress");

  if (error) {
    console.error("submitExamAnswers failed:", error);
    return { ok: false, error: "No pude entregar. Inténtalo de nuevo." };
  }

  return { ok: true };
}
