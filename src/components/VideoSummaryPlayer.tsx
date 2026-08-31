"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import BackLink from "@/components/BackLink";
import { createClient } from "@/lib/supabase/client";
import { youtubeEmbedId } from "@/components/MusicBlanks";
import VideoSummaryFreeWrite from "@/components/VideoSummaryFreeWrite";
import VideoSummaryTranslationStep from "@/components/VideoSummaryTranslationStep";
import ClassroomYoutubePlayer from "@/components/ClassroomYoutubePlayer";
import type {
  VideoSummaryFreeWrite as FreeWrite,
  VideoSummaryParagraph,
  VideoSummaryTeachingNote,
} from "@/types";

type TeacherWrite = {
  id: string;
  submissionText: string;
  wordCount: number;
};

type StepId = "video" | "write" | "translate";

const STEPS: { id: StepId; label: string }[] = [
  { id: "video", label: "El Video" },
  { id: "write", label: "Tu Resumen" },
  { id: "translate", label: "Traducción" },
];

export default function VideoSummaryPlayer({
  storyId,
  title,
  youtubeUrl,
  freeWriteMinutes,
  bodyText,
  sessionId,
  isTeacher,
  timerStartedAt: initialTimer,
  answersRevealed: initialRevealed,
  allowReveal,
  paragraphs,
  notes,
  freeWrite,
  teacherFreeWrites,
  readerMode,
}: {
  storyId: string;
  title: string;
  youtubeUrl: string | null;
  freeWriteMinutes: number;
  bodyText: string;
  sessionId: string;
  isTeacher: boolean;
  timerStartedAt: string | null;
  answersRevealed: boolean;
  allowReveal: boolean;
  paragraphs: VideoSummaryParagraph[];
  notes: VideoSummaryTeachingNote[];
  freeWrite: FreeWrite | null;
  teacherFreeWrites: TeacherWrite[];
  readerMode: "classroom-live" | "classroom-review" | "open";
}) {
  const [step, setStep] = useState<StepId>(() =>
    readerMode === "classroom-review" || initialRevealed
      ? "translate"
      : "video"
  );
  const [timerStartedAt, setTimerStartedAt] = useState(initialTimer);
  const [answersRevealed, setAnswersRevealed] = useState(initialRevealed);
  const [showWrites, setShowWrites] = useState(false);
  const youtubeId = youtubeEmbedId(youtubeUrl);
  const translationOpen = isTeacher || allowReveal || answersRevealed;
  const englishCheatSheet = bodyText
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean);
  const reviewMode = readerMode !== "classroom-live";

  const safeIndex = STEPS.findIndex((row) => row.id === step);
  const activeIndex = safeIndex < 0 ? 0 : safeIndex;

  useEffect(() => {
    const supabase = createClient();
    const apply = (row: {
      timer_started_at?: string | null;
      answers_revealed?: boolean;
    }) => {
      if (row.timer_started_at) setTimerStartedAt(row.timer_started_at);
      if (row.answers_revealed) {
        setAnswersRevealed(true);
        setStep("translate");
      }
    };
    const channel = supabase
      .channel(`video-summary-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "course_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => apply(payload.new as never)
      )
      .subscribe();
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("course_sessions")
        .select("timer_started_at, answers_revealed")
        .eq("id", sessionId)
        .maybeSingle();
      if (data) apply(data);
    }, 3000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  function goTo(id: StepId) {
    if (id === "translate" && !translationOpen) return;
    setStep(id);
  }

  return (
    <main className="story-page min-h-screen">
      <div className="story-page-header sticky top-0 z-20 border-b border-paper-line backdrop-blur-sm">
        <header className="px-4 pt-2 pb-2">
          <div className="mx-auto max-w-2xl">
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
            <p className="mt-1 text-label-sm text-text-muted">Traducción</p>
            <h1 className="text-headline-md text-text-primary">{title}</h1>
          </div>
        </header>
        <nav className="step-progress mx-auto max-w-2xl px-2" aria-label="Pasos">
          {STEPS.map((item, index) => (
            <div key={item.id} className="contents">
              {index > 0 && (
                <div
                  className={`step-progress-line${
                    index <= activeIndex ? " step-progress-line-filled" : ""
                  }`}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className="step-progress-hit"
                aria-label={item.label}
                aria-current={index === activeIndex ? "step" : undefined}
                onClick={() => goTo(item.id)}
              >
                <span
                  className={`step-progress-dot${
                    index < activeIndex
                      ? " step-progress-dot-done"
                      : index === activeIndex
                        ? " step-progress-dot-active"
                        : ""
                  }`}
                >
                  {index < activeIndex && (
                    <Check size={10} strokeWidth={3} aria-hidden="true" />
                  )}
                </span>
              </button>
            </div>
          ))}
        </nav>
      </div>

      <article className="mx-auto max-w-2xl px-4 py-6">
        {youtubeId ? (
          <div className={step === "video" ? "mb-4" : "hidden"}>
            <ClassroomYoutubePlayer
              videoId={youtubeId}
              title={title}
              sessionId={sessionId}
              isTeacher={isTeacher}
              live={readerMode === "classroom-live"}
            />
          </div>
        ) : null}
        {step === "video" && (
          <>
            {youtubeId ? null : (
              <p className="text-body-main text-text-secondary">
                Falta el video. Avísale al Profe Kyle.
              </p>
            )}
            <p className="text-label-md text-text-secondary">
              Toma notas de lo que ves
            </p>
            <button
              type="button"
              onClick={() => setStep("write")}
              className="mt-6 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white"
            >
              Empezar resumen
            </button>
          </>
        )}

        {step === "write" && (
          <VideoSummaryFreeWrite
            sessionId={sessionId}
            storyId={storyId}
            minutes={freeWriteMinutes}
            timerStartedAt={timerStartedAt}
            isTeacher={isTeacher}
            initialText={freeWrite?.submissionText ?? ""}
            alreadySubmitted={Boolean(freeWrite?.submittedAt)}
          />
        )}

        {step === "translate" && translationOpen && (
          <>
            {isTeacher && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowWrites((value) => !value)}
                  className="min-h-11 text-label-md text-text-accent"
                >
                  {showWrites
                    ? "Ocultar resúmenes"
                    : "Ver resúmenes de estudiantes"}
                </button>
                {showWrites && (
                  <ul className="mt-2 space-y-3">
                    {teacherFreeWrites.length === 0 ? (
                      <li className="text-label-md text-text-muted">
                        Todavía nadie ha entregado.
                      </li>
                    ) : (
                      teacherFreeWrites.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-card border border-paper-line bg-white px-3 py-3 text-body-main"
                        >
                          <p className="text-label-sm text-text-muted">
                            {row.wordCount} palabras
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">
                            {row.submissionText || "(vacío)"}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
            <VideoSummaryTranslationStep
              storyId={storyId}
              sessionId={sessionId}
              isTeacher={isTeacher}
              reviewMode={reviewMode}
              paragraphs={paragraphs}
              englishCheatSheet={englishCheatSheet}
              notes={notes}
            />
          </>
        )}

        {step === "translate" && !translationOpen && (
          <p className="rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            Esperando al profe.
          </p>
        )}
      </article>
    </main>
  );
}
