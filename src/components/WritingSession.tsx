"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  countWords,
  formatCountdown,
  remainingMs,
  wordsPerMinute,
  type DiffSegment,
  type InlineNote,
} from "@/lib/writing";
import { saveWritingDraft, submitWriting } from "@/app/writing/actions";
import WritingCorrectionView from "@/components/WritingCorrectionView";
import EndClassButton from "@/components/EndClassButton";
import RecordingBanner from "@/components/lesson/RecordingBanner";
import BackLink from "@/components/BackLink";
import { getSessionPhase } from "@/lib/session-phase";
import type { CourseLevel } from "@/types";

type Prompt = {
  id: string;
  title: string;
  promptText: string;
  writingTimeMinutes: number;
  level: CourseLevel;
  structureLesson: string | null;
  rubricText: string | null;
  exampleParagraph: string | null;
};

export default function WritingSession({
  sessionId,
  prompt,
  notes,
  timerStartedAt: initialTimerStartedAt,
  isTeacher,
  submission,
  correction,
  recordingYoutubeUrl = null,
  classEndedAt: initialEndedAt = null,
  sessionStartTime = null,
  sessionEndTime = null,
}: {
  sessionId: string;
  prompt: Prompt;
  notes: string | null;
  timerStartedAt: string | null;
  isTeacher: boolean;
  submission: {
    text: string;
    status: "draft" | "submitted" | "corrected";
    wordCount: number;
    wpm: number | null;
  } | null;
  correction: {
    diff: DiffSegment[];
    notes: InlineNote[] | null;
    goodVocabulary: number[] | null;
  } | null;
  recordingYoutubeUrl?: string | null;
  classEndedAt?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
}) {
  const [timerStartedAt, setTimerStartedAt] = useState(initialTimerStartedAt);
  const [classEndedAt, setClassEndedAt] = useState(initialEndedAt);
  const [text, setText] = useState(submission?.text ?? "");
  const [status, setStatus] = useState(submission?.status ?? "draft");
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const autoSubmitted = useRef(false);
  const textRef = useRef(submission?.text ?? "");
  const live =
    Boolean(sessionStartTime && sessionEndTime) &&
    getSessionPhase(
      {
        sessionStartTime: sessionStartTime as string,
        sessionEndTime: sessionEndTime as string,
        classEndedAt,
      },
      new Date(now)
    ) === "live";

  const isPreInt = prompt.level === "pre-intermediate";
  const remaining = timerStartedAt
    ? remainingMs(timerStartedAt, prompt.writingTimeMinutes, now)
    : null;
  const timedOut = remaining !== null && remaining <= 0;
  const locked =
    status !== "draft" ||
    isTeacher ||
    !timerStartedAt ||
    (isPreInt && timedOut);
  const showFiveMinute =
    remaining !== null &&
    remaining > 0 &&
    remaining <= 5 * 60 * 1000 &&
    status === "draft";

  const wordCount = countWords(text);
  const elapsedSeconds =
    timerStartedAt && status === "draft"
      ? Math.max(1, Math.round((now - new Date(timerStartedAt).getTime()) / 1000))
      : null;
  const liveWpm =
    isPreInt && elapsedSeconds
      ? wordsPerMinute(wordCount, elapsedSeconds)
      : null;

  const handleSubmit = useCallback(
    async (fromTimer = false) => {
      if (isTeacher || status !== "draft" || !timerStartedAt) return;
      if (autoSubmitted.current && fromTimer) return;
      if (fromTimer) autoSubmitted.current = true;
      setSaving(true);
      setError("");
      const result = await submitWriting({
        sessionId,
        promptId: prompt.id,
        text: textRef.current,
        startedAt: timerStartedAt,
        level: prompt.level,
      });
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        autoSubmitted.current = false;
        return;
      }
      setStatus("submitted");
    },
    [isTeacher, status, timerStartedAt, sessionId, prompt.id, prompt.level]
  );

  useEffect(() => {
    if (!timerStartedAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (
        isPreInt &&
        remainingMs(timerStartedAt, prompt.writingTimeMinutes, t) <= 0 &&
        status === "draft" &&
        !isTeacher
      ) {
        void handleSubmit(true);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [
    timerStartedAt,
    isPreInt,
    status,
    isTeacher,
    handleSubmit,
    prompt.writingTimeMinutes,
  ]);

  useEffect(() => {
    if (isTeacher || timerStartedAt) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`writing-timer-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "course_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            timer_started_at?: string | null;
            class_ended_at?: string | null;
          };
          if (row.timer_started_at) setTimerStartedAt(row.timer_started_at);
          if (row.class_ended_at) setClassEndedAt(row.class_ended_at);
        }
      )
      .subscribe();

    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("course_sessions")
        .select("timer_started_at, class_ended_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (data?.timer_started_at) {
        setTimerStartedAt(data.timer_started_at);
      }
      if (data?.class_ended_at) {
        setClassEndedAt(data.class_ended_at);
      }
    }, 3000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [isTeacher, timerStartedAt, sessionId]);

  useEffect(() => {
    if (isTeacher || !timerStartedAt || status !== "draft" || locked) return;
    const id = window.setInterval(() => {
      void saveWritingDraft({
        sessionId,
        promptId: prompt.id,
        text: textRef.current,
        startedAt: timerStartedAt,
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [isTeacher, timerStartedAt, status, locked, sessionId, prompt.id]);

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-paper-line bg-paper-header px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <BackLink href="/dashboard" showLabel />
          <div className="min-w-0">
            <p className="text-label-sm text-text-muted">Profe Kyle</p>
            <p className="text-label-sm text-text-muted">Escritura</p>
            <h1 className="truncate font-heading text-headline-md text-text-primary">
              {prompt.title}
            </h1>
          </div>
          {timerStartedAt && status === "draft" ? (
            <p
              className={`ml-auto text-headline-md tabular-nums ${
                timedOut
                  ? "text-error"
                  : showFiveMinute
                    ? "text-warning"
                    : "text-text-primary"
              }`}
            >
              {timedOut && !isPreInt
                ? "Tiempo. Puedes seguir."
                : formatCountdown(remaining ?? 0)}
            </p>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6">
        {recordingYoutubeUrl ? (
          <RecordingBanner youtubeUrl={recordingYoutubeUrl} />
        ) : null}
        {notes ? (
          <p className="mb-4 text-body-main text-text-secondary">{notes}</p>
        ) : null}

        <div className="rounded-card border border-paper-line bg-white px-4 py-4">
          <p className="whitespace-pre-wrap font-heading text-headline-md text-text-primary">
            {prompt.promptText}
          </p>
        </div>

        {prompt.structureLesson ? (
          <div className="mt-4 rounded-card border border-paper-line bg-white px-4 py-4">
            <h2 className="text-label-md text-text-primary">Estructura</h2>
            <p className="mt-1 whitespace-pre-wrap text-body-main text-text-secondary">
              {prompt.structureLesson}
            </p>
          </div>
        ) : null}
        {prompt.rubricText ? (
          <div className="mt-4 rounded-card border border-paper-line bg-white px-4 py-4">
            <h2 className="text-label-md text-text-primary">
              Lo que voy a mirar
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-body-main text-text-secondary">
              {prompt.rubricText}
            </p>
          </div>
        ) : null}
        {prompt.exampleParagraph ? (
          <div className="mt-4 rounded-card border border-paper-line bg-white px-4 py-4">
            <h2 className="text-label-md text-text-primary">Ejemplo</h2>
            <p className="mt-1 whitespace-pre-wrap text-body-main text-text-secondary">
              {prompt.exampleParagraph}
            </p>
          </div>
        ) : null}

        {isTeacher ? (
          <p className="mt-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            Así lo ven tus estudiantes. Inicia el tiempo desde la página de la
            clase.
          </p>
        ) : null}

        {!isTeacher && !timerStartedAt && status === "draft" ? (
          <p className="mt-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            Espera a que el Profe Kyle inicie el tiempo.
          </p>
        ) : null}

        {showFiveMinute && status === "draft" && !timedOut ? (
          <p className="mt-4 rounded-card bg-warning-bg px-3 py-3 text-label-md text-warning">
            Quedan 5 minutos.
          </p>
        ) : null}

        {status === "corrected" && correction ? (
          <div className="mt-6">
            <WritingCorrectionView
              diff={correction.diff}
              notes={correction.notes}
              goodVocabulary={correction.goodVocabulary}
            />
          </div>
        ) : (
          <>
            <label className="mt-6 block">
              <span className="sr-only">Tu texto</span>
              <textarea
                value={text}
                onChange={(e) => {
                  const next = e.target.value;
                  textRef.current = next;
                  setText(next);
                }}
                disabled={locked}
                rows={12}
                className="min-h-[300px] w-full resize-y rounded-card border border-paper-line bg-white px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none disabled:bg-surface-hover disabled:text-text-muted"
                placeholder={
                  timerStartedAt
                    ? "Write here. Don't stop."
                    : "El recuadro se abre cuando empiece el tiempo."
                }
              />
            </label>

            <p className="mt-1 text-right text-[12px] text-text-muted">
              {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
              {isPreInt && liveWpm != null ? ` · ${liveWpm} ppm` : ""}
              {isPreInt && status !== "draft" && submission?.wpm != null
                ? ` · ${submission.wpm} ppm`
                : ""}
            </p>

            {!isTeacher && status === "draft" && timerStartedAt ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSubmit(false)}
                className="mt-4 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
              >
                {saving ? "Entregando..." : "Entregar"}
              </button>
            ) : null}

            {status === "submitted" ? (
              <p className="mt-4 rounded-card bg-success-bg px-3 py-3 text-body-main text-success">
                Ya lo entregaste. Cuando Kyle lo corrija, lo vas a ver aquí.
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 text-label-md text-error">{error}</p>
            ) : null}
          </>
        )}
        {isTeacher && live ? (
          <EndClassButton
            sessionId={sessionId}
            classEndedAt={classEndedAt}
            onEnded={setClassEndedAt}
          />
        ) : null}
      </section>
    </main>
  );
}
