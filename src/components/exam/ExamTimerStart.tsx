"use client";

import { useEffect, useMemo, useState } from "react";
import {
  examRemainingMs,
  examReviewDeadlineMs,
  formatExamReviewTime,
  parseExamTimerMinutes,
  parseExamTimerMode,
} from "@/lib/exam";
import { formatCountdown } from "@/lib/writing";
import type { ExamTimerMode } from "@/types";
import {
  adjustExamWorkTime,
  restartExamTimer,
  saveExamTimerSettings,
  startWritingTimer,
  stopExamTimer,
} from "@/app/teacher/classes/[id]/actions";

export default function ExamTimerStart({
  courseId,
  sessionId,
  sessionEndTime,
  started,
  timerStartedAt,
  initialMode,
  initialMinutes,
}: {
  courseId: string;
  sessionId: string;
  sessionEndTime: string;
  started: boolean;
  timerStartedAt: string | null;
  initialMode: ExamTimerMode;
  initialMinutes: number;
}) {
  const [mode, setMode] = useState<ExamTimerMode>(initialMode);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setMinutes(initialMinutes);
  }, [initialMinutes]);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [started]);

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

  const liveDeadline = examReviewDeadlineMs({
    mode: initialMode,
    minutes: initialMinutes,
    timerStartedAt,
    sessionEndTime,
  });
  const remaining = examRemainingMs(
    {
      mode: initialMode,
      minutes: initialMinutes,
      timerStartedAt,
      sessionEndTime,
    },
    now
  );

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

  const runAction = async (
    action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    extra?: Record<string, string>
  ) => {
    setPending(true);
    setError("");
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("sessionId", sessionId);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        formData.set(key, value);
      }
    }
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
  };

  if (started) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">
          Quedan {formatCountdown(remaining)}
          {liveDeadline
            ? `. Revisión a las ${formatExamReviewTime(liveDeadline)}`
            : "."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void runAction(adjustExamWorkTime, { delta: "5" })}
            className="flex min-h-11 items-center justify-center rounded-card border border-paper-line bg-white px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
          >
            +5 min
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void runAction(adjustExamWorkTime, { delta: "-5" })}
            className="flex min-h-11 items-center justify-center rounded-card border border-paper-line bg-white px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
          >
            -5 min
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void runAction(restartExamTimer)}
            className="flex min-h-11 items-center justify-center rounded-card border border-paper-line bg-white px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
          >
            Reiniciar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void runAction(stopExamTimer)}
            className="flex min-h-11 items-center justify-center rounded-card border border-paper-line bg-white px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
          >
            Parar
          </button>
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
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
