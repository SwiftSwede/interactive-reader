import { supabase } from "@/lib/supabase";
import { readFileSync } from "fs";
import { join } from "path";
import InteractiveStory from "@/components/InteractiveStory";
import ComprehensionQuestions from "@/components/ComprehensionQuestions";
import PersonalQuestions from "@/components/PersonalQuestions";
import DictationPractice from "@/components/DictationPractice";
import MicroExplanation from "@/components/MicroExplanation";
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
      audio_url: w.audio_url,
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{story.title}</h2>

        <MicroExplanation text="Leer en ingles es la base de todo. Tu cerebro necesita ver las palabras en contexto para aprenderlas de verdad. Toca cualquier palabra para ver su traduccion y pronunciacion." />

        {/* Interactive story text with audio */}
        <InteractiveStory
          bodyText={story.body_text}
          words={words}
          expressions={expressions}
          audioUrl="/audio/stories/pre-int-story-the-soccer-jersey.mp3"
          timestamps={JSON.parse(
            readFileSync(
              join(process.cwd(), "public/audio/stories/word-timestamps.json"),
              "utf-8"
            )
          )}
        />

        {/* End marker */}
        <p className="text-center text-gray-400 mt-8 italic">The End</p>

        {/* Comprehension Questions */}
        {comprehensionQuestions.length > 0 && (
          <>
            <MicroExplanation text="Contesta antes de ver la respuesta. Si la lees primero, tu cerebro no trabaja. El esfuerzo de intentar es donde ocurre el aprendizaje. Escribir tu respuesta te ayuda a fijar el vocabulario en la memoria." />
            <ComprehensionQuestions
              questions={comprehensionQuestions.map((q) => ({
                id: q.id,
                position: q.position,
                question: q.question,
                answer: q.answer,
              }))}
            />
          </>
        )}

        {/* Personal Questions with AI feedback */}
        {personalQuestions.length > 0 && (
          <>
            <MicroExplanation text="Estas preguntas no tienen una respuesta correcta. Conectan la historia con tu vida y te hacen pensar en como usar el vocabulario nuevo. El Profe Kyle te da feedback enfocado en una o dos cosas para mejorar." />
            <PersonalQuestions
              questions={personalQuestions.map((q) => ({
                id: q.id,
                position: q.position,
                question: q.question,
              }))}
            />
          </>
        )}

        {/* Dictation from Práctica Coral (Slice 8c) */}
        {pronunciationDrill && pronunciationDrill.practica_coral_standard && (
          <DictationPractice
            audioUrl="/audio/stories/practica-coral-soccery-jersey.mp3"
            standardText={pronunciationDrill.practica_coral_standard}
            phoneticText={pronunciationDrill.practica_coral_phonetic}
            explanation={`Most: El sonido "O" en ingles es un diptongo, no un sonido simple como en espanol. Tienen que ser dos sonidos juntos: O-U. Si lo pronuncias como la O del espanol, sonara raro.

Of: Antes de una palabra que empieza con consonante, se reduce a solo la schwa. Por eso suena "mosta", no "most of".

The: La vocal de "the" normalmente se reduce, pero aqui, como la siguiente palabra empieza con vocal, suena como "thee". Ademas, para no hacer una pausa entre "thee" y "other", anadimos una Y que conecta las dos palabras. Suena "the-y-other". El "th" tiene vibracion, no es como la "z" del espanol.

Kids: La S final suena como Z, no como S. La I de "kids" es una I corta, como en "bit".

Wore: Igual que "most", asegurate de que sea un diptongo: O-U. Si pronuncias la O como en espanol, sonara ligeramente mal.

Their: Igual que "the", el "th" tiene vibracion. "Messi" se pronuncia igual en ingles y espanol.

Jersey: Empieza con el sonido suave de la G (como en "jinete"). No pronuncies la primera E como si fuera una E del espanol. La S final suena como Z, y termina en un sonido de E.`}
            microExplanation="Sabias que la mayoria de los errores de escucha no son por falta de vocabulario, sino porque las palabras suenan diferente cuando se hablan rapido? Este ejercicio te muestra exactamente donde tu oido te falla."
          />
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