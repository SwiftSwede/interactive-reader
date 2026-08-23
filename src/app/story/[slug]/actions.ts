"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";

export type SaveComprehensionResult = { ok: true } | { ok: false };

export async function saveComprehensionResponse(input: {
  sessionId: string;
  questionId: string;
  responseText: string;
  revealedAnswer?: boolean;
}): Promise<SaveComprehensionResult> {
  const sessionId = input.sessionId.trim();
  const questionId = input.questionId.trim();
  const responseText = input.responseText;
  const revealedAnswer = input.revealedAnswer === true;

  if (!sessionId || !questionId) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  const profile = await getProfile(user.id);
  if (profile?.role !== "student-classroom") {
    return { ok: false };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { ok: false };

  const { data: question } = await supabase
    .from("comprehension_questions")
    .select("id")
    .eq("id", questionId)
    .maybeSingle();

  if (!question) return { ok: false };

  const row: {
    user_id: string;
    comprehension_question_id: string;
    course_session_id: string;
    response_text: string;
    revealed_answer?: boolean;
    revealed_at?: string;
  } = {
    user_id: user.id,
    comprehension_question_id: questionId,
    course_session_id: sessionId,
    response_text: responseText,
  };

  if (revealedAnswer) {
    row.revealed_answer = true;
    row.revealed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("comprehension_responses").upsert(row, {
    onConflict: "user_id,comprehension_question_id,course_session_id",
  });

  if (error) {
    console.error("saveComprehensionResponse failed:", error);
    return { ok: false };
  }

  return { ok: true };
}

export async function recordWordLookup(input: {
  wordId: string;
  storyId: string;
  sessionId?: string;
}): Promise<void> {
  try {
    const wordId = input.wordId.trim();
    const storyId = input.storyId.trim();
    if (!wordId || !storyId) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const profile = await getProfile(user.id);
    if (!profile || profile.role === "teacher") return;

    const { data: word } = await supabase
      .from("words")
      .select("id, story_id")
      .eq("id", wordId)
      .maybeSingle();

    if (!word || word.story_id !== storyId) return;

    const row: {
      user_id: string;
      word_id: string;
      story_id: string;
      course_session_id?: string;
    } = {
      user_id: user.id,
      word_id: wordId,
      story_id: storyId,
    };

    if (input.sessionId) {
      row.course_session_id = input.sessionId;
    }

    const { error } = await supabase.from("word_lookups").insert(row);
    if (error && error.code !== "23505") {
      console.error("recordWordLookup failed:", error);
    }
  } catch (error) {
    console.error("recordWordLookup failed:", error);
  }
}
