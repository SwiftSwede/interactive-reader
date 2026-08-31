// Loads rows from Postgres `stories` (reader-backed lessons). Public path is
// /lesson/[slug]. Writing and exams are not in this table. See PRD Section 4.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordData, ExpressionData } from "@/components/WordTooltip";
import type { PronunciationWordNote } from "@/types";
import { stripStressMarks } from "@/lib/pronunciation/referenceText";

export type StoryRow = {
  id: string;
  title: string;
  slug: string;
  level: string;
  // Optional until schema-phase4a.sql runs. Display only: dialogues and Movie
  // Talks are still content_type "story" in the knowledge graph.
  kind?: string | null;
  cefr: string;
  body_text: string;
  body_html: string;
  word_count: number;
  is_free: boolean;
  youtube_url?: string | null;
  lyric_blanks?: unknown;
  spanish_summary?: string | null;
  free_write_minutes?: number | null;
  created_at: string;
  updated_at: string;
};

export type CompQuestionRow = {
  id: string;
  story_id: string;
  position: number;
  question: string;
  answer: string | null;
  level: string;
};

export type PersonalQuestionRow = {
  id: string;
  story_id: string;
  position: number;
  question: string;
};

export type PronunciationDrillRow = {
  id: string;
  story_id: string;
  symbol_legend: string | null;
  focus_type: string;
  focus_content: string;
  practica_coral_standard: string;
  practica_coral_phonetic: string;
  practica_coral_ipa: string;
  word_notes: PronunciationWordNote[];
  coral_audio_url: string;
  coral_explanation: string | null;
};

function parseWordNotes(value: unknown): PronunciationWordNote[] {
  if (!Array.isArray(value)) return [];
  const notes: PronunciationWordNote[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { word?: unknown }).word === "string" &&
      typeof (item as { note?: unknown }).note === "string"
    ) {
      notes.push({
        word: (item as PronunciationWordNote).word,
        note: (item as PronunciationWordNote).note,
      });
    }
  }
  return notes;
}

type WordRow = {
  id: string;
  story_id: string;
  position: number;
  text: string;
  lemma: string;
  spanish_translation: string;
  phonetic_transcription: string;
  part_of_speech: string;
  audio_url: string;
  expression_id: string | null;
  is_transparent: boolean;
};

type ExpressionRow = {
  id: string;
  story_id: string;
  text: string;
  spanish_translation: string;
  explanation: string;
  word_ids: string[];
};

export type LoadedStory = {
  story: StoryRow;
  words: WordData[];
  expressions: ExpressionData[];
  comprehensionQuestions: CompQuestionRow[];
  personalQuestions: PersonalQuestionRow[];
  pronunciationDrill: PronunciationDrillRow | null;
};

async function loadStoryRelated(
  supabase: SupabaseClient,
  storyRow: StoryRow
): Promise<LoadedStory> {
  const { data: wordsPage1 } = await supabase
    .from("words")
    .select("*")
    .eq("story_id", storyRow.id)
    .order("position", { ascending: true })
    .range(0, 999);

  const { data: wordsPage2 } = await supabase
    .from("words")
    .select("*")
    .eq("story_id", storyRow.id)
    .order("position", { ascending: true })
    .range(1000, 1999);

  const wordRows = [...(wordsPage1 || []), ...(wordsPage2 || [])] as WordRow[];

  const { data: expressions } = await supabase
    .from("expressions")
    .select("*")
    .eq("story_id", storyRow.id);

  const { data: compQuestions } = await supabase
    .from("comprehension_questions")
    .select("*")
    .eq("story_id", storyRow.id)
    .order("position", { ascending: true });

  const { data: personalQuestions } = await supabase
    .from("personal_questions")
    .select("*")
    .eq("story_id", storyRow.id)
    .order("position", { ascending: true });

  const { data: drill } = await supabase
    .from("pronunciation_drills")
    .select("*")
    .eq("story_id", storyRow.id)
    .maybeSingle();

  return {
    story: storyRow,
    words: wordRows.map((w) => ({
      id: w.id,
      position: w.position,
      text: w.text,
      spanish_translation: w.spanish_translation,
      phonetic_transcription: w.phonetic_transcription,
      part_of_speech: w.part_of_speech,
      is_transparent: w.is_transparent,
      expression_id: w.expression_id,
      audio_url: w.audio_url,
    })),
    expressions: (expressions || []).map((e) => ({
      id: (e as ExpressionRow).id,
      text: (e as ExpressionRow).text,
      spanish_translation: (e as ExpressionRow).spanish_translation,
      explanation: (e as ExpressionRow).explanation,
    })),
    comprehensionQuestions: (compQuestions || []) as CompQuestionRow[],
    personalQuestions: (personalQuestions || []) as PersonalQuestionRow[],
        pronunciationDrill: drill
      ? {
          ...(drill as PronunciationDrillRow),
          practica_coral_standard: stripStressMarks(
            typeof (drill as PronunciationDrillRow).practica_coral_standard ===
              "string"
              ? (drill as PronunciationDrillRow).practica_coral_standard
              : ""
          ),
          practica_coral_ipa:
            typeof (drill as { practica_coral_ipa?: unknown })
              .practica_coral_ipa === "string"
              ? (drill as PronunciationDrillRow).practica_coral_ipa
              : "",
          coral_audio_url:
            typeof (drill as { coral_audio_url?: unknown }).coral_audio_url ===
            "string"
              ? (drill as PronunciationDrillRow).coral_audio_url
              : "",
          word_notes: parseWordNotes(
            (drill as { word_notes?: unknown }).word_notes
          ),
          coral_explanation:
            typeof (drill as { coral_explanation?: unknown })
              .coral_explanation === "string"
              ? (drill as PronunciationDrillRow).coral_explanation
              : null,
        }
      : null,
  };
}

export async function getFreeStory(
  supabase: SupabaseClient
): Promise<LoadedStory | null> {
  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("is_free", true)
    .single();

  if (error || !story) return null;
  return loadStoryRelated(supabase, story as StoryRow);
}

export async function getStoryBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<LoadedStory | null> {
  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !story) return null;
  return loadStoryRelated(supabase, story as StoryRow);
}
