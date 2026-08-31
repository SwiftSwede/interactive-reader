"use client";

import { useState } from "react";
import MicroExplanation from "./MicroExplanation";
import { recordPersonalResponse } from "@/app/story/[slug]/actions";

// ── Types ──────────────────────────────────────────────────

type Question = {
  id: string;
  position: number;
  question: string;
};

type PersonalQuestionsProps = {
  questions: Question[];
  mode?: "classroom-live" | "write";
  microExplanation?: string;
  /** Classroom attribution. Omitted in open mode. */
  sessionId?: string;
};

type CorrectionSegment = {
  text: string;
  type: "correct" | "added" | "deleted" | "moved";
};

type FeedbackState = {
  loading: boolean;
  corrections: CorrectionSegment[] | null;
  note: string | null;
  error: string | null;
};

const MAX_ATTEMPTS = 3;

// ── Component ──────────────────────────────────────────────

export default function PersonalQuestions({
  questions,
  mode = "write",
  microExplanation,
  sessionId,
}: PersonalQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbackStates, setFeedbackStates] = useState<
    Record<number, FeedbackState>
  >({});
  const [attempts, setAttempts] = useState<Record<number, number>>({});

  const handleAnswerChange = (position: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [position]: value }));
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
      setAttempts((prev) => ({ ...prev, [position]: attemptNumber }));

      setFeedbackStates((prev) => ({
        ...prev,
        [position]: {
          loading: false,
          corrections: data.corrections,
          note: data.note,
          error: null,
        },
      }));

      // Fire and forget: the learner already has their feedback, and the action
      // is a no-op for anonymous users.
      const corrections = (data.corrections ?? []) as CorrectionSegment[];
      void recordPersonalResponse({
        personalQuestionId: questionId,
        responseText: answer,
        attemptNumber,
        correctionCount: corrections.filter((seg) => seg.type !== "correct")
          .length,
        sessionId,
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

  const handleRetry = (position: number) => {
    const used = attempts[position] || 0;
    if (used >= MAX_ATTEMPTS) return;

    setFeedbackStates((prev) => ({
      ...prev,
      [position]: { loading: false, corrections: null, note: null, error: null },
    }));
    setAnswers((prev) => ({ ...prev, [position]: "" }));
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

              {/* Text input */}
              <textarea
                className="w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-2 focus:border-accent disabled:bg-surface-hover disabled:text-text-muted"
                placeholder="Escribe tu respuesta en ingles..."
                rows={3}
                value={answer}
                onChange={(e) =>
                  handleAnswerChange(q.position, e.target.value)
                }
                disabled={state?.loading === true || maxedOut}
              />

              {/* Attempt counter */}
              {usedAttempts > 0 && (
                <p className="mt-1 text-label-sm text-text-muted">
                  {maxedOut
                    ? `Has usado tus ${MAX_ATTEMPTS} intentos.`
                    : `${attemptsLeft} ${attemptsLeft === 1 ? "intento restante" : "intentos restantes"}.`}
                </p>
              )}

              {/* Comprobar button */}
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

              {/* Error */}
              {state?.error && (
                <p className="mt-2 text-label-md text-error">{state.error}</p>
              )}

              {/* AI Feedback: inline corrections */}
              {state?.corrections && (
                <div className="mt-3 rounded-card bg-accent-softer border border-paper-line px-3 py-3">
                  <p className="text-label-sm text-text-accent mb-2">
                    Correccion de Profe Kyle:
                  </p>

                  {/* Render corrected text with visual markup */}
                  <p className="text-body-main text-text-primary">
                    {state.corrections.map((seg, i) => {
                      // Add space before each segment (except the first),
                      // unless the segment starts with punctuation
                      const needsSpace = i > 0 && !/^[.,;:!?'"']/.test(seg.text);

                      if (seg.type === "added") {
                        return (
                          <span
                            key={i}
                            className="rounded-[2px] px-[2px] font-semibold text-success bg-success-bg"
                          >
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "deleted") {
                        return (
                          <span
                            key={i}
                            className="rounded-[2px] px-[2px] line-through text-error bg-error-bg"
                          >
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "moved") {
                        return (
                          <span
                            key={i}
                            className="rounded-[2px] px-[2px] text-warning bg-accent-soft"
                          >
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      return <span key={i}>{needsSpace ? " " : ""}{seg.text}</span>;
                    })}
                  </p>

                  {/* Color legend */}
                  <div className="mt-2 flex flex-wrap gap-3 text-label-sm">
                    <span className="text-success">verde = falta</span>
                    <span className="text-error">rojo = sobra</span>
                    <span className="text-warning">ambar = mover</span>
                  </div>

                  {/* Spanish note from Kyle */}
                  {state.note && (
                    <p className="mt-2 text-body-main text-text-secondary italic">
                      {state.note}
                    </p>
                  )}

                  {/* Try again button or limit message */}
                  {maxedOut ? (
                    <p className="mt-3 text-label-sm text-text-muted">
                      Si quieres seguir practicando con feedback de IA,
                      considera unirte al AI Coach cuando este disponible.
                    </p>
                  ) : (
                    <button
                      onClick={() => handleRetry(q.position)}
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
