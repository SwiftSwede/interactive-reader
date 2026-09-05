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
import { getSessionPhase } from "@/lib/session-phase";
import { remainingMs } from "@/lib/writing";
import type {
  VideoSummaryFreeWrite as FreeWrite,
  VideoSummaryParagraph,
  VideoSummaryTeachingNote,
} from "@/types";

type TeacherWrite = {
  id: string;
  displayName: string;
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
  sessionStartTime,
  sessionEndTime,
  timerStartedAt: initialTimer,
  courseId,
  paragraphs,
  notes,
  freeWrite,
  teacherFreeWrites,
}: {
  storyId: string;
  title: string;
  youtubeUrl: string | null;
  freeWriteMinutes: number;
  bodyText: string;
  sessionId: string;
  isTeacher: boolean;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
  timerStartedAt: string | null;
  courseId: string | null;
  paragraphs: VideoSummaryParagraph[];
  notes: VideoSummaryTeachingNote[];
  freeWrite: FreeWrite | null;
  teacherFreeWrites: TeacherWrite[];
}) {
  const [now, setNow] = useState(() => Date.now());
  const [step, setStep] = useState<StepId>(() => {
    if (!sessionStartTime || !sessionEndTime) return "video";
    return getSessionPhase({ sessionStartTime, sessionEndTime }) === "after"
      ? "translate"
      : "video";
  });
  const [timerStartedAt, setTimerStartedAt] = useState(initialTimer);
  const youtubeId = youtubeEmbedId(youtubeUrl);
  const englishCheatSheet = bodyText
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean);

  const phase =
    sessionStartTime && sessionEndTime
      ? getSessionPhase(
          {
            sessionStartTime,
            sessionEndTime,
          },
          new Date(now)
        )
      : "after";
  const live = phase === "live";
  const writingDone = Boolean(
    timerStartedAt && remainingMs(timerStartedAt, freeWriteMinutes, now) <= 0
  );
  const canOpenWrite = isTeacher || phase !== "before";
  const canOpenTranslate =
    isTeacher || phase === "after" || (live && writingDone);

  const safeIndex = STEPS.findIndex((row) => row.id === step);
  const activeIndex = safeIndex < 0 ? 0 : safeIndex;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isTeacher) return;
    if (phase === "before" && step !== "video") {
      setStep("video");
      return;
    }
    if (step === "write" && !canOpenWrite) setStep("video");
    if (step === "translate" && !canOpenTranslate) {
      setStep(canOpenWrite ? "write" : "video");
    }
  }, [isTeacher, phase, step, canOpenWrite, canOpenTranslate]);

  useEffect(() => {
    const supabase = createClient();
    const apply = (row: { timer_started_at?: string | null }) => {
      if (row.timer_started_at) setTimerStartedAt(row.timer_started_at);
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
        .select("timer_started_at")
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
    if (id === "write" && !canOpenWrite) return;
    if (id === "translate" && !canOpenTranslate) return;
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
          {STEPS.map((item, index) => {
            const locked =
              (item.id === "write" && !canOpenWrite) ||
              (item.id === "translate" && !canOpenTranslate);
            return (
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
                  aria-disabled={locked}
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
            );
          })}
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
              live={live}
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
            {!isTeacher && (
              <p className="text-label-md text-text-secondary">
                Toma notas de lo que ves
              </p>
            )}
            {canOpenWrite ? (
              <button
                type="button"
                onClick={() => setStep("write")}
                className="mt-6 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white"
              >
                Empezar resumen
              </button>
            ) : (
              <p className="mt-6 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
                El resumen se abre cuando empiece la clase.
              </p>
            )}
          </>
        )}

        {step === "write" && canOpenWrite && (
          <VideoSummaryFreeWrite
            sessionId={sessionId}
            storyId={storyId}
            minutes={freeWriteMinutes}
            timerStartedAt={timerStartedAt}
            isTeacher={isTeacher}
            live={live}
            classEnded={phase === "after"}
            courseId={courseId}
            onTimerStarted={setTimerStartedAt}
            initialText={freeWrite?.submissionText ?? ""}
            alreadySubmitted={Boolean(freeWrite?.submittedAt)}
            initialTeacherWrites={teacherFreeWrites}
          />
        )}

        {step === "translate" && canOpenTranslate && (
          <VideoSummaryTranslationStep
            storyId={storyId}
            sessionId={sessionId}
            isTeacher={isTeacher}
            live={live}
            paragraphs={paragraphs}
            englishCheatSheet={englishCheatSheet}
            notes={notes}
          />
        )}
      </article>
    </main>
  );
}
