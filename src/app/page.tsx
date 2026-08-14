import { supabase } from "@/lib/supabase";
import InteractiveStory from "@/components/InteractiveStory";
import type { WordData, ExpressionData } from "@/components/WordTooltip";

// ── Types matching Supabase snake_case columns ─────────────

type StoryRow = {
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

type CompQuestionRow = {
  id: string;
  story_id: string;
  position: number;
  question: string;
  answer: string | null;
  level: string;
};

type PersonalQuestionRow = {
  id: string;
  story_id: string;
  position: number;
  question: string;
};

type PronunciationDrillRow = {
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

// ── Data fetching ──────────────────────────────────────────

async function getFreeStory() {
  if (!supabase) return null;

  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("is_free", true)
    .single();

  if (error || !story) return null;

  const storyRow = story as StoryRow;

  // Fetch all words for this story (Supabase default limit is 1000, we have 1132)
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
    .single();

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
    })) as WordData[],
    expressions: (expressions || []).map((e) => ({
      id: (e as ExpressionRow).id,
      text: (e as ExpressionRow).text,
      spanish_translation: (e as ExpressionRow).spanish_translation,
      explanation: (e as ExpressionRow).explanation,
    })) as ExpressionData[],
    comprehensionQuestions: (compQuestions || []) as CompQuestionRow[],
    personalQuestions: (personalQuestions || []) as PersonalQuestionRow[],
    pronunciationDrill: drill as PronunciationDrillRow | null,
  };
}

// ── Page ───────────────────────────────────────────────────

export default async function StoryPage() {
  const data = await getFreeStory();

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-500">
          No se pudo cargar la historia. Verifica la conexion a la base de datos.
        </p>
      </main>
    );
  }

  const {
    story,
    words,
    expressions,
    comprehensionQuestions,
    personalQuestions,
    pronunciationDrill,
  } = data;

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-4 py-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-500">Profe Kyle</p>
          <h1 className="text-lg font-semibold text-gray-900">{story.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {story.level} - {story.cefr} - {story.word_count} palabras
          </p>
        </div>
      </header>

      {/* Story body */}
      <article className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{story.title}</h2>

        {/* Play button placeholder (Slice 7 will add audio) */}
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-400">Audio coming soon</p>
        </div>

        {/* Interactive story text */}
        <InteractiveStory
          bodyText={story.body_text}
          words={words}
          expressions={expressions}
        />

        {/* End marker */}
        <p className="text-center text-gray-400 mt-8 italic">The End</p>

        {/* Comprehension Questions */}
        {comprehensionQuestions.length > 0 && (
          <section className="mt-12 border-t border-gray-100 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comprehension Questions
            </h3>
            <div className="space-y-4">
              {comprehensionQuestions.map((q, idx) => (
                <div key={q.id} className="rounded-lg border border-gray-100 p-4">
                  <p className="font-medium text-gray-900 mb-2">
                    {idx + 1}. {q.question}
                  </p>
                  {q.answer && (
                    <p className="text-sm text-gray-600">
                      <span className="text-gray-400">Answer: </span>
                      {q.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Personal Questions */}
        {personalQuestions.length > 0 && (
          <section className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Questions
            </h3>
            <div className="space-y-3">
              {personalQuestions.map((q, idx) => (
                <p key={q.id} className="text-gray-800">
                  {idx + 1}. {q.question}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Extreme Pronunciation */}
        {pronunciationDrill && (
          <section className="mt-8 border-t border-gray-100 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Extreme Pronunciation
            </h3>

            {/* Symbol legend */}
            {pronunciationDrill.symbol_legend && (
              <div className="rounded-lg bg-gray-50 p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Sounds that dont exist
                </p>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                  {pronunciationDrill.symbol_legend}
                </pre>
              </div>
            )}

            {/* Practica Coral */}
            {pronunciationDrill.practica_coral_standard && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Practica Coral
                </p>
                <p className="text-gray-800 mb-2">
                  {pronunciationDrill.practica_coral_standard}
                </p>
                <p className="text-gray-500 italic">
                  {pronunciationDrill.practica_coral_phonetic}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Upgrade CTA placeholder (Phase 2 will add Stripe) */}
        <div className="mt-12 mb-8 rounded-xl bg-gray-50 border border-gray-100 p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">
            Want more stories like this?
          </p>
          <p className="text-sm text-gray-500">
            Unlock all 50+ stories for $47
          </p>
          <p className="text-xs text-gray-400 mt-2">Coming soon</p>
        </div>
      </article>
    </main>
  );
}