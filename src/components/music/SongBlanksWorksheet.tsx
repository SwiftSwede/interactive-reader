"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import ClassroomYoutubePlayer from "@/components/ClassroomYoutubePlayer";
import type { LyricBlank } from "@/types";
import {
  allLyricBlanksFilled,
  placeLyricBlanks,
  scoreBlank,
  type PlacedLyricLine,
} from "@/lib/music";
import {
  saveSongLyricBlank,
  submitSongLyricBlanks,
} from "@/app/lesson/[slug]/music-actions";
import type { SavedSongAttempt } from "@/lib/services/songAttempts";

export default function SongBlanksWorksheet({
  bodyText,
  blanks,
  sessionId,
  persist,
  initialAttempts,
  videoId,
  title,
  isTeacher,
  live,
  classAnswers,
  onClassAnswer,
  onClassBlur,
}: {
  bodyText: string;
  blanks: LyricBlank[];
  sessionId?: string;
  persist: boolean;
  initialAttempts: SavedSongAttempt[];
  videoId: string | null;
  title: string;
  isTeacher: boolean;
  live: boolean;
  classAnswers: Record<number, string>;
  onClassAnswer?: (blankId: number, typed: string) => void;
  onClassBlur?: () => void;
}) {
  const lines = useMemo(
    () => placeLyricBlanks(bodyText, blanks),
    [bodyText, blanks]
  );
  const initialValues = useMemo(() => {
    const next: Record<number, string> = {};
    for (const blank of blanks) next[blank.id] = "";
    for (const attempt of initialAttempts) {
      next[attempt.blankId] = attempt.typedText;
    }
    return next;
  }, [blanks, initialAttempts]);

  const [values, setValues] = useState<Record<number, string>>(initialValues);
  const [submitted, setSubmitted] = useState(() =>
    initialAttempts.some((row) => row.submittedAt)
  );
  const [correctById, setCorrectById] = useState<Record<number, boolean>>(
    () => {
      const next: Record<number, boolean> = {};
      for (const attempt of initialAttempts) {
        if (typeof attempt.isCorrect === "boolean") {
          next[attempt.blankId] = attempt.isCorrect;
        }
      }
      return next;
    }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<number, number>>({});
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const teacherLive = isTeacher && live;
  const selfCheck = !live;
  const revealed = submitted && selfCheck;
  const allFilled = allLyricBlanksFilled(
    teacherLive ? classAnswers : values,
    blanks
  );

  useEffect(() => {
    return () => {
      for (const id of Object.values(timers.current)) {
        window.clearTimeout(id);
      }
    };
  }, []);

  function flushBlank(blankId: number, typed: string) {
    if (teacherLive || !persist || !sessionId || submitted) return;
    void saveSongLyricBlank({
      sessionId,
      blankId,
      typedText: typed,
    });
  }

  function flushAll() {
    if (teacherLive || !persist || !sessionId || submitted) return;
    for (const blank of blanks) {
      flushBlank(blank.id, valuesRef.current[blank.id] ?? "");
    }
  }

  useEffect(() => {
    return () => {
      flushAll();
    };
    // Unmount flush only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(blankId: number, typed: string) {
    if (teacherLive) {
      onClassAnswer?.(blankId, typed);
      return;
    }
    if (submitted) return;
    if ((classAnswers[blankId] ?? "").trim()) return;
    setValues((current) => ({ ...current, [blankId]: typed }));
    if (!persist || !sessionId) return;
    const previous = timers.current[blankId];
    if (previous) window.clearTimeout(previous);
    timers.current[blankId] = window.setTimeout(() => {
      flushBlank(blankId, typed);
    }, 1500);
  }

  async function onSubmit() {
    if (teacherLive || submitted || busy || !allFilled) return;
    for (const id of Object.values(timers.current)) {
      window.clearTimeout(id);
    }
    setBusy(true);
    setError(null);

    if (!persist || !sessionId) {
      const local: Record<number, boolean> = {};
      for (const blank of blanks) {
        local[blank.id] = scoreBlank(values[blank.id] ?? "", blank.answer);
      }
      setCorrectById(local);
      setSubmitted(true);
      setBusy(false);
      return;
    }

    const payload: Record<string, string> = {};
    for (const blank of blanks) {
      payload[String(blank.id)] = values[blank.id] ?? "";
    }
    const result = await submitSongLyricBlanks({
      sessionId,
      values: payload,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const nextCorrect: Record<number, boolean> = {};
    for (const attempt of result.attempts ?? []) {
      if (typeof attempt.isCorrect === "boolean") {
        nextCorrect[attempt.blankId] = attempt.isCorrect;
      }
    }
    setCorrectById(nextCorrect);
    setSubmitted(true);
  }

  const answerById = Object.fromEntries(
    blanks.map((blank) => [blank.id, blank.answer])
  ) as Record<number, string>;

  const instructions = teacherLive
    ? "Escribe las respuestas en los huecos. Los teléfonos siguen lo que escribes."
    : live
      ? "Escucha, escribe lo que oigas, y entrega. El Profe Kyle escribe las respuestas después."
      : "Escucha, escribe lo que oigas, y entrega para ver qué acertaste.";

  return (
    <div>
      <h2 className="text-headline-lg text-text-primary mb-2">
        Completa la canción
      </h2>
      <p className="mb-4 text-label-md text-text-secondary">{instructions}</p>
      {videoId ? (
        <div className="mb-6">
          <ClassroomYoutubePlayer
            videoId={videoId}
            title={title}
            sessionId={sessionId}
            isTeacher={isTeacher}
            live={live}
            compact
          />
        </div>
      ) : null}
      <div className="flex justify-center">
        <div className="inline-block text-left text-story-body text-text-primary">
          {lines.map((line, index) => (
            <LyricLine
              key={`${line.lineIndex ?? "gap"}-${index}`}
              line={line}
              values={values}
              classAnswers={classAnswers}
              teacherLive={teacherLive}
              live={live}
              submitted={submitted}
              revealed={revealed}
              correctById={correctById}
              answerById={answerById}
              onChange={onChange}
              onBlur={(blankId, typed) => {
                if (teacherLive) onClassBlur?.();
                else flushBlank(blankId, typed);
              }}
            />
          ))}
        </div>
      </div>
      {error ? (
        <p className="mt-4 text-label-md text-error">{error}</p>
      ) : null}
      {teacherLive ? null : !submitted ? (
        <>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={busy || !allFilled}
            className="mt-6 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? "Entregando..." : "Entregar respuestas"}
          </button>
          {!allFilled ? (
            <p className="mt-2 text-label-sm text-text-muted">
              Llena todos los huecos para entregar.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-6 text-label-md text-secondary-accent">
          {live
            ? "Entregado. El Profe Kyle las escribe en un momento."
            : "Entregado"}
        </p>
      )}
    </div>
  );
}

function LyricLine({
  line,
  values,
  classAnswers,
  teacherLive,
  live,
  submitted,
  revealed,
  correctById,
  answerById,
  onChange,
  onBlur,
}: {
  line: PlacedLyricLine;
  values: Record<number, string>;
  classAnswers: Record<number, string>;
  teacherLive: boolean;
  live: boolean;
  submitted: boolean;
  revealed: boolean;
  correctById: Record<number, boolean>;
  answerById: Record<number, string>;
  onChange: (blankId: number, typed: string) => void;
  onBlur: (blankId: number, typed: string) => void;
}) {
  if (line.lineIndex === null) {
    return <div className="h-8" />;
  }

  return (
    <p className="mb-0">
      {line.segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={`t-${index}`}>{segment.text}</span>;
        }
        const classText = (classAnswers[segment.blankId] ?? "").trim();
        const showingClass = live && !teacherLive && classText.length > 0;
        const typed = teacherLive
          ? (classAnswers[segment.blankId] ?? "")
          : showingClass
            ? classText
            : (values[segment.blankId] ?? "");
        const locked =
          (!teacherLive && submitted) || showingClass;
        const ok = correctById[segment.blankId] === true;
        const answer = answerById[segment.blankId] ?? segment.answer;
        const showMarks = revealed && !showingClass;
        return (
          <span key={`b-${segment.blankId}-${index}`} className="lyric-blank-slot">
            <span className="lyric-blank-num">{segment.blankId}</span>
            <span className="lyric-blank-grow">
              <span className="lyric-blank-sizer" aria-hidden="true">
                {blankSizerText(typed, showMarks || showingClass)}
              </span>
              <input
                value={typed}
                size={1}
                onChange={(event) =>
                  onChange(segment.blankId, event.target.value)
                }
                onBlur={(event) => onBlur(segment.blankId, event.target.value)}
                readOnly={locked}
                aria-label={
                  showingClass
                    ? `Respuesta del Profe Kyle, hueco ${segment.blankId}`
                    : `Hueco ${segment.blankId}`
                }
                className={`lyric-blank${
                  showMarks ? (ok ? " lyric-blank-ok" : " lyric-blank-bad") : ""
                }`}
              />
            </span>
            {showMarks && !ok ? (
              <span className="lyric-blank-answer text-label-sm text-success">
                {answer}
              </span>
            ) : null}
            {showMarks ? (
              ok ? (
                <Check
                  size={14}
                  className="lyric-blank-mark text-success"
                  aria-label="Correcto"
                />
              ) : (
                <X
                  size={14}
                  className="lyric-blank-mark text-error"
                  aria-label="Incorrecto"
                />
              )
            ) : null}
          </span>
        );
      })}
    </p>
  );
}

function blankSizerText(typed: string, hugWord: boolean): string {
  if (hugWord) return typed;
  if (typed.length >= 3) return typed;
  return typed + "\u00a0".repeat(3 - typed.length);
}
