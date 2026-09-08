"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";

export type WordFlagActionResult =
  | { ok: true }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const flagTextSchema = z.string().min(1).max(200);
const occurrenceSchema = z.number().int().min(0).max(100000);
const flagTypeSchema = z.enum(["bold", "underline"]);

async function teacherClient() {
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
  return { ok: true as const, supabase, userId: user.id };
}

async function studentClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Tienes que entrar con tu email." };
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role === "teacher") {
    return {
      ok: false as const,
      error: "Eso es para estudiantes, no para el profe.",
    };
  }
  return { ok: true as const, supabase, userId: user.id };
}

async function deleteSessionRequests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    sessionId: string;
    flagText: string;
    occurrenceIndex: number;
  }
) {
  const { error } = await supabase
    .from("word_flag_requests")
    .delete()
    .eq("course_session_id", input.sessionId)
    .eq("flag_text", input.flagText)
    .eq("occurrence_index", input.occurrenceIndex);
  if (error) {
    console.error("deleteSessionRequests failed:", error);
  }
}

export async function setWordFlag(input: {
  storyId: string;
  flagText: string;
  occurrenceIndex: number;
  flagType: "bold" | "underline";
  on: boolean;
  sessionId?: string | null;
}): Promise<WordFlagActionResult> {
  const parsed = z
    .object({
      storyId: uuidSchema,
      flagText: flagTextSchema,
      occurrenceIndex: occurrenceSchema,
      flagType: flagTypeSchema,
      on: z.boolean(),
      sessionId: uuidSchema.nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Esa marca no se pudo guardar." };
  }

  const teacher = await teacherClient();
  if (!teacher.ok) return teacher;

  if (!parsed.data.on) {
    const { error } = await teacher.supabase
      .from("word_flags")
      .delete()
      .eq("story_id", parsed.data.storyId)
      .eq("flag_text", parsed.data.flagText)
      .eq("occurrence_index", parsed.data.occurrenceIndex)
      .eq("flag_type", parsed.data.flagType);
    if (error) {
      console.error("setWordFlag delete failed:", error);
      return { ok: false, error: "No pude quitar esa marca. Inténtalo de nuevo." };
    }
    return { ok: true };
  }

  const { error } = await teacher.supabase.from("word_flags").upsert(
    {
      story_id: parsed.data.storyId,
      flag_type: parsed.data.flagType,
      flag_text: parsed.data.flagText,
      occurrence_index: parsed.data.occurrenceIndex,
    },
    { onConflict: "story_id,flag_text,occurrence_index,flag_type" }
  );
  if (error) {
    console.error("setWordFlag upsert failed:", error);
    return { ok: false, error: "No pude guardar esa marca. Inténtalo de nuevo." };
  }

  if (parsed.data.sessionId) {
    await deleteSessionRequests(teacher.supabase, {
      sessionId: parsed.data.sessionId,
      flagText: parsed.data.flagText,
      occurrenceIndex: parsed.data.occurrenceIndex,
    });
  }

  return { ok: true };
}

export async function requestWordFlag(input: {
  storyId: string;
  sessionId: string;
  flagText: string;
  occurrenceIndex: number;
}): Promise<WordFlagActionResult> {
  const parsed = z
    .object({
      storyId: uuidSchema,
      sessionId: uuidSchema,
      flagText: flagTextSchema,
      occurrenceIndex: occurrenceSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No pude guardar eso. Inténtalo de nuevo." };
  }

  const student = await studentClient();
  if (!student.ok) return student;

  const { error } = await student.supabase.from("word_flag_requests").upsert(
    {
      story_id: parsed.data.storyId,
      course_session_id: parsed.data.sessionId,
      user_id: student.userId,
      flag_text: parsed.data.flagText,
      occurrence_index: parsed.data.occurrenceIndex,
    },
    {
      onConflict: "course_session_id,user_id,flag_text,occurrence_index",
      ignoreDuplicates: true,
    }
  );
  if (error) {
    console.error("requestWordFlag failed:", error);
    return { ok: false, error: "No pude guardar eso. Inténtalo de nuevo." };
  }
  return { ok: true };
}

export async function convertRequestsToFlag(input: {
  storyId: string;
  sessionId: string;
  flagText: string;
  occurrenceIndex: number;
}): Promise<WordFlagActionResult> {
  const parsed = z
    .object({
      storyId: uuidSchema,
      sessionId: uuidSchema,
      flagText: flagTextSchema,
      occurrenceIndex: occurrenceSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No pude guardar esa marca." };
  }

  const teacher = await teacherClient();
  if (!teacher.ok) return teacher;

  const { error } = await teacher.supabase.from("word_flags").upsert(
    {
      story_id: parsed.data.storyId,
      flag_type: "bold",
      flag_text: parsed.data.flagText,
      occurrence_index: parsed.data.occurrenceIndex,
    },
    { onConflict: "story_id,flag_text,occurrence_index,flag_type" }
  );
  if (error) {
    console.error("convertRequestsToFlag upsert failed:", error);
    return { ok: false, error: "No pude guardar esa marca. Inténtalo de nuevo." };
  }

  await deleteSessionRequests(teacher.supabase, parsed.data);
  return { ok: true };
}
