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
}) {
  const [timerStartedAt, setTimerStartedAt] = useState(initialTimerStartedAt);
  const [text, setText] = useState(submission?.text ?? "");
  const [status, setStatus] = useState(submission?.status ?? "draft");
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const autoSubmitted = useRef(false);
  const textRef = useRef(submission?.text ?? "");

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
          const next = (payload.new as { timer_started_at?: string | null })
            .timer_started_at;
          if (next) setTimerStartedAt(next);
        }
      )
      .subscribe();

    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("course_sessions")
        .select("timer_started_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (data?.timer_started_at) {
        setTimerStartedAt(data.timer_started_at);
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
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 md:max-w-2xl">
          <p className="text-sm text-gray-500">Profe Kyle</p>
          {timerStartedAt && status === "draft" && (
            <p
              className={`text-sm font-medium tabular-nums ${
                timedOut
                  ? "text-red-600"
                  : showFiveMinute
                    ? "text-amber-600"
                    : "text-gray-800"
              }`}
            >
              {timedOut && !isPreInt
                ? "Tiempo. Puedes seguir."
                : formatCountdown(remaining ?? 0)}
            </p>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-8 md:max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">{prompt.title}</h1>
        {notes && <p className="mt-2 text-sm text-gray-600">{notes}</p>}
        <p className="mt-4 whitespace-pre-wrap text-base text-gray-800">
          {prompt.promptText}
        </p>

        {prompt.structureLesson && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-800">Estructura</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
              {prompt.structureLesson}
            </p>
          </div>
        )}
        {prompt.rubricText && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Lo que voy a mirar
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
              {prompt.rubricText}
            </p>
          </div>
        )}
        {prompt.exampleParagraph && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-800">Ejemplo</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
              {prompt.exampleParagraph}
            </p>
          </div>
        )}

        {isTeacher && (
          <p className="mt-6 rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-600">
            Así lo ven tus estudiantes. Inicia el tiempo desde la página de la
            clase.
          </p>
        )}

        {!isTeacher && !timerStartedAt && status === "draft" && (
          <p className="mt-6 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Espera a que el Profe Kyle inicie el tiempo.
          </p>
        )}

        {showFiveMinute && status === "draft" && !timedOut && (
          <p className="mt-4 text-sm font-medium text-amber-700">
            Quedan 5 minutos.
          </p>
        )}

        {status === "corrected" && correction ? (
          <div className="mt-8">
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
                className="w-full resize-y rounded-lg border border-gray-200 px-3 py-3 text-base leading-relaxed text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-600"
                placeholder={
                  timerStartedAt
                    ? "Write here. Don't stop."
                    : "El recuadro se abre cuando empiece el tiempo."
                }
              />
            </label>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
              <p>
                {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
                {isPreInt && liveWpm != null ? ` · ${liveWpm} ppm` : ""}
                {isPreInt &&
                status !== "draft" &&
                submission?.wpm != null
                  ? ` · ${submission.wpm} ppm`
                  : ""}
              </p>
              {!isTeacher && status === "draft" && timerStartedAt && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSubmit(false)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Entregando..." : "Entregar"}
                </button>
              )}
            </div>

            {status === "submitted" && (
              <p className="mt-4 text-sm text-gray-600">
                Ya lo entregaste. Cuando Kyle lo corrija, lo vas a ver aquí.
              </p>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}
