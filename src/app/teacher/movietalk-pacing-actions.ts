"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import {
  decodeMovieTalkStep,
  encodeMovieTalkStep,
  isMovieTalkStepId,
  movieTalkStepList,
  parseMovieTalkClassAnswers,
  type MovieTalkSceneFields,
} from "@/lib/movietalk";

export type MovieTalkPacingResult =
  | {
      ok: true;
      lessonStepCurrent: string | null;
      lessonStepLocked: boolean;
    }
  | { ok: false; error: string };

const uuidSchema = z.string().uuid();

type SceneRow = {
  scene_number: number;
  youtube_url: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  question_start_position: number | null;
  question_end_position: number | null;
};

function mapScenes(rows: SceneRow[] | null): MovieTalkSceneFields[] {
  return (rows ?? []).map((row) => ({
    sceneNumber: row.scene_number,
    youtubeUrl: row.youtube_url,
    startSeconds: row.start_seconds,
    endSeconds: row.end_seconds,
    questionStartPosition: row.question_start_position,
    questionEndPosition: row.question_end_position,
  }));
}

async function teacherMovieTalkContext(sessionId: string) {
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

  if (!session || session.session_type !== "movie_talk" || !session.story_id) {
    return { ok: false as const, error: "Esta no es una clase de Movie Talk." };
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
    .select("warmup_question, synopsis")
    .eq("id", session.story_id)
    .maybeSingle();

  if (!story) {
    return { ok: false as const, error: "No encontré esa lección." };
  }

  const { data: sceneRows } = await supabase
    .from("movie_talk_scenes")
    .select(
      "scene_number, youtube_url, start_seconds, end_seconds, question_start_position, question_end_position"
    )
    .eq("story_id", session.story_id)
    .order("scene_number", { ascending: true });

  return {
    ok: true as const,
    supabase,
    session,
    story,
    scenes: mapScenes(sceneRows as SceneRow[] | null),
  };
}

export async function initMovieTalkLessonPacing(
  sessionId: string
): Promise<MovieTalkPacingResult> {
  const ctx = await teacherMovieTalkContext(sessionId);
  if (!ctx.ok) return ctx;

  if (ctx.session.lesson_step_current) {
    return {
      ok: true,
      lessonStepCurrent: ctx.session.lesson_step_current,
      lessonStepLocked: Boolean(ctx.session.lesson_step_locked),
    };
  }

  const first = movieTalkStepList(ctx.story, ctx.scenes)[0]?.id ?? "synopsis";
  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeMovieTalkStep(first),
      lesson_step_locked: true,
    })
    .eq("id", ctx.session.id)
    .is("lesson_step_current", null);

  if (error) {
    console.error("initMovieTalkLessonPacing failed:", error);
    return { ok: false, error: "No pude sincronizar los pasos." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeMovieTalkStep(first),
    lessonStepLocked: true,
  };
}

export async function setMovieTalkLessonStep(
  sessionId: string,
  step: string
): Promise<MovieTalkPacingResult> {
  const ctx = await teacherMovieTalkContext(sessionId);
  if (!ctx.ok) return ctx;

  const trimmed = step.trim();
  if (
    !isMovieTalkStepId(trimmed) ||
    !movieTalkStepList(ctx.story, ctx.scenes).some((row) => row.id === trimmed)
  ) {
    return { ok: false, error: "No pude mover el paso." };
  }

  const locked = ctx.session.lesson_step_locked ?? true;

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: encodeMovieTalkStep(trimmed),
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("setMovieTalkLessonStep failed:", error);
    return { ok: false, error: "No pude mover el paso." };
  }

  return {
    ok: true,
    lessonStepCurrent: encodeMovieTalkStep(trimmed),
    lessonStepLocked: locked,
  };
}

export async function toggleMovieTalkStepLock(
  sessionId: string,
  locked: boolean
): Promise<MovieTalkPacingResult> {
  const ctx = await teacherMovieTalkContext(sessionId);
  if (!ctx.ok) return ctx;

  let current = ctx.session.lesson_step_current;
  if (!current) {
    current = encodeMovieTalkStep(
      movieTalkStepList(ctx.story, ctx.scenes)[0]?.id ?? "synopsis"
    );
  } else if (!isMovieTalkStepId(current)) {
    current = encodeMovieTalkStep(
      decodeMovieTalkStep(current, ctx.story, ctx.scenes)
    );
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({
      lesson_step_current: current,
      lesson_step_locked: locked,
    })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("toggleMovieTalkStepLock failed:", error);
    return { ok: false, error: "No pude cambiar el bloqueo." };
  }

  return {
    ok: true,
    lessonStepCurrent: current,
    lessonStepLocked: locked,
  };
}

export async function saveMovieTalkClassAnswers(
  sessionId: string,
  answers: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await teacherMovieTalkContext(sessionId);
  if (!ctx.ok) return ctx;

  const parsed = parseMovieTalkClassAnswers(answers);
  const payload: Record<string, string> = {};
  for (const [id, text] of Object.entries(parsed)) {
    payload[id] = text;
  }

  const { error } = await ctx.supabase
    .from("course_sessions")
    .update({ movie_talk_class_answers: payload })
    .eq("id", ctx.session.id);

  if (error) {
    console.error("saveMovieTalkClassAnswers failed:", error);
    return { ok: false, error: "No pude guardar las respuestas." };
  }

  return { ok: true };
}
