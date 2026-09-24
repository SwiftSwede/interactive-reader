"use client";

import { useEffect, useMemo, useState } from "react";
import {
  examReviewDeadlineMs,
  formatExamReviewTime,
  parseExamTimerMinutes,
  parseExamTimerMode,
} from "@/lib/exam";
import type { ExamTimerMode } from "@/types";
import {
  saveExamTimerSettings,
  startWritingTimer,
} from "@/app/teacher/classes/[id]/actions";

export default function ExamTimerStart({
  courseId,
  sessionId,
  sessionEndTime,
  started,
  initialMode,
  initialMinutes,
}: {
  courseId: string;
  sessionId: string;
  sessionEndTime: string;
  started: boolean;
  initialMode: ExamTimerMode;
  initialMinutes: number;
}) {
  const [mode, setMode] = useState<ExamTimerMode>(initialMode);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());

  const preview = useMemo(() => {
    const startedAt = new Date(now).toISOString();
    const deadline = examReviewDeadlineMs({
      mode,
      minutes,
      timerStartedAt: startedAt,
      sessionEndTime,
    });
    return formatExamReviewTime(deadline);
  }, [mode, minutes, now, sessionEndTime]);

  useEffect(() => {
    if (started) return;
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("sessionId", sessionId);
    formData.set("examTimerMode", mode);
    formData.set("examTimerMinutes", String(minutes));
    const id = window.setTimeout(() => {
      void saveExamTimerSettings(formData);
    }, 400);
    return () => window.clearTimeout(id);
  }, [courseId, sessionId, mode, minutes, started]);

  if (started) {
    return (
      <p className="flex items-center text-sm text-text-muted">
        El examen ya está en marcha.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-secondary">
          Reloj
        </legend>
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-primary">
          <input
            type="radio"
            name="examTimerMode"
            checked={mode === "until_end_offset"}
            onChange={() => setMode("until_end_offset")}
          />
          Hasta N min antes del final
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-primary">
          <input
            type="radio"
            name="examTimerMode"
            checked={mode === "from_start"}
            onChange={() => setMode("from_start")}
          />
          N minutos desde Iniciar
        </label>
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          Minutos (N)
        </span>
        <input
          type="number"
          min={1}
          max={90}
          value={minutes}
          onChange={(event) =>
            setMinutes(parseExamTimerMinutes(event.target.value))
          }
          className="w-full rounded-card border border-paper-line bg-white px-3 py-3 text-base text-text-primary"
        />
      </label>
      {preview ? (
        <p className="text-sm text-text-muted">Revisión a las {preview}</p>
      ) : null}
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          formData.set("examTimerMode", parseExamTimerMode(mode));
          formData.set("examTimerMinutes", String(minutes));
          const result = await startWritingTimer(formData);
          if (!result.ok) {
            setPending(false);
            setError(result.error);
          }
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Iniciando..." : "Iniciar"}
        </button>
      </form>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
