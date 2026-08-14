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
};

type FeedbackState = {
  loading: boolean;
  feedback: string | null;
  error: string | null;
};

// ── Component ──────────────────────────────────────────────

export default function PersonalQuestions({
  questions,
}: PersonalQuestionsProps) {
  // Track each question's answer text and feedback state independently
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbackStates, setFeedbackStates] = useState<
    Record<number, FeedbackState>
  >({});

  const handleAnswerChange = (position: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [position]: value }));
  };

  const handleCheck = async (position: number, question: string) => {
    const answer = answers[position]?.trim();

    if (!answer || answer.length < 2) return;

    // Set loading state
    setFeedbackStates((prev) => ({
      ...prev,
      [position]: { loading: true, feedback: null, error: null },
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
            feedback: null,
            error: data.error || "Algo salio mal. Intenta de nuevo.",
          },
        }));
        return;
      }

      setFeedbackStates((prev) => ({
        ...prev,
        [position]: {
          loading: false,
          feedback: data.feedback,
          error: null,
        },
      }));
    } catch {
      setFeedbackStates((prev) => ({
        ...prev,
        [position]: {
          loading: false,
          feedback: null,
          error: "Algo salio mal. Intenta de nuevo.",
        },
      }));
    }
  };

  return (
    <section className="mt-8">
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                placeholder="Escribe tu respuesta en ingles..."
                rows={3}
                value={answer}
                onChange={(e) =>
                  handleAnswerChange(q.position, e.target.value)
                }
                disabled={state?.loading === true}
              />

              {/* Comprobar button */}
              {!state?.feedback && (
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

              {/* AI Feedback */}
              {state?.feedback && (
                <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-3">
                  <p className="text-xs text-indigo-400 mb-1 font-medium">
                    Feedback de Profe Kyle:
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {state.feedback}
                  </p>
                  {/* Try again button */}
                  <button
                    onClick={() => {
                      setFeedbackStates((prev) => ({
                        ...prev,
                        [q.position]: {
                          loading: false,
                          feedback: null,
                          error: null,
                        },
                      }));
                    }}
                    className="mt-2 text-xs text-indigo-500 hover:text-indigo-700"
                    type="button"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
