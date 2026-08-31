"use client";

import { useEffect, useState } from "react";
import MicroExplanation from "./MicroExplanation";
import { recordPersonalResponse } from "@/app/lesson/[slug]/actions";
import { draftKey, readDraft, writeDraft } from "@/lib/answer-drafts";
import type { CorrectionSegment } from "@/lib/personal-correction";
import type { SavedPersonalResponse } from "@/lib/personal-responses";

type Question = {
  id: string;
  position: number;
  question: string;
};

type PersonalQuestionsProps = {
  questions: Question[];
  mode?: "classroom-live" | "write";
  microExplanation?: string;
  sessionId?: string;
  savedResponses?: SavedPersonalResponse[];
};

type FeedbackState = {
  loading: boolean;
  corrections: CorrectionSegment[] | null;
  note: string | null;
  error: string | null;
};

type PersonalDraft = {
  responseText?: string;
  attemptNumber?: number;
  corrections?: CorrectionSegment[] | null;
  note?: string | null;
};

const MAX_ATTEMPTS = 3;

const MARK = {
  added: "rounded-[2px] font-semibold text-success bg-success-bg",
  deleted: "rounded-[2px] line-through text-error bg-error-bg",
  moved: "rounded-[2px] text-warning bg-warning-bg",
  placed: "underline underline-offset-2 text-text-primary",
} as const;

function hydrateFromSaved(
  questions: Question[],
  savedResponses: SavedPersonalResponse[] | undefined
) {
  const answers: Record<number, string> = {};
  const attempts: Record<number, number> = {};
  const feedbackStates: Record<number, FeedbackState> = {};

  if (!savedResponses) {
    return { answers, attempts, feedbackStates };
  }

  const byId = new Map(savedResponses.map((row) => [row.questionId, row]));
  for (const q of questions) {
    const saved = byId.get(q.id);
    if (!saved) continue;
    answers[q.position] = saved.responseText;
    attempts[q.position] = saved.attemptNumber;
    if (saved.corrections) {
      feedbackStates[q.position] = {
        loading: false,
        corrections: saved.corrections,
        note: saved.note,
        error: null,
      };
    }
  }

  return { answers, attempts, feedbackStates };
}

function persistDraft(
  questionId: string,
  payload: PersonalDraft
) {
  writeDraft(draftKey("personal", questionId), payload);
}

export default function PersonalQuestions({
  questions,
  mode = "write",
  microExplanation,
  sessionId,
  savedResponses,
}: PersonalQuestionsProps) {
  const initial = hydrateFromSaved(questions, savedResponses);
  const [answers, setAnswers] = useState<Record<number, string>>(
    () => initial.answers
  );
  const [feedbackStates, setFeedbackStates] = useState<
    Record<number, FeedbackState>
  >(() => initial.feedbackStates);
  const [attempts, setAttempts] = useState<Record<number, number>>(
    () => initial.attempts
  );

  useEffect(() => {
    const extraAnswers: Record<number, string> = {};
    const extraAttempts: Record<number, number> = {};
    const extraFeedback: Record<number, FeedbackState> = {};

    for (const q of questions) {
      if (answers[q.position] || feedbackStates[q.position]?.corrections) {
        continue;
      }
      const draft = readDraft<PersonalDraft>(draftKey("personal", q.id));
      if (!draft) continue;
      if (draft.responseText) extraAnswers[q.position] = draft.responseText;
      if (draft.attemptNumber) extraAttempts[q.position] = draft.attemptNumber;
      if (draft.corrections) {
        extraFeedback[q.position] = {
          loading: false,
          corrections: draft.corrections,
          note: draft.note ?? null,
          error: null,
        };
      }
    }

    if (Object.keys(extraAnswers).length > 0) {
      setAnswers((prev) => ({ ...extraAnswers, ...prev }));
    }
    if (Object.keys(extraAttempts).length > 0) {
      setAttempts((prev) => ({ ...extraAttempts, ...prev }));
    }
    if (Object.keys(extraFeedback).length > 0) {
      setFeedbackStates((prev) => ({ ...extraFeedback, ...prev }));
    }
    // Server-hydrated answers win. Fill local drafts only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswerChange = (
    position: number,
    questionId: string,
    value: string
  ) => {
    setAnswers((prev) => ({ ...prev, [position]: value }));
    persistDraft(questionId, {
      responseText: value,
      attemptNumber: attempts[position] || 0,
      corrections: feedbackStates[position]?.corrections ?? null,
      note: feedbackStates[position]?.note ?? null,
    });
  };

  const handleCheck = async (
    position: number,
    question: string,
    questionId: string
  ) => {
    const answer = answers[position]?.trim();

    if (!answer || answer.length < 2) return;

    setFeedbackStates((prev) => ({
      ...prev,
      [position]: { loading: true, corrections: null, note: null, error: null },
    }));

    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedbackStates((prev) => ({
          ...prev,
          [position]: {
            loading: false,
            corrections: null,
            note: null,
            error: data.error || "Algo salio mal. Intenta de nuevo.",
          },
        }));
        return;
      }

      const attemptNumber = (attempts[position] || 0) + 1;
      const corrections = (data.corrections ?? []) as CorrectionSegment[];
      const note = typeof data.note === "string" ? data.note : "";

      setAttempts((prev) => ({ ...prev, [position]: attemptNumber }));
      setFeedbackStates((prev) => ({
        ...prev,
        [position]: {
          loading: false,
          corrections,
          note,
          error: null,
        },
      }));

      persistDraft(questionId, {
        responseText: answer,
        attemptNumber,
        corrections,
        note,
      });

      void recordPersonalResponse({
        personalQuestionId: questionId,
        responseText: answer,
        attemptNumber,
        correctionCount: corrections.filter((seg) => seg.type !== "correct")
          .length,
        sessionId,
        corrections,
        note,
      });
    } catch {
      setFeedbackStates((prev) => ({
        ...prev,
        [position]: {
          loading: false,
          corrections: null,
          note: null,
          error: "Algo salio mal. Intenta de nuevo.",
        },
      }));
    }
  };

  const handleRetry = (position: number, questionId: string) => {
    const used = attempts[position] || 0;
    if (used >= MAX_ATTEMPTS) return;

    setFeedbackStates((prev) => ({
      ...prev,
      [position]: { loading: false, corrections: null, note: null, error: null },
    }));
    setAnswers((prev) => ({ ...prev, [position]: "" }));
    persistDraft(questionId, {
      responseText: "",
      attemptNumber: used,
      corrections: null,
      note: null,
    });
  };

  if (mode === "classroom-live") {
    return (
      <section>
        <h3 className="text-headline-md text-text-primary mb-1">
          Personal Questions
        </h3>
        <p className="mb-4 rounded-card border border-paper-line bg-accent-softer px-3 py-3 text-label-md text-text-accent">
          Discutir en clase
        </p>
        <p className="mb-4 text-label-md text-text-secondary">
          Hoy lo hablamos juntos. Después de clase puedes escribir aquí.
        </p>
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-card border border-paper-line bg-surface p-4"
            >
              <p className="text-body-main font-semibold text-text-primary">
                {idx + 1}. {q.question}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-headline-md text-text-primary mb-1">
        Personal Questions
      </h3>
      <p className="text-label-md text-text-secondary mb-4">
        Escribe tu respuesta en ingles y recibe feedback de Profe Kyle.
      </p>

      {microExplanation && (
        <MicroExplanation dismissKey="personal" text={microExplanation} />
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const state = feedbackStates[q.position];
          const answer = answers[q.position] || "";
          const usedAttempts = attempts[q.position] || 0;
          const attemptsLeft = MAX_ATTEMPTS - usedAttempts;
          const maxedOut = usedAttempts >= MAX_ATTEMPTS;

          return (
            <div
              key={q.id}
              className="rounded-card border border-paper-line bg-surface p-4"
            >
              <p className="text-body-main font-semibold text-text-primary mb-3">
                {idx + 1}. {q.question}
              </p>

              <textarea
                className="w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-2 focus:border-accent disabled:bg-surface-hover disabled:text-text-muted"
                placeholder="Escribe tu respuesta en ingles..."
                rows={3}
                value={answer}
                onChange={(e) =>
                  handleAnswerChange(q.position, q.id, e.target.value)
                }
                disabled={state?.loading === true || maxedOut}
              />

              {usedAttempts > 0 && (
                <p className="mt-1 text-label-sm text-text-muted">
                  {maxedOut
                    ? `Has usado tus ${MAX_ATTEMPTS} intentos.`
                    : `${attemptsLeft} ${attemptsLeft === 1 ? "intento restante" : "intentos restantes"}.`}
                </p>
              )}

              {!state?.corrections && !maxedOut && (
                <button
                  onClick={() => handleCheck(q.position, q.question, q.id)}
                  disabled={!answer.trim() || state?.loading === true}
                  className={`mt-2 min-h-11 text-label-md px-5 py-3 rounded-card transition-colors ${
                    answer.trim() && state?.loading !== true
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "bg-surface-hover text-text-muted cursor-not-allowed"
                  }`}
                  type="button"
                >
                  {state?.loading ? "Revisando..." : "Comprobar"}
                </button>
              )}

              {state?.error && (
                <p className="mt-2 text-label-md text-error">{state.error}</p>
              )}

              {state?.corrections && (
                <div className="mt-3 rounded-card bg-accent-softer border border-paper-line px-3 py-3">
                  <p className="text-label-sm text-text-accent mb-2">
                    Correccion de Profe Kyle:
                  </p>

                  <p className="text-body-main text-text-primary">
                    {state.corrections.map((seg, i) => {
                      const needsSpace = i > 0 && !/^[.,;:!?'"']/.test(seg.text);

                      if (seg.type === "added") {
                        return (
                          <span key={i} className={`${MARK.added} px-[2px]`}>
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "deleted") {
                        return (
                          <span key={i} className={`${MARK.deleted} px-[2px]`}>
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "moved") {
                        return (
                          <span key={i} className={`${MARK.moved} px-[2px]`}>
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "placed") {
                        return (
                          <span key={i} className={`${MARK.placed} px-[2px]`}>
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      return <span key={i}>{needsSpace ? " " : ""}{seg.text}</span>;
                    })}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-label-sm">
                    <span className={`${MARK.added} inline-block px-1.5 py-0.5`}>
                      faltaba
                    </span>
                    <span className={`${MARK.deleted} inline-block px-1.5 py-0.5`}>
                      de más
                    </span>
                    <span className={`${MARK.moved} inline-block px-1.5 py-0.5`}>
                      mover
                    </span>
                    <span className={`${MARK.placed} inline-block px-1.5 py-0.5`}>
                      aquí
                    </span>
                  </div>

                  {state.note && (
                    <p className="mt-2 text-body-main text-text-secondary italic">
                      {state.note}
                    </p>
                  )}

                  {maxedOut ? (
                    <p className="mt-3 text-label-sm text-text-muted">
                      Si quieres seguir practicando con feedback de IA,
                      considera unirte al AI Coach cuando este disponible.
                    </p>
                  ) : (
                    <button
                      onClick={() => handleRetry(q.position, q.id)}
                      className="mt-3 min-h-11 rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft"
                      type="button"
                    >
                      Intentar de nuevo
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
