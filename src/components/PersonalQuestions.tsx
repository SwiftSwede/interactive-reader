"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────

type Question = {
  id: string;
  position: number;
  question: string;
};

type PersonalQuestionsProps = {
  questions: Question[];
  mode?: "classroom-live" | "write";
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
}: PersonalQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbackStates, setFeedbackStates] = useState<
    Record<number, FeedbackState>
  >({});
  const [attempts, setAttempts] = useState<Record<number, number>>({});

  const handleAnswerChange = (position: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [position]: value }));
  };

  const handleCheck = async (position: number, question: string) => {
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

      setAttempts((prev) => ({
        ...prev,
        [position]: (prev[position] || 0) + 1,
      }));

      setFeedbackStates((prev) => ({
        ...prev,
        [position]: {
          loading: false,
          corrections: data.corrections,
          note: data.note,
          error: null,
        },
      }));
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
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Personal Questions
        </h3>
        <p className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Discutir en clase
        </p>
        <p className="mb-4 text-sm text-gray-500">
          Hoy lo hablamos juntos. Después de clase puedes escribir aquí.
        </p>
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-lg border border-gray-100 p-4"
            >
              <p className="font-medium text-gray-900">
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
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Personal Questions
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Escribe tu respuesta en ingles y recibe feedback de Profe Kyle.
      </p>

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
              className="rounded-lg border border-gray-100 p-4"
            >
              <p className="font-medium text-gray-900 mb-3">
                {idx + 1}. {q.question}
              </p>

              {/* Text input */}
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
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
                <p className="mt-1 text-xs text-gray-400">
                  {maxedOut
                    ? `Has usado tus ${MAX_ATTEMPTS} intentos.`
                    : `${attemptsLeft} ${attemptsLeft === 1 ? "intento restante" : "intentos restantes"}.`}
                </p>
              )}

              {/* Comprobar button */}
              {!state?.corrections && !maxedOut && (
                <button
                  onClick={() => handleCheck(q.position, q.question)}
                  disabled={!answer.trim() || state?.loading === true}
                  className={`mt-2 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                    answer.trim() && state?.loading !== true
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  type="button"
                >
                  {state?.loading ? "Revisando..." : "Comprobar"}
                </button>
              )}

              {/* Error */}
              {state?.error && (
                <p className="mt-2 text-sm text-red-500">{state.error}</p>
              )}

              {/* AI Feedback: inline corrections */}
              {state?.corrections && (
                <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-3">
                  <p className="text-xs text-indigo-400 mb-2 font-medium">
                    Correccion de Profe Kyle:
                  </p>

                  {/* Render corrected text with visual markup */}
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {state.corrections.map((seg, i) => {
                      // Add space before each segment (except the first),
                      // unless the segment starts with punctuation
                      const needsSpace = i > 0 && !/^[.,;:!?'"']/.test(seg.text);

                      if (seg.type === "added") {
                        return (
                          <span
                            key={i}
                            style={{
                              color: "#059669",
                              fontWeight: 600,
                              backgroundColor: "#d1fae5",
                              borderRadius: "2px",
                              padding: "0 2px",
                            }}
                          >
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "deleted") {
                        return (
                          <span
                            key={i}
                            style={{
                              color: "#dc2626",
                              textDecoration: "line-through",
                              backgroundColor: "#fee2e2",
                              borderRadius: "2px",
                              padding: "0 2px",
                            }}
                          >
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      if (seg.type === "moved") {
                        return (
                          <span
                            key={i}
                            style={{
                              color: "#b45309",
                              backgroundColor: "#fef3c7",
                              borderRadius: "2px",
                              padding: "0 2px",
                            }}
                          >
                            {needsSpace ? " " : ""}{seg.text}
                          </span>
                        );
                      }
                      return <span key={i}>{needsSpace ? " " : ""}{seg.text}</span>;
                    })}
                  </p>

                  {/* Color legend */}
                  <div className="mt-2 flex gap-3 text-xs text-gray-400">
                    <span style={{ color: "#059669" }}>verde = falta</span>
                    <span style={{ color: "#dc2626" }}>rojo = sobra</span>
                    <span style={{ color: "#b45309" }}>ambar = mover</span>
                  </div>

                  {/* Spanish note from Kyle */}
                  {state.note && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      {state.note}
                    </p>
                  )}

                  {/* Try again button or limit message */}
                  {maxedOut ? (
                    <p className="mt-3 text-xs text-gray-400">
                      Si quieres seguir practicando con feedback de IA,
                      considera unirte al AI Coach cuando este disponible.
                    </p>
                  ) : (
                    <button
                      onClick={() => handleRetry(q.position)}
                      className="mt-3 text-xs text-indigo-500 hover:text-indigo-700"
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
