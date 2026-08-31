import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  VideoSummaryFreeWrite,
  VideoSummaryNoteType,
  VideoSummaryParagraph,
  VideoSummaryTeachingNote,
} from "@/types";

export type VideoSummaryParagraphRow = {
  id: string;
  story_id: string;
  position: number;
  spanish_text: string;
  english_translation: string | null;
  translation_started_at: string | null;
  translation_completed_at: string | null;
};

export function mapParagraphRow(
  row: VideoSummaryParagraphRow
): VideoSummaryParagraph {
  return {
    id: row.id,
    storyId: row.story_id,
    position: row.position,
    spanishText: row.spanish_text,
    englishTranslation: row.english_translation,
    translationStartedAt: row.translation_started_at,
    translationCompletedAt: row.translation_completed_at,
  };
}

export async function loadVideoSummaryParagraphs(
  supabase: SupabaseClient,
  storyId: string
): Promise<VideoSummaryParagraph[]> {
  const { data, error } = await supabase
    .from("video_summary_paragraphs")
    .select(
      "id, story_id, position, spanish_text, english_translation, translation_started_at, translation_completed_at"
    )
    .eq("story_id", storyId)
    .order("position", { ascending: true });

  if (error || !data) return [];
  return (data as VideoSummaryParagraphRow[]).map(mapParagraphRow);
}

export async function loadVideoSummaryNotes(
  supabase: SupabaseClient,
  sessionId: string
): Promise<VideoSummaryTeachingNote[]> {
  const { data, error } = await supabase
    .from("video_summary_teaching_notes")
    .select(
      "id, story_id, course_session_id, paragraph_position, selected_text, note, note_type, created_by, created_at"
    )
    .eq("course_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (
    data as {
      id: string;
      story_id: string;
      course_session_id: string;
      paragraph_position: number;
      selected_text: string;
      note: string;
      note_type: string;
      created_by: string;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.id,
    storyId: row.story_id,
    courseSessionId: row.course_session_id,
    paragraphPosition: row.paragraph_position,
    selectedText: row.selected_text,
    note: row.note,
    noteType: (row.note_type as VideoSummaryNoteType) || "vocabulary",
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export async function loadOwnFreeWrite(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<VideoSummaryFreeWrite | null> {
  const { data, error } = await supabase
    .from("video_summary_free_writes")
    .select(
      "id, story_id, user_id, course_session_id, submission_text, started_at, submitted_at, elapsed_seconds, word_count"
    )
    .eq("course_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    storyId: data.story_id,
    userId: data.user_id,
    courseSessionId: data.course_session_id,
    submissionText: data.submission_text,
    startedAt: data.started_at,
    submittedAt: data.submitted_at,
    elapsedSeconds: data.elapsed_seconds ?? 0,
    wordCount: data.word_count ?? 0,
  };
}

export function englishParagraphsFromBody(bodyText: string): string[] {
  return bodyText
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean);
}
