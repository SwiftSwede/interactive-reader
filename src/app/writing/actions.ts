"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { getSessionPhase } from "@/lib/session-phase";
import {
  activeWritingTimer,
  canStartAfterClassWriting,
  countWords,
  hasWritingText,
  wordsPerMinute,
  type WritingSubmissionStatus,
} from "@/lib/writing";

export type WritingSaveResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

export type StartAfterClassWritingResult =
  | { ok: true; submissionId: string; startedAt: string }
  | { ok: false; error: string };

type ExistingSubmission = {
  id: string;
  status: WritingSubmissionStatus;
  submission_text: string;
  started_at: string | null;
};

async function requireClassroomStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Entra con tu email para escribir." };
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "student-classroom") {
    return { ok: false as const, error: "Esta página es para el grupo." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

async function loadWritingContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string
) {
  const { data: session } = await supabase
    .from("course_sessions")
    .select(
      "id, session_type, writing_prompt_id, session_start_time, session_end_time, class_ended_at, timer_started_at"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.session_type !== "writing" || !session.writing_prompt_id) {
    return null;
  }

  const { data: prompt } = await supabase
    .from("writing_prompts")
    .select("id, writing_time_minutes")
    .eq("id", session.writing_prompt_id)
    .maybeSingle();

  if (!prompt) return null;

  const { data: existingRow } = await supabase
    .from("writing_submissions")
    .select("id, status, submission_text, started_at")
    .eq("course_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  const existing = (existingRow as ExistingSubmission | null) ?? null;
  const phase = getSessionPhase({
    sessionStartTime: session.session_start_time,
    sessionEndTime: session.session_end_time,
    classEndedAt: session.class_ended_at,
  });

  const timerInput = {
    phase,
    sessionTimerStartedAt: session.timer_started_at ?? null,
    personalStartedAt: existing?.started_at ?? null,
    status: existing?.status ?? ("draft" as const),
    text: existing?.submission_text ?? "",
    minutes: prompt.writing_time_minutes as number,
  };

  return { session, prompt, existing, phase, timerInput };
}

function submitStartedAt(
  ctx: NonNullable<Awaited<ReturnType<typeof loadWritingContext>>>,
  incomingText: string
): string | null {
  const clock = activeWritingTimer(ctx.timerInput);
  if (clock) return clock;
  if (hasWritingText(incomingText) || hasWritingText(ctx.existing?.submission_text)) {
    return (
      ctx.existing?.started_at ?? ctx.session.timer_started_at ?? null
    );
  }
  return null;
}

export async function startAfterClassWriting(input: {
  sessionId: string;
  promptId: string;
}): Promise<StartAfterClassWritingResult> {
  const auth = await requireClassroomStudent();
  if (!auth.ok) return auth;

  const ctx = await loadWritingContext(
    auth.supabase,
    input.sessionId,
    auth.userId
  );
  if (!ctx || ctx.session.writing_prompt_id !== input.promptId) {
    return { ok: false, error: "No encontré esa clase." };
  }
  if (!canStartAfterClassWriting(ctx.timerInput)) {
    return {
      ok: false,
      error: "Esta escritura ya no se puede empezar.",
    };
  }
  if (hasWritingText(ctx.existing?.submission_text)) {
    return { ok: false, error: "Ya escribiste en esta clase." };
  }

  const startedAt = new Date().toISOString();

  if (ctx.existing) {
    const { error } = await auth.supabase
      .from("writing_submissions")
      .update({
        writing_prompt_id: input.promptId,
        submission_text: ctx.existing.submission_text,
        started_at: startedAt,
        submitted_at: null,
        elapsed_seconds: null,
        wpm: null,
        word_count: 0,
        status: "draft",
      })
      .eq("id", ctx.existing.id)
      .neq("status", "corrected");
    if (error) {
      console.error("startAfterClassWriting update failed:", error);
      return { ok: false, error: "No pude empezar. Inténtalo de nuevo." };
    }
    return { ok: true, submissionId: ctx.existing.id, startedAt };
  }

  const { data, error } = await auth.supabase
    .from("writing_submissions")
    .insert({
      writing_prompt_id: input.promptId,
      user_id: auth.userId,
      course_session_id: input.sessionId,
      submission_text: "",
      started_at: startedAt,
      word_count: 0,
      status: "draft",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("startAfterClassWriting insert failed:", error);
    return { ok: false, error: "No pude empezar. Inténtalo de nuevo." };
  }

  return { ok: true, submissionId: data.id, startedAt };
}

export async function saveWritingDraft(input: {
  sessionId: string;
  promptId: string;
  text: string;
  startedAt: string;
}): Promise<WritingSaveResult> {
  const auth = await requireClassroomStudent();
  if (!auth.ok) return auth;

  const ctx = await loadWritingContext(
    auth.supabase,
    input.sessionId,
    auth.userId
  );
  if (!ctx || ctx.session.writing_prompt_id !== input.promptId) {
    return { ok: false, error: "No encontré esa clase." };
  }
  if (ctx.existing?.status === "corrected") {
    return { ok: true, submissionId: ctx.existing.id };
  }
  if (
    ctx.existing &&
    ctx.existing.status !== "draft" &&
    hasWritingText(ctx.existing.submission_text)
  ) {
    return { ok: true, submissionId: ctx.existing.id };
  }

  const clock = activeWritingTimer(ctx.timerInput);
  if (!clock) {
    return { ok: false, error: "El tiempo no está corriendo." };
  }

  const text = input.text;
  const wordCount = countWords(text);

  if (ctx.existing) {
    const { error } = await auth.supabase
      .from("writing_submissions")
      .update({
        submission_text: text,
        word_count: wordCount,
        started_at: clock,
      })
      .eq("id", ctx.existing.id)
      .eq("status", "draft");
    if (error) {
      console.error("saveWritingDraft update failed:", error);
      return { ok: false, error: "No pude guardar. Sigue escribiendo." };
    }
    return { ok: true, submissionId: ctx.existing.id };
  }

  const { data, error } = await auth.supabase
    .from("writing_submissions")
    .insert({
      writing_prompt_id: input.promptId,
      user_id: auth.userId,
      course_session_id: input.sessionId,
      submission_text: text,
      started_at: clock,
      word_count: wordCount,
      status: "draft",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error?.code === "23505") {
      const { data: raced } = await auth.supabase
        .from("writing_submissions")
        .select("id")
        .eq("course_session_id", input.sessionId)
        .eq("user_id", auth.userId)
        .maybeSingle();
      if (raced) return { ok: true, submissionId: raced.id };
    }
    console.error("saveWritingDraft insert failed:", error);
    return { ok: false, error: "No pude guardar. Sigue escribiendo." };
  }

  return { ok: true, submissionId: data.id };
}

export async function submitWriting(input: {
  sessionId: string;
  promptId: string;
  text: string;
  startedAt: string;
  level: "pre-intermediate" | "intermediate";
}): Promise<WritingSaveResult> {
  const auth = await requireClassroomStudent();
  if (!auth.ok) return auth;

  const ctx = await loadWritingContext(
    auth.supabase,
    input.sessionId,
    auth.userId
  );
  if (!ctx || ctx.session.writing_prompt_id !== input.promptId) {
    return { ok: false, error: "No encontré esa clase." };
  }
  if (ctx.existing?.status === "corrected") {
    return { ok: true, submissionId: ctx.existing.id };
  }
  if (
    ctx.existing &&
    ctx.existing.status !== "draft" &&
    hasWritingText(ctx.existing.submission_text)
  ) {
    return { ok: true, submissionId: ctx.existing.id };
  }

  const startedAt = submitStartedAt(ctx, input.text);
  if (!startedAt) {
    return { ok: false, error: "El tiempo no está corriendo." };
  }

  const submittedAt = new Date();
  const started = new Date(startedAt);
  const elapsedSeconds = Math.max(
    1,
    Math.round((submittedAt.getTime() - started.getTime()) / 1000)
  );
  const wordCount = countWords(input.text);
  const wpm =
    input.level === "pre-intermediate"
      ? wordsPerMinute(wordCount, elapsedSeconds)
      : null;

  const payload = {
    writing_prompt_id: input.promptId,
    user_id: auth.userId,
    course_session_id: input.sessionId,
    submission_text: input.text,
    started_at: startedAt,
    submitted_at: submittedAt.toISOString(),
    elapsed_seconds: elapsedSeconds,
    word_count: wordCount,
    wpm,
    status: "submitted" as const,
  };

  if (ctx.existing) {
    const { error } = await auth.supabase
      .from("writing_submissions")
      .update(payload)
      .eq("id", ctx.existing.id)
      .neq("status", "corrected");
    if (error) {
      console.error("submitWriting update failed:", error);
      return { ok: false, error: "No pude entregar. Inténtalo otra vez." };
    }
    revalidatePath("/teacher", "layout");
    return { ok: true, submissionId: ctx.existing.id };
  }

  const { data, error } = await auth.supabase
    .from("writing_submissions")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("submitWriting insert failed:", error);
    return { ok: false, error: "No pude entregar. Inténtalo otra vez." };
  }

  revalidatePath("/teacher", "layout");
  return { ok: true, submissionId: data.id };
}
