"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import {
  allExamItemsChecked,
  encodeExamStep,
  isExamItemKey,
  isExamStepId,
  mapExamPromptRow,
  parseExamClassAnswers,
  type ExamPromptRow,
  type ExamStepId,
} from "@/lib/exam";
import type { ExamClassAnswers } from "@/types";

export type ExamPacingResult =
  | {
      ok: true;
      lessonStepCurrent: string | null;
      lessonStepLocked: boolean;
    }
  | { ok: false; error: string };

export type ExamClassAnswersResult =
  | { ok: true; answers: ExamClassAnswers; scorePublishedAt: string | null }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();

async function teacherExamContext(sessionId: string) {
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

  const parsed = uuidSchema.safeParse(sessionId);
  if (!parsed.success) {
    return { ok: false as const, error: "No encontré esa clase." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select(
      "id, course_id, session_type, exam_prompt_id, lesson_step_current, lesson_step_locked, exam_class_answers, exam_score_published_at"
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (!session || session.session_type !== "exam" || !session.exam_prompt_id) {
    return { ok: false as const, error: "Esta no es una clase de examen." };
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", session.course_id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!course) {
    return { ok: false as const, error: "Esa clase no es tuya." };
  }

  return { ok: true as const, supabase, session };
}

export async function setExamLessonStep(
  sessionId: string,
  step: string
): Promise<ExamPacingResult> {
  const ctx = await teacherExamContext(sessionId);
  if (!ctx.ok) return ctx;

  const mapped = step.trim();
  if (!isExamStepId(mapped)) {
    return { ok: false, error: "No pude mover el paso." };
  }

  const locked = ctx.session.lesson_step_locked ?? false;
  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeExamStep(mapped as ExamStepId),
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("setExamLessonStep failed:", error);
    return { ok: false, error: "No pude mover el paso." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeExamStep(mapped as ExamStepId),
    lessonStepLocked: locked,
  };
}

export async function toggleExamStepLock(
  sessionId: string,
  locked: boolean
): Promise<ExamPacingResult> {
  const ctx = await teacherExamContext(sessionId);
  if (!ctx.ok) return ctx;

  let current = ctx.session.lesson_step_current;
  if (!current || !isExamStepId(current)) {
    current = encodeExamStep("parte-1");
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: current,
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("toggleExamStepLock failed:", error);
    return { ok: false, error: "No pude cambiar el bloqueo." };
  }

  return {
    ok: true,
    lessonStepCurrent: current,
    lessonStepLocked: locked,
  };
}

export async function saveExamClassAnswers(
  sessionId: string,
  answers: ExamClassAnswers
): Promise<ExamClassAnswersResult> {
  const ctx = await teacherExamContext(sessionId);
  if (!ctx.ok) return ctx;

  const parsed = parseExamClassAnswers(answers);
  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({ exam_class_answers: parsed })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("saveExamClassAnswers failed:", error);
    return { ok: false, error: "No pude guardar las respuestas." };
  }

  return {
    ok: true,
    answers: parsed,
    scorePublishedAt: ctx.session.exam_score_published_at,
  };
}

export async function checkExamItem(
  sessionId: string,
  key: string,
  accepted: string[],
  draft?: ExamClassAnswers
): Promise<ExamClassAnswersResult> {
  const ctx = await teacherExamContext(sessionId);
  if (!ctx.ok) return ctx;
  if (!isExamItemKey(key)) {
    return { ok: false, error: "No encontré esa pregunta." };
  }

  const cleaned = accepted.map((value) => value.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { ok: false, error: "Escribe al menos una respuesta." };
  }

  const current = parseExamClassAnswers(
    draft ?? ctx.session.exam_class_answers
  );
  current[key] = { accepted: cleaned, revealed: true };

  const { data: promptRow } = await ctx.supabase
    .from("exam_prompts")
    .select("*")
    .eq("id", ctx.session.exam_prompt_id)
    .maybeSingle();

  let scorePublishedAt = ctx.session.exam_score_published_at as string | null;
  const patch: {
    exam_class_answers: ExamClassAnswers;
    exam_score_published_at?: string;
    lesson_step_current?: string;
  } = { exam_class_answers: current };

  if (promptRow) {
    const prompt = mapExamPromptRow(promptRow as ExamPromptRow);
    if (allExamItemsChecked(prompt, current) && !scorePublishedAt) {
      scorePublishedAt = new Date().toISOString();
      patch.exam_score_published_at = scorePublishedAt;
      patch.lesson_step_current = encodeExamStep("puntaje");
    }
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update(patch)
    .eq("id", ctx.session.id);

  if (error) {
    console.error("checkExamItem failed:", error);
    return { ok: false, error: "No pude marcar esa pregunta." };
  }

  return { ok: true, answers: current, scorePublishedAt };
}

export async function publishExamScore(
  sessionId: string
): Promise<ExamClassAnswersResult> {
  const ctx = await teacherExamContext(sessionId);
  if (!ctx.ok) return ctx;

  const { data: promptRow } = await ctx.supabase
    .from("exam_prompts")
    .select("*")
    .eq("id", ctx.session.exam_prompt_id)
    .maybeSingle();
  if (!promptRow) {
    return { ok: false, error: "No encontré el examen." };
  }

  const answers = parseExamClassAnswers(ctx.session.exam_class_answers);
  const prompt = mapExamPromptRow(promptRow as ExamPromptRow);
  if (!allExamItemsChecked(prompt, answers)) {
    return {
      ok: false,
      error: "Todavía falta marcar alguna pregunta.",
    };
  }

  const scorePublishedAt =
    (ctx.session.exam_score_published_at as string | null) ??
    new Date().toISOString();

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      exam_score_published_at: scorePublishedAt,
      lesson_step_current: encodeExamStep("puntaje"),
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("publishExamScore failed:", error);
    return { ok: false, error: "No pude mostrar el puntaje." };
  }

  return { ok: true, answers, scorePublishedAt };
}
