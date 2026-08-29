"use client";

import { useEffect, useMemo, useState } from "react";
import InteractiveStory, { type WordTimestamp } from "./InteractiveStory";
import ComprehensionQuestions, {
  type SavedComprehensionResponse,
} from "./ComprehensionQuestions";
import PersonalQuestions from "./PersonalQuestions";
import DictationPractice from "./DictationPractice";
import ChoralPractice from "./ChoralPractice";
import PronunciationPractice from "./PronunciationPractice";
import MicroExplanation from "./MicroExplanation";
import StoryTextSheet from "./StoryTextSheet";
import { PlaybackRateProvider } from "./PlaybackRateContext";
import type { LoadedStory } from "@/lib/stories";
import type { PronunciationWordNote } from "@/types";

type StepId =
  | "story"
  | "comprehension"
  | "personal"
  | "dictation"
  | "choral"
  | "pronunciation";

type Step = {
  id: StepId;
  label: string;
};

const STORY_AUDIO_URL = "/audio/stories/pre-int-story-the-soccer-jersey.mp3";

export default function StorySteps({
  data,
  timestamps,
  allowReveal = true,
  unlockAt,
  sessionId,
  savedResponses,
  trackLookups = false,
  readerMode = "open",
  showPractice,
  coralAudio,
  coralIpa,
  wordNotes,
  choralCompleted,
}: {
  data: LoadedStory;
  timestamps: WordTimestamp[];
  allowReveal?: boolean;
  unlockAt?: string;
  sessionId?: string;
  savedResponses?: SavedComprehensionResponse[];
  trackLookups?: boolean;
  readerMode?: "classroom-live" | "classroom-review" | "open";
  showPractice: boolean;
  coralAudio: string;
  coralIpa: string;
  wordNotes: PronunciationWordNote[];
  choralCompleted: boolean;
}) {
  const {
    story,
    words,
    expressions,
    comprehensionQuestions,
    personalQuestions,
    pronunciationDrill,
  } = data;

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [{ id: "story", label: "El cuento" }];
    if (comprehensionQuestions.length > 0) {
      list.push({ id: "comprehension", label: "Comprensión" });
    }
    if (personalQuestions.length > 0) {
      list.push({ id: "personal", label: "Personal" });
    }
    if (showPractice && pronunciationDrill?.practica_coral_standard) {
      list.push({ id: "dictation", label: "Dictado" });
      list.push({ id: "choral", label: "Coral" });
      list.push({ id: "pronunciation", label: "Pronunciación" });
    }
    return list;
  }, [
    comprehensionQuestions.length,
    personalQuestions.length,
    showPractice,
    pronunciationDrill?.practica_coral_standard,
  ]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const safeIndex = Math.min(activeIndex, steps.length - 1);
  const active = steps[safeIndex];
  const prev = safeIndex > 0 ? steps[safeIndex - 1] : null;
  const next = safeIndex < steps.length - 1 ? steps[safeIndex + 1] : null;
  const isLast = safeIndex === steps.length - 1;
  const isStory = active.id === "story";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active.id]);

  const goTo = (index: number) => {
    setSheetOpen(false);
    setActiveIndex(index);
  };

  const storyProps = {
    bodyText: story.body_text,
    words,
    expressions,
    audioUrl: STORY_AUDIO_URL,
    timestamps,
    storyId: story.id,
    sessionId,
    trackLookups,
  };

  return (
    <PlaybackRateProvider>
      <main className="story-page min-h-screen">
        <div className="story-page-header border-b border-[var(--paper-line)] sticky top-0 backdrop-blur-sm z-20">
          <header className="px-4 pt-4 pb-2">
            <div className="max-w-2xl mx-auto">
              <p className="text-sm text-gray-500">Profe Kyle</p>
              <h1 className="text-lg font-semibold text-gray-900">{story.title}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {story.level} - {story.cefr} - {story.word_count} palabras
              </p>
            </div>
          </header>
          <nav className="step-progress max-w-2xl mx-auto px-2" aria-label="Pasos">
            {steps.map((step, index) => (
              <div key={step.id} className="contents">
                {index > 0 && (
                  <div
                    className={`step-progress-line${
                      index <= safeIndex ? " step-progress-line-filled" : ""
                    }`}
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  className="step-progress-hit"
                  aria-label={step.label}
                  aria-current={index === safeIndex ? "step" : undefined}
                  onClick={() => goTo(index)}
                >
                  <span
                    className={`step-progress-dot${
                      index < safeIndex
                        ? " step-progress-dot-done"
                        : index === safeIndex
                          ? " step-progress-dot-active"
                          : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </nav>
        </div>

        <article className="max-w-2xl mx-auto px-4 py-6">
          <div key={active.id} className="step-panel">
            {!isStory && (
              <button
                type="button"
                className="story-text-btn"
                onClick={() => setSheetOpen(true)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
                </svg>
                Ver el texto
              </button>
            )}

            {active.id === "story" && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {story.title}
                </h2>
                <MicroExplanation text="Leer en ingles es la base de todo. Tu cerebro necesita ver las palabras en contexto para aprenderlas de verdad. Toca cualquier palabra para ver su traduccion y pronunciacion." />
                <InteractiveStory {...storyProps} />
                <p className="text-center text-gray-400 mt-8 italic">The End</p>
              </>
            )}

            {active.id === "comprehension" && (
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

            {active.id === "personal" && (
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

            {active.id === "dictation" && pronunciationDrill && (
              <DictationPractice
                audioUrl={coralAudio}
                standardText={pronunciationDrill.practica_coral_standard}
                phoneticText={pronunciationDrill.practica_coral_phonetic}
                ipaText={coralIpa}
                wordNotes={wordNotes}
                microExplanation="Sabias que la mayoria de los errores de escucha no son por falta de vocabulario, sino porque las palabras suenan diferente cuando se hablan rapido? Este ejercicio te muestra exactamente donde tu oido te falla."
              />
            )}

            {active.id === "choral" && (
              <ChoralPractice
                audioUrl={coralAudio}
                storyId={story.id}
                alreadyCompleted={choralCompleted}
              />
            )}

            {active.id === "pronunciation" && pronunciationDrill && (
              <PronunciationPractice
                referenceText={pronunciationDrill.practica_coral_standard}
                kyleIpa={coralIpa}
              />
            )}

            {isLast && (
              <div className="mt-12 mb-4 rounded-xl bg-gray-50 border border-gray-100 p-6 text-center">
                <p className="text-gray-700 font-medium mb-2">
                  Want more stories like this?
                </p>
                <p className="text-sm text-gray-500">
                  Unlock all 50+ stories for $47
                </p>
                <p className="text-xs text-gray-400 mt-2">Coming soon</p>
              </div>
            )}
          </div>

          <nav className="step-nav" aria-label="Navegación de pasos">
            {prev && (
              <button
                type="button"
                className="step-nav-btn"
                onClick={() => goTo(safeIndex - 1)}
              >
                ← {prev.label}
              </button>
            )}
            {next && (
              <button
                type="button"
                className="step-nav-btn step-nav-btn-next"
                onClick={() => goTo(safeIndex + 1)}
              >
                {next.label} →
              </button>
            )}
          </nav>
        </article>

        <StoryTextSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          {...storyProps}
        />
      </main>
    </PlaybackRateProvider>
  );
}
