"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import {
  decodeWritingStep,
  encodeWritingStep,
  isWritingStepId,
  writingStepList,
  type WritingStepFields,
} from "@/lib/writing";
import type { CourseLevel } from "@/types";

export type WritingPacingResult =
  | {
      ok: true;
      lessonStepCurrent: string | null;
      lessonStepLocked: boolean;
    }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();

function promptFields(row: {
  level: CourseLevel;
  structure_lesson: string | null;
  rubric_text: string | null;
  example_paragraph: string | null;
}): WritingStepFields {
  return {
    level: row.level,
    structureLesson: row.structure_lesson,
    rubricText: row.rubric_text,
    exampleParagraph: row.example_paragraph,
  };
}

async function teacherWritingContext(sessionId: string) {
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
      "id, course_id, session_type, writing_prompt_id, lesson_step_current, lesson_step_locked"
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (
    !session ||
    session.session_type !== "writing" ||
    !session.writing_prompt_id
  ) {
    return { ok: false as const, error: "Esta no es una clase de escritura." };
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

  const { data: prompt } = await supabase
    .from("writing_prompts")
    .select("level, structure_lesson, rubric_text, example_paragraph")
    .eq("id", session.writing_prompt_id)
    .maybeSingle();

  if (!prompt) {
    return { ok: false as const, error: "No encontré esa escritura." };
  }

  return {
    ok: true as const,
    supabase,
    session,
    fields: promptFields(prompt as {
      level: CourseLevel;
      structure_lesson: string | null;
      rubric_text: string | null;
      example_paragraph: string | null;
    }),
  };
}

export async function initWritingLessonPacing(
  sessionId: string
): Promise<WritingPacingResult> {
  const ctx = await teacherWritingContext(sessionId);
  if (!ctx.ok) return ctx;

  if (ctx.session.lesson_step_current) {
    return {
      ok: true,
      lessonStepCurrent: ctx.session.lesson_step_current,
      lessonStepLocked: Boolean(ctx.session.lesson_step_locked),
    };
  }

  const first = writingStepList(ctx.fields)[0]?.id ?? "preguntas";
  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeWritingStep(first),
      lesson_step_locked: true,
    })
    .eq("id", ctx.session.id)
    .is("lesson_step_current", null);

  if (error) {
    console.error("initWritingLessonPacing failed:", error);
    return { ok: false, error: "No pude sincronizar los pasos." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeWritingStep(first),
    lessonStepLocked: true,
  };
}

export async function setWritingLessonStep(
  sessionId: string,
  step: string
): Promise<WritingPacingResult> {
  const ctx = await teacherWritingContext(sessionId);
  if (!ctx.ok) return ctx;

  const mapped = step.trim();
  if (
    !isWritingStepId(mapped) ||
    !writingStepList(ctx.fields).some((row) => row.id === mapped)
  ) {
    return { ok: false, error: "No pude mover el paso." };
  }

  const locked = ctx.session.lesson_step_locked ?? true;

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeWritingStep(mapped),
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("setWritingLessonStep failed:", error);
    return { ok: false, error: "No pude mover el paso." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeWritingStep(mapped),
    lessonStepLocked: locked,
  };
}

export async function toggleWritingStepLock(
  sessionId: string,
  locked: boolean
): Promise<WritingPacingResult> {
  const ctx = await teacherWritingContext(sessionId);
  if (!ctx.ok) return ctx;

  let current = ctx.session.lesson_step_current;
  if (!current) {
    current = encodeWritingStep(
      writingStepList(ctx.fields)[0]?.id ?? "preguntas"
    );
  } else if (!isWritingStepId(current)) {
    current = encodeWritingStep(decodeWritingStep(current, ctx.fields));
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: current,
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("toggleWritingStepLock failed:", error);
    return { ok: false, error: "No pude cambiar el bloqueo." };
  }

  return {
    ok: true,
    lessonStepCurrent: current,
    lessonStepLocked: locked,
  };
}
