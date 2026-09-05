"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { countWords, formatCountdown, remainingMs } from "@/lib/writing";
import {
  saveVideoSummaryDraft,
  submitVideoSummary,
  listVideoSummaryFreeWrites,
  type VideoSummaryTeacherWrite,
} from "@/app/lesson/[slug]/video-summary-actions";
import { startWritingTimer } from "@/app/teacher/classes/[id]/actions";

export default function VideoSummaryFreeWrite({
  sessionId,
  storyId,
  minutes,
  timerStartedAt,
  isTeacher,
  live,
  classEnded,
  courseId,
  onTimerStarted,
  initialText,
  alreadySubmitted,
  initialTeacherWrites,
}: {
  sessionId: string;
  storyId: string;
  minutes: number;
  timerStartedAt: string | null;
  isTeacher: boolean;
  live: boolean;
  classEnded: boolean;
  courseId: string | null;
  onTimerStarted: (startedAt: string) => void;
  initialText: string;
  alreadySubmitted: boolean;
  initialTeacherWrites: VideoSummaryTeacherWrite[];
}) {
  const [text, setText] = useState(initialText);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showWrites, setShowWrites] = useState(false);
  const [teacherWrites, setTeacherWrites] = useState(initialTeacherWrites);
  const autoSubmitted = useRef(false);
  const textRef = useRef(initialText);

  const remaining = timerStartedAt
    ? remainingMs(timerStartedAt, minutes, now)
    : null;
  const timedOut = remaining !== null && remaining <= 0;
  const locked = isTeacher || submitted || !timerStartedAt || timedOut;

  const handleSubmit = useCallback(
    async (fromTimer = false) => {
      if (isTeacher || submitted || !timerStartedAt) return;
      if (autoSubmitted.current && fromTimer) return;
      if (fromTimer) autoSubmitted.current = true;
      setSaving(true);
      setError("");
      const result = await submitVideoSummary({
        sessionId,
        storyId,
        text: textRef.current,
        startedAt: timerStartedAt,
      });
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        autoSubmitted.current = false;
        return;
      }
      setSubmitted(true);
    },
    [isTeacher, submitted, timerStartedAt, sessionId, storyId]
  );

  useEffect(() => {
    if (!timerStartedAt || submitted) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (
        remainingMs(timerStartedAt, minutes, t) <= 0 &&
        !isTeacher &&
        !submitted
      ) {
        void handleSubmit(true);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [timerStartedAt, minutes, submitted, isTeacher, handleSubmit]);

  useEffect(() => {
    if (locked || !timerStartedAt) return;
    const id = window.setInterval(() => {
      void saveVideoSummaryDraft({
        sessionId,
        storyId,
        text: textRef.current,
        startedAt: timerStartedAt,
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [locked, timerStartedAt, sessionId, storyId]);

  async function handleStartTimer() {
    if (!courseId || starting) return;
    setStarting(true);
    setError("");
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("sessionId", sessionId);
    const result = await startWritingTimer(formData);
    if (!result.ok) {
      setStarting(false);
      setError(result.error);
      return;
    }
    onTimerStarted(new Date().toISOString());
  }

  async function toggleStudentWrites() {
    const next = !showWrites;
    setShowWrites(next);
    if (!next) return;
    const result = await listVideoSummaryFreeWrites(sessionId);
    if (result.ok) setTeacherWrites(result.writes);
  }

  return (
    <div>
      {timerStartedAt && !submitted && (
        <p className="mb-3 text-right text-headline-md tabular-nums text-text-primary">
          {formatCountdown(remaining ?? 0)}
        </p>
      )}

      {isTeacher && (
        <p className="mb-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
          Así lo ven tus estudiantes. Cuando inicies el tiempo, el reloj
          aparece en su pantalla.
        </p>
      )}

      {isTeacher && !timerStartedAt && live && courseId && (
        <button
          type="button"
          onClick={() => void handleStartTimer()}
          disabled={starting}
          className="mb-4 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
        >
          {starting ? "Iniciando..." : "Iniciar tarea de escribir"}
        </button>
      )}

      {isTeacher && !timerStartedAt && !live && (
        <p className="mb-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
          {classEnded
            ? "La clase ya terminó."
            : "La escritura se inicia cuando empiece la clase."}
        </p>
      )}

      {!isTeacher && !timerStartedAt && !submitted && (
        <p className="mb-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
          Espera a que el Profe Kyle inicie el tiempo.
        </p>
      )}

      <label className="sr-only" htmlFor="video-summary-write">
        Tu resumen
      </label>
      <textarea
        id="video-summary-write"
        value={text}
        disabled={locked}
        onChange={(event) => {
          setText(event.target.value);
          textRef.current = event.target.value;
        }}
        className="min-h-[300px] w-full rounded-card border border-paper-line bg-white px-3 py-3 text-body-main text-text-primary focus:border-accent focus:outline-none disabled:opacity-70"
        placeholder="What happened in the video?"
      />
      <p className="mt-1 text-right text-label-sm text-text-muted">
        {countWords(text)} palabras
        {saving ? " · guardando" : ""}
      </p>

      {error && <p className="mt-2 text-label-md text-error">{error}</p>}

      {!isTeacher && !submitted && (
        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={!timedOut || saving}
          className="mt-4 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
        >
          Entregar
        </button>
      )}

      {submitted && (
        <p className="mt-4 rounded-card bg-success-bg px-3 py-3 text-body-main text-success">
          Entregado. Sigue a Traducción.
        </p>
      )}

      {isTeacher && timedOut && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => void toggleStudentWrites()}
            className="min-h-11 text-label-md text-text-accent"
          >
            {showWrites ? "Ocultar resúmenes" : "Ver resúmenes de estudiantes"}
          </button>
          {showWrites && (
            <ul className="mt-2 space-y-3">
              {teacherWrites.length === 0 ? (
                <li className="text-label-md text-text-muted">
                  Todavía nadie ha entregado.
                </li>
              ) : (
                teacherWrites.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-card border border-paper-line bg-white px-3 py-3 text-body-main"
                  >
                    <p className="text-label-sm text-text-muted">
                      <span className="font-medium text-text-primary">
                        {row.displayName || "Sin nombre"}
                      </span>
                      {` · ${row.wordCount} palabras`}
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
    </div>
  );
}
