"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import {
  decodeMusicStep,
  encodeMusicStep,
  isMusicStepId,
  musicStepList,
  parseSongClassAnswers,
} from "@/lib/music";

export type MusicPacingResult =
  | {
      ok: true;
      lessonStepCurrent: string | null;
      lessonStepLocked: boolean;
    }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();

async function teacherSongContext(sessionId: string) {
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
      "id, course_id, session_type, story_id, lesson_step_current, lesson_step_locked"
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (!session || session.session_type !== "song" || !session.story_id) {
    return { ok: false as const, error: "Esta no es una clase de música." };
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

  const { data: story } = await supabase
    .from("stories")
    .select("artist_bio, youtube_url, lyric_blanks")
    .eq("id", session.story_id)
    .maybeSingle();

  if (!story) {
    return { ok: false as const, error: "No encontré esa canción." };
  }

  return {
    ok: true as const,
    supabase,
    session,
    story,
  };
}

export async function initMusicLessonPacing(
  sessionId: string
): Promise<MusicPacingResult> {
  const ctx = await teacherSongContext(sessionId);
  if (!ctx.ok) return ctx;

  if (ctx.session.lesson_step_current) {
    return {
      ok: true,
      lessonStepCurrent: ctx.session.lesson_step_current,
      lessonStepLocked: Boolean(ctx.session.lesson_step_locked),
    };
  }

  const first = musicStepList(ctx.story)[0]?.id ?? "lyrics_meaning";
  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeMusicStep(first),
      lesson_step_locked: true,
    })
    .eq("id", ctx.session.id)
    .is("lesson_step_current", null);

  if (error) {
    console.error("initMusicLessonPacing failed:", error);
    return { ok: false, error: "No pude sincronizar los pasos." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeMusicStep(first),
    lessonStepLocked: true,
  };
}

export async function setMusicLessonStep(
  sessionId: string,
  step: string
): Promise<MusicPacingResult> {
  const ctx = await teacherSongContext(sessionId);
  if (!ctx.ok) return ctx;

  const mapped = step.trim() === "video" ? "blind_listen" : step.trim();
  if (
    !isMusicStepId(mapped) ||
    !musicStepList(ctx.story).some((row) => row.id === mapped)
  ) {
    return { ok: false, error: "No pude mover el paso." };
  }

  const locked = ctx.session.lesson_step_locked ?? true;

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeMusicStep(mapped),
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("setMusicLessonStep failed:", error);
    return { ok: false, error: "No pude mover el paso." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeMusicStep(mapped),
    lessonStepLocked: locked,
  };
}

export async function toggleMusicStepLock(
  sessionId: string,
  locked: boolean
): Promise<MusicPacingResult> {
  const ctx = await teacherSongContext(sessionId);
  if (!ctx.ok) return ctx;

  let current = ctx.session.lesson_step_current;
  if (!current) {
    current = encodeMusicStep(
      musicStepList(ctx.story)[0]?.id ?? "lyrics_meaning"
    );
  } else if (!isMusicStepId(current)) {
    current = encodeMusicStep(decodeMusicStep(current, ctx.story));
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: current,
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("toggleMusicStepLock failed:", error);
    return { ok: false, error: "No pude cambiar el bloqueo." };
  }

  return {
    ok: true,
    lessonStepCurrent: current,
    lessonStepLocked: locked,
  };
}

export async function saveSongClassAnswers(
  sessionId: string,
  answers: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await teacherSongContext(sessionId);
  if (!ctx.ok) return ctx;

  const parsed = parseSongClassAnswers(answers);
  const payload: Record<string, string> = {};
  for (const [id, text] of Object.entries(parsed)) {
    payload[id] = text;
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({ song_class_answers: payload })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("saveSongClassAnswers failed:", error);
    return { ok: false, error: "No pude guardar las respuestas." };
  }

  return { ok: true };
}
