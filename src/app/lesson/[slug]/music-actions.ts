"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { parseLyricBlanks } from "@/lib/music";
import {
  submitSongLyricWorksheet,
  upsertSongLyricAttempt,
  type SavedSongAttempt,
} from "@/lib/services/songAttempts";

export type SongAttemptResult =
  | { ok: true; attempts?: SavedSongAttempt[] }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const blankIdSchema = z.number().int().min(1).max(99);
const typedSchema = z.string().max(200);

async function classroomStudent(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Tienes que entrar con tu email." };
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role === "teacher") {
    return { ok: false as const, error: "Esta hoja es para estudiantes." };
  }

  const parsed = uuidSchema.safeParse(sessionId);
  if (!parsed.success) {
    return { ok: false as const, error: "No encontré esa clase." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select("id, session_type, story_id")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!session || session.session_type !== "song" || !session.story_id) {
    return { ok: false as const, error: "Esta no es una clase de música." };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    sessionId: session.id,
    storyId: session.story_id as string,
  };
}

export async function saveSongLyricBlank(input: {
  sessionId: string;
  blankId: number;
  typedText: string;
}): Promise<SongAttemptResult> {
  const blankId = blankIdSchema.safeParse(input.blankId);
  const typed = typedSchema.safeParse(input.typedText);
  if (!blankId.success || !typed.success) {
    return { ok: false, error: "Esa respuesta no se pudo guardar." };
  }

  const ctx = await classroomStudent(input.sessionId);
  if (!ctx.ok) return ctx;

  return upsertSongLyricAttempt(ctx.supabase, {
    sessionId: ctx.sessionId,
    userId: ctx.userId,
    storyId: ctx.storyId,
    blankId: blankId.data,
    typedText: typed.data,
  });
}

export async function submitSongLyricBlanks(input: {
  sessionId: string;
  values: Record<string, string>;
}): Promise<SongAttemptResult> {
  const ctx = await classroomStudent(input.sessionId);
  if (!ctx.ok) return ctx;

  const { data: story } = await ctx.supabase
    .from("stories")
    .select("lyric_blanks")
    .eq("id", ctx.storyId)
    .maybeSingle();

  const blanks = parseLyricBlanks(story?.lyric_blanks);
  if (blanks.length === 0) {
    return { ok: false, error: "Esta canción no tiene huecos." };
  }

  const values: Record<number, string> = {};
  for (const blank of blanks) {
    const raw = input.values[String(blank.id)] ?? input.values[blank.id] ?? "";
    values[blank.id] = String(raw).slice(0, 200);
  }

  return submitSongLyricWorksheet(ctx.supabase, {
    sessionId: ctx.sessionId,
    userId: ctx.userId,
    storyId: ctx.storyId,
    blanks,
    values,
  });
}
