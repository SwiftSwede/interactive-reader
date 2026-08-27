import { createClient } from "@/lib/supabase/server";
import InteractiveStory from "@/components/InteractiveStory";
import ComprehensionQuestions, {
  type SavedComprehensionResponse,
} from "@/components/ComprehensionQuestions";
import PersonalQuestions from "@/components/PersonalQuestions";
import DictationPractice from "@/components/DictationPractice";
import ChoralPractice from "@/components/ChoralPractice";
import MicroExplanation from "@/components/MicroExplanation";
import SoundVideoProvider from "@/components/SoundVideoProvider";
import { getSoundVideos } from "@/lib/sound-videos";
import {
  SOCCER_JERSEY_CORAL_IPA,
  SOCCER_JERSEY_WORD_NOTES,
} from "@/lib/sound-catalog";
import type { LoadedStory } from "@/lib/stories";
import { readFileSync } from "fs";
import { join } from "path";

const FALLBACK_CORAL_AUDIO = "/audio/stories/practica-coral-soccery-jersey.mp3";

export default async function StoryReader({
  data,
  allowReveal = true,
  unlockAt,
  sessionId,
  savedResponses,
  trackLookups = false,
  readerMode = "open",
}: {
  data: LoadedStory;
  allowReveal?: boolean;
  unlockAt?: string;
  sessionId?: string;
  savedResponses?: SavedComprehensionResponse[];
  trackLookups?: boolean;
  readerMode?: "classroom-live" | "classroom-review" | "open";
}) {
  const {
    story,
    words,
    expressions,
    comprehensionQuestions,
    personalQuestions,
    pronunciationDrill,
  } = data;

  const supabase = await createClient();
  const soundVideos = await getSoundVideos(supabase);

  let choralCompleted = false;
  if (readerMode !== "classroom-live") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: completion, error: completionError } = await supabase
        .from("choral_practice_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("story_id", story.id)
        .maybeSingle();
      if (!completionError) {
        choralCompleted = Boolean(completion);
      }
    }
  }

  const showPractice = readerMode !== "classroom-live";
  const coralAudio =
    pronunciationDrill?.coral_audio_url || FALLBACK_CORAL_AUDIO;
  const coralIpa =
    pronunciationDrill?.practica_coral_ipa ||
    (story.slug === "the-soccer-jersey" ? SOCCER_JERSEY_CORAL_IPA : "");
  const wordNotes =
    pronunciationDrill && pronunciationDrill.word_notes.length > 0
      ? pronunciationDrill.word_notes
      : story.slug === "the-soccer-jersey"
        ? SOCCER_JERSEY_WORD_NOTES
        : [];

  return (
    <SoundVideoProvider videos={soundVideos}>
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
            storyId={story.id}
            sessionId={sessionId}
            trackLookups={trackLookups}
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
                allowReveal={allowReveal}
                unlockAt={unlockAt}
                sessionId={sessionId}
                savedResponses={savedResponses}
              />
            </>
          )}

          {personalQuestions.length > 0 && (
            <>
              {readerMode !== "classroom-live" && (
                <MicroExplanation text="Estas preguntas no tienen una respuesta correcta. Conectan la historia con tu vida y te hacen pensar en como usar el vocabulario nuevo. El Profe Kyle te da feedback enfocado en una o dos cosas para mejorar." />
              )}
              <PersonalQuestions
                questions={personalQuestions.map((q) => ({
                  id: q.id,
                  position: q.position,
                  question: q.question,
                }))}
                mode={readerMode === "classroom-live" ? "classroom-live" : "write"}
              />
            </>
          )}

          {showPractice &&
            pronunciationDrill &&
            pronunciationDrill.practica_coral_standard && (
              <>
                <DictationPractice
                  audioUrl={coralAudio}
                  standardText={pronunciationDrill.practica_coral_standard}
                  phoneticText={pronunciationDrill.practica_coral_phonetic}
                  ipaText={coralIpa}
                  wordNotes={wordNotes}
                  microExplanation="Sabias que la mayoria de los errores de escucha no son por falta de vocabulario, sino porque las palabras suenan diferente cuando se hablan rapido? Este ejercicio te muestra exactamente donde tu oido te falla."
                />
                <ChoralPractice
                  audioUrl={coralAudio}
                  storyId={story.id}
                  alreadyCompleted={choralCompleted}
                />
              </>
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
    </SoundVideoProvider>
  );
}
