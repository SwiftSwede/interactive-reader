import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceStatus, StoryLevel } from "@/types";
import { loadTagIndex } from "./content-tags";
import {
  recommendNextActivity,
  resolveContentHref,
} from "./recommend-next";
import { getEvidenceForUser } from "./topic-evidence";

export type ProgressReading = {
  completed: number;
  inProgress: number;
};

export type DictationTrendPoint = {
  submittedAt: string;
  accuracy: number;
  storyTitle: string | null;
};

export type PronunciationHistoryItem = {
  createdAt: string;
  referenceText: string;
  accuracyScore: number | null;
  weakSounds: string[];
};

export type SuggestedActivity = {
  href: string;
  title: string;
  contentType: "story" | "writing_prompt" | "exam_prompt";
};

export type TopicSummary = {
  name: string;
  displayName: string;
  status: EvidenceStatus;
};

export type StudentProgress = {
  reading: ProgressReading;
  wordsLookedUp: number;
  dictationTrend: DictationTrendPoint[];
  pronunciationHistory: PronunciationHistoryItem[];
  strugglingTopics: TopicSummary[];
  suggested: SuggestedActivity | null;
};

/**
 * Everything the /progress page needs in one load.
 * Missing tables or a half-applied schema return empty data, not a thrown
 * error: the page still has something calm to show.
 */
export async function loadStudentProgress(
  supabase: SupabaseClient,
  userId: string,
  preferredLevel: StoryLevel | null
): Promise<StudentProgress> {
  const empty: StudentProgress = {
    reading: { completed: 0, inProgress: 0 },
    wordsLookedUp: 0,
    dictationTrend: [],
    pronunciationHistory: [],
    strugglingTopics: [],
    suggested: null,
  };

  try {
    const [
      progressResult,
      lookupCountResult,
      dictationResult,
      pronunciationResult,
      evidence,
      tagIndex,
    ] = await Promise.all([
      supabase
        .from("user_progress")
        .select("status")
        .eq("user_id", userId),
      supabase
        .from("word_lookups")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("dictation_attempts")
        .select("submitted_at, accuracy, stories ( title )")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: true })
        .limit(12),
      supabase
        .from("pronunciation_attempts")
        .select("created_at, reference_text, accuracy_score, weak_sounds")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      getEvidenceForUser(supabase, userId),
      loadTagIndex(supabase),
    ]);

    const readingRows = progressResult.data ?? [];
    const reading: ProgressReading = {
      completed: readingRows.filter((row) => row.status === "completed").length,
      inProgress: readingRows.filter((row) => row.status === "in-progress")
        .length,
    };

    const dictationTrend: DictationTrendPoint[] = (
      dictationResult.data ?? []
    ).flatMap((row) => {
      if (typeof row.accuracy !== "number") return [];
      const story = row.stories as { title?: string } | { title?: string }[] | null;
      const title = Array.isArray(story)
        ? (story[0]?.title ?? null)
        : (story?.title ?? null);
      return [
        {
          submittedAt: row.submitted_at as string,
          accuracy: row.accuracy,
          storyTitle: title,
        },
      ];
    });

    const pronunciationHistory: PronunciationHistoryItem[] = (
      pronunciationResult.data ?? []
    ).map((row) => ({
      createdAt: row.created_at as string,
      referenceText: (row.reference_text as string) ?? "",
      accuracyScore:
        typeof row.accuracy_score === "number" ? row.accuracy_score : null,
      weakSounds: Array.isArray(row.weak_sounds)
        ? (row.weak_sounds as string[])
        : [],
    }));

    const strugglingTopics: TopicSummary[] = evidence
      .filter((row) => row.status === "needs_more_practice")
      .map((row) => {
        const tag = tagIndex.get(row.tagId);
        return {
          name: tag?.name ?? row.tagId,
          displayName: tag?.displayName ?? "Este tema",
          status: row.status,
        };
      })
      .slice(0, 4);

    const recommendation = await recommendNextActivity(
      supabase,
      userId,
      preferredLevel
    );
    const resolved = recommendation
      ? await resolveContentHref(supabase, recommendation)
      : null;

    return {
      reading,
      wordsLookedUp: lookupCountResult.count ?? 0,
      dictationTrend,
      pronunciationHistory,
      strugglingTopics,
      suggested: resolved
        ? {
            href: resolved.href,
            title: resolved.title,
            contentType: recommendation!.contentType,
          }
        : null,
    };
  } catch (error) {
    console.error("loadStudentProgress failed:", error);
    return empty;
  }
}
