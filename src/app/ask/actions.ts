"use server";

import { z } from "zod";
import { getProfile } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import {
  assertStoryExists,
  assertStudentMayUseSession,
  insertQuestionRequest,
  isQuestionSurface,
  isValidQuestionBody,
  QUESTION_BODY_MAX,
  QUESTION_SURFACES,
  trimQuestionBody,
} from "@/lib/question-requests";
import { createClient } from "@/lib/supabase/server";

export type AskTeacherResult = { ok: true } | { ok: false; error: string };

const uuidSchema = z.string().uuid();

const inputSchema = z.object({
  surface: z.enum(QUESTION_SURFACES),
  body: z.string().max(QUESTION_BODY_MAX),
  storyId: uuidSchema.nullable().optional(),
  courseSessionId: uuidSchema.nullable().optional(),
});

export async function createQuestionRequest(input: {
  surface: string;
  body: string;
  storyId?: string | null;
  courseSessionId?: string | null;
}): Promise<AskTeacherResult> {
  const parsed = inputSchema.safeParse({
    ...input,
    storyId: input.storyId ?? null,
    courseSessionId: input.courseSessionId ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisa tu pregunta e inténtalo de nuevo." };
  }

  const body = trimQuestionBody(parsed.data.body);
  if (!isValidQuestionBody(body) || !isQuestionSurface(parsed.data.surface)) {
    return { ok: false, error: "Escribe tu pregunta en el recuadro." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Tienes que entrar con tu email." };
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role === "teacher") {
    return { ok: false, error: "Eso es para estudiantes, no para el profe." };
  }

  const storyId = parsed.data.storyId ?? null;
  const courseSessionId = parsed.data.courseSessionId ?? null;

  if (courseSessionId) {
    const allowed = await assertStudentMayUseSession(
      supabase,
      user.id,
      courseSessionId
    );
    if (!allowed) {
      return { ok: false, error: "Esa clase no te corresponde." };
    }
  }

  if (storyId) {
    const exists = await assertStoryExists(supabase, storyId);
    if (!exists) {
      return { ok: false, error: "No encontré esa lección." };
    }
  }

  try {
    await insertQuestionRequest(supabase, {
      studentId: user.id,
      surface: parsed.data.surface,
      body,
      storyId,
      courseSessionId,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    console.error("createQuestionRequest failed:", error);
    return { ok: false, error: "No pude enviar eso. Inténtalo de nuevo." };
  }

  return { ok: true };
}
