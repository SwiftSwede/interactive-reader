import { readFileSync } from "fs";
import { join } from "path";
import InteractiveStory from "@/components/InteractiveStory";
import ComprehensionQuestions from "@/components/ComprehensionQuestions";
import PersonalQuestions from "@/components/PersonalQuestions";
import DictationPractice from "@/components/DictationPractice";
import MicroExplanation from "@/components/MicroExplanation";
import type { LoadedStory } from "@/lib/stories";

export default function StoryReader({ data }: { data: LoadedStory }) {
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
      <header className="border-b border-gray-100 px-4 py-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-500">Profe Kyle</p>
          <h1 className="text-lg font-semibold text-gray-900">{story.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {story.level} - {story.cefr} - {story.word_count} palabras
          </p>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{story.title}</h2>

        <MicroExplanation text="Leer en ingles es la base de todo. Tu cerebro necesita ver las palabras en contexto para aprenderlas de verdad. Toca cualquier palabra para ver su traduccion y pronunciacion." />

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

        <p className="text-center text-gray-400 mt-8 italic">The End</p>

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
