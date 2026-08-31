"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import BackLink from "./BackLink";
import MusicBlanks, { youtubeEmbedId } from "./MusicBlanks";
import type { LyricBlank } from "@/types";
import { PlaybackRateProvider } from "./PlaybackRateContext";
import { recordStoryOpened } from "@/app/story/[slug]/actions";
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

// Audio files follow a slug-based convention:
//   /audio/stories/{slug}.mp3          — full story narration
//   /audio/stories/{slug}-timestamps.json — word-level timing for karaoke
// The server component (StoryReader.tsx) checks if the file exists and
// passes the URL + timestamps down. If no audio exists, the player is
// hidden and karaoke is disabled.

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
  storyAudioUrl,
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
  storyAudioUrl: string | null;
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

  const storyStepLabel =
    story.kind === "dialogue"
      ? "El diálogo"
      : story.kind === "movie_talk"
        ? "El video"
        : story.kind === "song"
          ? "La canción"
          : "El cuento";
  const kindLabel =
    story.kind === "dialogue"
      ? "Diálogo"
      : story.kind === "movie_talk"
        ? "Movie Talk"
        : story.kind === "song"
          ? "Música"
          : "Historia";

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [{ id: "story", label: storyStepLabel }];
    if (comprehensionQuestions.length > 0) {
      list.push({ id: "comprehension", label: "Comprensión" });
    }
    if (personalQuestions.length > 0) {
      list.push({ id: "personal", label: "Personal" });
    }
    if (showPractice && pronunciationDrill?.practica_coral_standard) {
      if (coralAudio) {
        list.push({ id: "dictation", label: "Dictado" });
        list.push({ id: "choral", label: "Coral" });
      }
      list.push({ id: "pronunciation", label: "Pronunciación" });
    }
    return list;
  }, [
    storyStepLabel,
    comprehensionQuestions.length,
    personalQuestions.length,
    showPractice,
    pronunciationDrill?.practica_coral_standard,
    coralAudio,
  ]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const safeIndex = Math.min(activeIndex, steps.length - 1);
  const active = steps[safeIndex];
  const prev = safeIndex > 0 ? steps[safeIndex - 1] : null;
  const next = safeIndex < steps.length - 1 ? steps[safeIndex + 1] : null;
  const isStory = active.id === "story";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active.id]);

  // Reading progress and passive topic exposure. One idempotent write per
  // story open; a no-op for anonymous readers.
  useEffect(() => {
    void recordStoryOpened({ storyId: story.id });
  }, [story.id]);

  const goTo = (index: number) => {
    setSheetOpen(false);
    setActiveIndex(index);
  };

  const youtubeId = youtubeEmbedId(story.youtube_url);
  const lyricBlanks: LyricBlank[] = Array.isArray(story.lyric_blanks)
    ? (story.lyric_blanks as LyricBlank[]).filter(
        (row) =>
          row &&
          typeof row.prompt === "string" &&
          typeof row.answer === "string"
      )
    : [];

  const storyProps = {
    bodyText: story.body_text,
    words,
    expressions,
    audioUrl: storyAudioUrl ?? "",
    hideAudio: !storyAudioUrl,
    timestamps,
    storyId: story.id,
    sessionId,
    trackLookups,
    kind: (story.kind ?? "story") as
      | "story"
      | "dialogue"
      | "movie_talk"
      | "song",
  };

  return (
    <PlaybackRateProvider>
      <main className="story-page min-h-screen">
        <div className="story-page-header border-b border-paper-line sticky top-0 backdrop-blur-sm z-20">
          <header className="px-4 pt-2 pb-2">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <BackLink href="/dashboard" showLabel />
                <p className="min-w-0 flex-1 text-label-sm text-text-muted">
                  Profe Kyle
                </p>
                <Link
                  href="/progress"
                  className="inline-flex h-11 items-center text-label-md text-text-secondary hover:text-text-accent"
                >
                  Tu progreso
                </Link>
              </div>
              <p className="text-label-sm text-text-muted mt-1">{kindLabel}</p>
              <h1 className="text-headline-md text-text-primary">
                {story.title}
              </h1>
              <p className="text-label-sm text-text-muted mt-0.5">
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
                  >
                    {index < safeIndex && (
                      <Check size={10} strokeWidth={3} aria-hidden="true" />
                    )}
                  </span>
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
                <BookOpen size={16} aria-hidden="true" />
                Ver el texto
              </button>
            )}

            {active.id === "story" && (
              <>
                <h2 className="text-headline-lg text-text-primary mb-2">
                  {story.title}
                </h2>
                {story.kind === "movie_talk" && (
                  <p className="mb-4 text-label-md text-text-secondary">
                    Escenas: toca el texto. Los cortes *** marcan cada clip.
                  </p>
                )}
                {story.kind === "song" && youtubeId && (
                  <div className="mb-6 overflow-hidden rounded-card border border-paper-line bg-text-primary">
                    <iframe
                      title={story.title}
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {story.kind === "song" && (
                  <MusicBlanks blanks={lyricBlanks} />
                )}
                <MicroExplanation
                  dismissKey="story"
                  text="Leer en ingles es la base de todo. Tu cerebro necesita ver las palabras en contexto para aprenderlas de verdad. Toca cualquier palabra para ver su traduccion y pronunciacion."
                />
                <InteractiveStory {...storyProps} />
                {story.kind !== "story" && story.kind !== "song" ? null : (
                <p className="text-center text-text-muted mt-8 italic">
                  The End
                </p>
                )}
              </>
            )}

            {active.id === "comprehension" && (
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
                microExplanation="Contesta antes de ver la respuesta. Si la lees primero, tu cerebro no trabaja. El esfuerzo de intentar es donde ocurre el aprendizaje. Escribir tu respuesta te ayuda a fijar el vocabulario en la memoria."
              />
            )}

            {active.id === "personal" && (
              <PersonalQuestions
                questions={personalQuestions.map((q) => ({
                  id: q.id,
                  position: q.position,
                  question: q.question,
                }))}
                mode={readerMode === "classroom-live" ? "classroom-live" : "write"}
                sessionId={sessionId}
                microExplanation={
                  readerMode === "classroom-live"
                    ? undefined
                    : "Estas preguntas no tienen una respuesta correcta. Conectan la historia con tu vida y te hacen pensar en como usar el vocabulario nuevo. El Profe Kyle te da feedback enfocado en una o dos cosas para mejorar."
                }
              />
            )}

            {active.id === "dictation" && pronunciationDrill && (
              <DictationPractice
                audioUrl={coralAudio}
                standardText={pronunciationDrill.practica_coral_standard}
                phoneticText={pronunciationDrill.practica_coral_phonetic}
                ipaText={coralIpa}
                wordNotes={wordNotes}
                storyId={story.id}
                sessionId={sessionId}
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
                storyId={story.id}
              />
            )}

          </div>

          <nav className="step-nav" aria-label="Navegación de pasos">
            {prev && (
              <button
                type="button"
                className="step-nav-btn"
                onClick={() => goTo(safeIndex - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                {prev.label}
              </button>
            )}
            {next ? (
              <button
                type="button"
                className="step-nav-btn step-nav-btn-next"
                onClick={() => goTo(safeIndex + 1)}
              >
                {next.label}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <p className="step-nav-done">
                Listo! Has practicado todos los ejercicios.{" "}
                <Link
                  href="/progress"
                  className="text-text-accent underline-offset-2 hover:underline"
                >
                  Tu progreso
                </Link>
              </p>
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
