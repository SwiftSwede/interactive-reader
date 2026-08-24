"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { countWords, wordsPerMinute } from "@/lib/writing";

export type WritingSaveResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

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

export async function saveWritingDraft(input: {
  sessionId: string;
  promptId: string;
  text: string;
  startedAt: string;
}): Promise<WritingSaveResult> {
  const auth = await requireClassroomStudent();
  if (!auth.ok) return auth;

  const text = input.text;
  const wordCount = countWords(text);

  const { data: existing } = await auth.supabase
    .from("writing_submissions")
    .select("id, status")
    .eq("course_session_id", input.sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existing && existing.status !== "draft") {
    return { ok: true, submissionId: existing.id };
  }

  if (existing) {
    const { error } = await auth.supabase
      .from("writing_submissions")
      .update({
        submission_text: text,
        word_count: wordCount,
      })
      .eq("id", existing.id)
      .eq("status", "draft");
    if (error) {
      console.error("saveWritingDraft update failed:", error);
      return { ok: false, error: "No pude guardar. Sigue escribiendo." };
    }
    return { ok: true, submissionId: existing.id };
  }

  const { data, error } = await auth.supabase
    .from("writing_submissions")
    .insert({
      writing_prompt_id: input.promptId,
      user_id: auth.userId,
      course_session_id: input.sessionId,
      submission_text: text,
      started_at: input.startedAt,
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

  const submittedAt = new Date();
  const started = new Date(input.startedAt);
  const elapsedSeconds = Math.max(
    1,
    Math.round((submittedAt.getTime() - started.getTime()) / 1000)
  );
  const wordCount = countWords(input.text);
  const wpm =
    input.level === "pre-intermediate"
      ? wordsPerMinute(wordCount, elapsedSeconds)
      : null;

  const { data: existing } = await auth.supabase
    .from("writing_submissions")
    .select("id, status")
    .eq("course_session_id", input.sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existing && existing.status !== "draft") {
    return { ok: true, submissionId: existing.id };
  }

  const payload = {
    writing_prompt_id: input.promptId,
    user_id: auth.userId,
    course_session_id: input.sessionId,
    submission_text: input.text,
    started_at: input.startedAt,
    submitted_at: submittedAt.toISOString(),
    elapsed_seconds: elapsedSeconds,
    word_count: wordCount,
    wpm,
    status: "submitted" as const,
  };

  if (existing) {
    const { error } = await auth.supabase
      .from("writing_submissions")
      .update(payload)
      .eq("id", existing.id)
      .eq("status", "draft");
    if (error) {
      console.error("submitWriting update failed:", error);
      return { ok: false, error: "No pude entregar. Inténtalo otra vez." };
    }
    revalidatePath("/teacher", "layout");
    return { ok: true, submissionId: existing.id };
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
