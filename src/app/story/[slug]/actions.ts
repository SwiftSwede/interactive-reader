"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { recordStoryActivityEvidence } from "@/lib/topic-evidence";
import {
  dictationNeedsMorePractice,
  scoreDictation,
} from "@/lib/dictation-scoring";

function revalidateTeacherViews() {
  revalidatePath("/teacher", "layout");
}

/**
 * The logged-in learner, or null. Teachers are excluded: their clicks are
 * demonstrations, not evidence about their own English.
 */
async function currentLearner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "teacher") return null;

  return { supabase, userId: user.id };
}

/** Confirms the story exists and this learner is allowed to read it. */
async function canReadStory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .maybeSingle();

  return data !== null;
}

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
    .select("id, story_id")
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

  // Revealing the answer is the observable end of the reading work, so it also
  // closes out reading progress and topic evidence for classroom students.
  if (revealedAnswer) {
    await recordComprehensionOutcome(supabase, user.id, {
      storyId: question.story_id as string,
      questionId,
      sessionId,
    });
  }

  revalidateTeacherViews();
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
      return;
    }

    // Only a first lookup is new information; a duplicate (23505) already has
    // its evidence row.
    if (!error) {
      await recordStoryActivityEvidence(supabase, {
        userId: user.id,
        storyId,
        sourceType: "word_lookup",
        positiveStatus: "seen",
        sourceId: wordId,
      });
      revalidateTeacherViews();
    }
  } catch (error) {
    console.error("recordWordLookup failed:", error);
  }
}

// ── Reading progress and topic evidence (Phase 4, slice 37) ─
// Every action below derives the user from the session. Nothing accepts a
// user id from the browser.

const UuidSchema = z.string().uuid();

type ProgressStatusValue = "in-progress" | "completed";

async function upsertProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: {
    storyId: string;
    status: ProgressStatusValue;
    comprehensionScore?: number | null;
  }
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    story_id: input.storyId,
    status: input.status,
  };

  if (input.status === "completed") {
    row.completed_at = new Date().toISOString();
  }
  if (input.comprehensionScore !== undefined) {
    row.comprehension_score = input.comprehensionScore;
  }

  const { error } = await supabase
    .from("user_progress")
    .upsert(row, { onConflict: "user_id,story_id" });

  if (error) {
    console.error("upsertProgress failed:", error.message);
  }
}

/**
 * Marks a story as started and records passive exposure to its topics.
 * Called once when a logged-in learner opens the reader. Idempotent.
 */
export async function recordStoryOpened(input: {
  storyId: string;
}): Promise<void> {
  try {
    if (!UuidSchema.safeParse(input.storyId).success) return;

    const learner = await currentLearner();
    if (!learner) return;

    const { supabase, userId } = learner;
    if (!(await canReadStory(supabase, input.storyId))) return;

    // Do not knock a finished story back to in-progress.
    const { data: existing } = await supabase
      .from("user_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("story_id", input.storyId)
      .maybeSingle();

    if (existing?.status !== "completed") {
      await upsertProgress(supabase, userId, {
        storyId: input.storyId,
        status: "in-progress",
      });
    }

    await recordStoryActivityEvidence(supabase, {
      userId,
      storyId: input.storyId,
      sourceType: "reading",
      positiveStatus: "seen",
      sourceId: input.storyId,
    });
  } catch (error) {
    console.error("recordStoryOpened failed:", error);
  }
}

/**
 * Reading completed plus practice evidence, shared by the classroom save path
 * and the open self-check path.
 *
 * There is no correctness signal here: the learner checks their own answer, so
 * the only honest claim is that they produced language about the story. No
 * status is inferred from what they "must have" understood.
 */
async function recordComprehensionOutcome(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: { storyId: string; questionId: string; sessionId?: string }
): Promise<void> {
  await upsertProgress(supabase, userId, {
    storyId: input.storyId,
    status: "completed",
  });

  await recordStoryActivityEvidence(supabase, {
    userId,
    storyId: input.storyId,
    sourceType: "comprehension",
    positiveStatus: "practiced",
    sourceId: input.sessionId ?? input.questionId,
  });
}

/**
 * The open (non-classroom) self-check path: any logged-in learner who reveals a
 * comprehension answer gets reading progress and evidence, with no session.
 */
export async function recordComprehensionSelfCheck(input: {
  questionId: string;
}): Promise<void> {
  try {
    if (!UuidSchema.safeParse(input.questionId).success) return;

    const learner = await currentLearner();
    if (!learner) return;

    const { supabase, userId } = learner;

    const { data: question } = await supabase
      .from("comprehension_questions")
      .select("id, story_id")
      .eq("id", input.questionId)
      .maybeSingle();

    if (!question) return;

    await recordComprehensionOutcome(supabase, userId, {
      storyId: question.story_id as string,
      questionId: input.questionId,
    });
  } catch (error) {
    console.error("recordComprehensionSelfCheck failed:", error);
  }
}

const DictationInputSchema = z.object({
  storyId: z.string().uuid(),
  drillId: z.string().uuid().nullable().optional(),
  responseText: z.string().max(1000),
  sessionId: z.string().uuid().optional(),
});

export type DictationAttemptResult = {
  saved: boolean;
  accuracy: number | null;
};

/**
 * Persists one dictation attempt and updates phonetic evidence.
 *
 * Accuracy is computed here from the reference sentence on the drill. The
 * client sends only text: a browser cannot report its own score.
 */
export async function recordDictationAttempt(
  input: z.input<typeof DictationInputSchema>
): Promise<DictationAttemptResult> {
  try {
    const parsed = DictationInputSchema.safeParse(input);
    if (!parsed.success) return { saved: false, accuracy: null };

    const learner = await currentLearner();
    if (!learner) return { saved: false, accuracy: null };

    const { supabase, userId } = learner;
    const { storyId, responseText, sessionId } = parsed.data;

    const { data: drill } = await supabase
      .from("pronunciation_drills")
      .select("id, story_id, practica_coral_standard")
      .eq("story_id", storyId)
      .maybeSingle();

    if (!drill) return { saved: false, accuracy: null };

    const referenceText = (drill.practica_coral_standard as string) ?? "";
    const score = scoreDictation(referenceText, responseText);

    const { count } = await supabase
      .from("dictation_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("story_id", storyId);

    const { data: inserted, error } = await supabase
      .from("dictation_attempts")
      .insert({
        user_id: userId,
        story_id: storyId,
        pronunciation_drill_id: drill.id as string,
        course_session_id: sessionId ?? null,
        attempt_number: (count ?? 0) + 1,
        response_text: responseText,
        accuracy: score.accuracy,
        error_analysis: {
          missed_words: score.missedWords,
          correct_count: score.correctCount,
          total_count: score.totalCount,
        },
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("recordDictationAttempt failed:", error.message);
      return { saved: false, accuracy: score.accuracy };
    }

    const struggled = dictationNeedsMorePractice(score);
    const { tags } = await loadStoryPhoneticTagIds(supabase, storyId);

    await recordStoryActivityEvidence(supabase, {
      userId,
      storyId,
      sourceType: "dictation",
      positiveStatus: "practiced",
      focusTagIds: struggled ? tags : [],
      sourceId: (inserted?.id as string) ?? null,
      evidenceDetail: {
        accuracy: score.accuracy,
        missed_words: score.missedWords,
      },
    });

    return { saved: true, accuracy: score.accuracy };
  } catch (error) {
    console.error("recordDictationAttempt failed:", error);
    return { saved: false, accuracy: null };
  }
}

/** Phonetic tag ids on a story, used to target a dictation struggle. */
async function loadStoryPhoneticTagIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string
): Promise<{ tags: string[] }> {
  const { data, error } = await supabase
    .from("content_tags")
    .select("tag_id")
    .eq("content_type", "story")
    .eq("content_id", storyId)
    .eq("tag_type", "phonetic");

  if (error) return { tags: [] };
  return { tags: (data ?? []).map((row) => row.tag_id as string) };
}

const PersonalResponseSchema = z.object({
  personalQuestionId: z.string().uuid(),
  responseText: z.string().min(1).max(1000),
  attemptNumber: z.number().int().min(1).max(10),
  correctionCount: z.number().int().min(0).max(200).optional(),
  sessionId: z.string().uuid().optional(),
});

/**
 * Persists a personal question answer after AI feedback.
 *
 * Evidence is "practiced" only. One whole-sentence correction is too coarse to
 * blame a specific grammar topic, so this never writes needs_more_practice.
 */
export async function recordPersonalResponse(
  input: z.input<typeof PersonalResponseSchema>
): Promise<void> {
  try {
    const parsed = PersonalResponseSchema.safeParse(input);
    if (!parsed.success) return;

    const learner = await currentLearner();
    if (!learner) return;

    const { supabase, userId } = learner;
    const { personalQuestionId, responseText, attemptNumber, sessionId } =
      parsed.data;

    const { data: question } = await supabase
      .from("personal_questions")
      .select("id, story_id")
      .eq("id", personalQuestionId)
      .maybeSingle();

    if (!question) return;

    const { data: inserted, error } = await supabase
      .from("personal_responses")
      .insert({
        user_id: userId,
        personal_question_id: personalQuestionId,
        course_session_id: sessionId ?? null,
        response_text: responseText,
        attempt_number: attemptNumber,
        feedback_json:
          parsed.data.correctionCount === undefined
            ? null
            : { correction_count: parsed.data.correctionCount },
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("recordPersonalResponse failed:", error.message);
      return;
    }

    await recordStoryActivityEvidence(supabase, {
      userId,
      storyId: question.story_id as string,
      sourceType: "personal_response",
      positiveStatus: "practiced",
      sourceId: (inserted?.id as string) ?? null,
      evidenceDetail:
        parsed.data.correctionCount === undefined
          ? {}
          : { correction_count: parsed.data.correctionCount },
    });
  } catch (error) {
    console.error("recordPersonalResponse failed:", error);
  }
}
