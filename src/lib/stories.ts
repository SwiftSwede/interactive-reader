import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordData, ExpressionData } from "@/components/WordTooltip";

export type StoryRow = {
  id: string;
  title: string;
  slug: string;
  level: string;
  cefr: string;
  body_text: string;
  body_html: string;
  word_count: number;
  is_free: boolean;
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
};

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
    pronunciationDrill: (drill as PronunciationDrillRow | null) ?? null,
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
