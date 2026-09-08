"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { areAnswersUnlocked } from "@/lib/sessions";
import {
  decodePresentationStep,
  encodePresentationStep,
  mapPresentationPromptRow,
  parsePresentationStep,
  serializePresentationSegments,
  stripPresentationText,
  type PresentationPromptRow,
} from "@/lib/presentation";
import { youtubeStartSeconds } from "@/lib/youtube-sync";

export type PresentationActionResult =
  | { ok: true }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const textSchema = z.string().max(500);
const noteSchema = z.string().max(400);
const spanishSchema = z.string().min(1).max(200);
const englishSchema = z.string().min(1).max(200);
const idSchema = z.number().int().min(1).max(50);
const stepSchema = z.string().min(1).max(40);

async function teacherSessionContext(sessionId: string) {
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
    .select("id, course_id, session_type, presentation_prompt_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (
    !session ||
    session.session_type !== "presentation" ||
    !session.presentation_prompt_id
  ) {
    return { ok: false as const, error: "No encontré esa presentación." };
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

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    promptId: session.presentation_prompt_id as string,
  };
}

export async function setPresentationStep(input: {
  sessionId: string;
  step: string;
}): Promise<PresentationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const step = stepSchema.safeParse(input.step);
  if (!sessionId.success || !step.success) {
    return { ok: false, error: "No pude cambiar el paso." };
  }

  const ctx = await teacherSessionContext(sessionId.data);
  if (!ctx.ok) return ctx;

  const { data: promptRow } = await ctx.supabase
    .from("presentation_prompts")
    .select(
      "id, title, level, theme, warmup_question, segments, created_at"
    )
    .eq("id", ctx.promptId)
    .maybeSingle();

  if (!promptRow) {
    return { ok: false, error: "No encontré esa presentación." };
  }

  const prompt = mapPresentationPromptRow(promptRow as PresentationPromptRow);
  const parsed = parsePresentationStep(step.data, prompt);
  const decoded = decodePresentationStep(step.data);
  if (!decoded) {
    return { ok: false, error: "Ese paso no existe." };
  }

  const patch: Record<string, unknown> = {
    presentation_step: encodePresentationStep(parsed),
  };

  if (parsed.kind === "video") {
    const segment = prompt.segments.find((row) => row.id === parsed.segmentId);
    patch.video_playing = false;
    patch.video_seconds = segment ? youtubeStartSeconds(segment.youtubeUrl) : 0;
    patch.video_rate = 1;
    patch.video_updated_at = new Date().toISOString();
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update(patch)
    .eq("id", sessionId.data);

  if (error) {
    console.error("setPresentationStep failed:", error);
    return { ok: false, error: "No pude cambiar el paso." };
  }

  return { ok: true };
}

export async function updatePresentationSpanish(input: {
  sessionId: string;
  segmentId: number;
  english: string;
  spanish: string;
}): Promise<PresentationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const segmentId = idSchema.safeParse(input.segmentId);
  const english = englishSchema.safeParse(stripPresentationText(input.english));
  const spanish = spanishSchema.safeParse(stripPresentationText(input.spanish));
  if (
    !sessionId.success ||
    !segmentId.success ||
    !english.success ||
    !spanish.success
  ) {
    return { ok: false, error: "Esa traducción no se pudo guardar." };
  }

  const ctx = await teacherSessionContext(sessionId.data);
  if (!ctx.ok) return ctx;

  const { data: promptRow } = await ctx.supabase
    .from("presentation_prompts")
    .select(
      "id, title, level, theme, warmup_question, segments, created_at"
    )
    .eq("id", ctx.promptId)
    .maybeSingle();

  if (!promptRow) {
    return { ok: false, error: "No encontré esa presentación." };
  }

  const prompt = mapPresentationPromptRow(promptRow as PresentationPromptRow);
  const nextSegments = prompt.segments.map((segment) => {
    if (segment.id !== segmentId.data) return segment;
    return {
      ...segment,
      vocabulary: segment.vocabulary.map((item) =>
        item.english === english.data
          ? { ...item, spanish: spanish.data }
          : item
      ),
    };
  });

  const { error } = await ctx.supabase
    .from("presentation_prompts")
    .update({ segments: serializePresentationSegments(nextSegments) })
    .eq("id", ctx.promptId);

  if (error) {
    console.error("updatePresentationSpanish failed:", error);
    return { ok: false, error: "No pude guardar la traducción." };
  }

  return { ok: true };
}

export async function upsertPresentationVocabNote(input: {
  sessionId: string;
  segmentId: number;
  english: string;
  noteText: string;
}): Promise<PresentationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const segmentId = idSchema.safeParse(input.segmentId);
  const english = englishSchema.safeParse(stripPresentationText(input.english));
  const noteText = noteSchema.safeParse(stripPresentationText(input.noteText));
  if (
    !sessionId.success ||
    !segmentId.success ||
    !english.success ||
    !noteText.success
  ) {
    return { ok: false, error: "Esa nota no se pudo guardar." };
  }

  const ctx = await teacherSessionContext(sessionId.data);
  if (!ctx.ok) return ctx;

  if (!noteText.data) {
    const { error } = await ctx.supabase
      .from("presentation_vocab_notes")
      .delete()
      .eq("course_session_id", sessionId.data)
      .eq("segment_id", segmentId.data)
      .eq("vocab_english", english.data);
    if (error) {
      console.error("delete presentation vocab note failed:", error);
      return { ok: false, error: "No pude borrar la nota." };
    }
    return { ok: true };
  }

  const { error } = await ctx.supabase.from("presentation_vocab_notes").upsert(
    {
      course_session_id: sessionId.data,
      segment_id: segmentId.data,
      vocab_english: english.data,
      note_text: noteText.data,
      created_by: ctx.userId,
    },
    { onConflict: "course_session_id,segment_id,vocab_english" }
  );

  if (error) {
    console.error("upsertPresentationVocabNote failed:", error);
    return { ok: false, error: "No pude guardar la nota." };
  }

  return { ok: true };
}

export async function savePresentationClassAnswer(input: {
  sessionId: string;
  segmentId: number;
  questionId: number;
  responseText: string;
  ready: boolean;
}): Promise<PresentationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const segmentId = idSchema.safeParse(input.segmentId);
  const questionId = idSchema.safeParse(input.questionId);
  const responseText = textSchema.safeParse(
    stripPresentationText(input.responseText)
  );
  if (
    !sessionId.success ||
    !segmentId.success ||
    !questionId.success ||
    !responseText.success
  ) {
    return { ok: false, error: "Esa respuesta no se pudo guardar." };
  }

  const ctx = await teacherSessionContext(sessionId.data);
  if (!ctx.ok) return ctx;

  const now = new Date().toISOString();
  const { error } = await ctx.supabase.from("presentation_responses").upsert(
    {
      presentation_prompt_id: ctx.promptId,
      user_id: ctx.userId,
      course_session_id: sessionId.data,
      segment_id: segmentId.data,
      question_id: questionId.data,
      response_text: responseText.data,
      revealed_answer: input.ready,
      revealed_at: input.ready ? now : null,
      submitted_at: now,
    },
    { onConflict: "course_session_id,user_id,segment_id,question_id" }
  );

  if (error) {
    console.error("savePresentationClassAnswer failed:", error);
    return { ok: false, error: "No pude guardar la respuesta." };
  }

  return { ok: true };
}

async function studentResponseContext(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Tienes que entrar con tu email." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select(
      "id, session_type, presentation_prompt_id, answers_revealed, session_start_time, session_end_time, class_ended_at"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (
    !session ||
    session.session_type !== "presentation" ||
    !session.presentation_prompt_id
  ) {
    return { ok: false as const, error: "No encontré esa presentación." };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    promptId: session.presentation_prompt_id as string,
    allowReveal: areAnswersUnlocked({
      answersRevealed: Boolean(session.answers_revealed),
      sessionStartTime: String(session.session_start_time),
      sessionEndTime: String(session.session_end_time),
      classEndedAt: (session.class_ended_at as string | null) ?? null,
    }),
  };
}

export async function savePresentationResponse(input: {
  sessionId: string;
  segmentId: number;
  questionId: number;
  responseText: string;
}): Promise<PresentationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const segmentId = idSchema.safeParse(input.segmentId);
  const questionId = idSchema.safeParse(input.questionId);
  const responseText = textSchema.safeParse(
    stripPresentationText(input.responseText)
  );
  if (
    !sessionId.success ||
    !segmentId.success ||
    !questionId.success ||
    !responseText.success
  ) {
    return { ok: false, error: "Esa respuesta no se pudo guardar." };
  }

  const ctx = await studentResponseContext(sessionId.data);
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.from("presentation_responses").upsert(
    {
      presentation_prompt_id: ctx.promptId,
      user_id: ctx.userId,
      course_session_id: sessionId.data,
      segment_id: segmentId.data,
      question_id: questionId.data,
      response_text: responseText.data,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "course_session_id,user_id,segment_id,question_id" }
  );

  if (error) {
    console.error("savePresentationResponse failed:", error);
    return { ok: false, error: "No pude guardar tu respuesta." };
  }

  return { ok: true };
}

export async function revealPresentationAnswer(input: {
  sessionId: string;
  segmentId: number;
  questionId: number;
}): Promise<PresentationActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const segmentId = idSchema.safeParse(input.segmentId);
  const questionId = idSchema.safeParse(input.questionId);
  if (!sessionId.success || !segmentId.success || !questionId.success) {
    return { ok: false, error: "No pude mostrar la respuesta." };
  }

  const ctx = await studentResponseContext(sessionId.data);
  if (!ctx.ok) return ctx;
  if (!ctx.allowReveal) {
    return { ok: false, error: "Las respuestas se abren después de clase." };
  }

  const { data: existing } = await ctx.supabase
    .from("presentation_responses")
    .select("response_text")
    .eq("course_session_id", sessionId.data)
    .eq("user_id", ctx.userId)
    .eq("segment_id", segmentId.data)
    .eq("question_id", questionId.data)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error } = await ctx.supabase.from("presentation_responses").upsert(
    {
      presentation_prompt_id: ctx.promptId,
      user_id: ctx.userId,
      course_session_id: sessionId.data,
      segment_id: segmentId.data,
      question_id: questionId.data,
      response_text: existing?.response_text ?? "",
      revealed_answer: true,
      revealed_at: now,
      submitted_at: now,
    },
    { onConflict: "course_session_id,user_id,segment_id,question_id" }
  );

  if (error) {
    console.error("revealPresentationAnswer failed:", error);
    return { ok: false, error: "No pude mostrar la respuesta." };
  }

  return { ok: true };
}
