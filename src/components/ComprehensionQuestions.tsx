"use client";

import { useEffect, useRef, useState } from "react";
import { saveComprehensionResponse } from "@/app/story/[slug]/actions";

// ── Types ──────────────────────────────────────────────────

type Question = {
  id: string;
  position: number;
  question: string;
  answer: string | null;
};

export type SavedComprehensionResponse = {
  questionId: string;
  responseText: string;
  revealedAnswer: boolean;
};

type ComprehensionQuestionsProps = {
  questions: Question[];
  allowReveal?: boolean;
  unlockAt?: string;
  sessionId?: string;
  savedResponses?: SavedComprehensionResponse[];
};

const MAX_TIMEOUT_MS = 2_147_483_647;
const SAVE_DEBOUNCE_MS = 600;

function hydrateFromSaved(
  questions: Question[],
  savedResponses: SavedComprehensionResponse[] | undefined
) {
  const answers: Record<number, string> = {};
  const revealed = new Set<number>();
  const persisted = new Set<string>();

  if (!savedResponses) {
    return { answers, revealed, persisted };
  }

  const byId = new Map(
    savedResponses.map((row) => [row.questionId, row] as const)
  );

  for (const q of questions) {
    const saved = byId.get(q.id);
    if (!saved) continue;
    persisted.add(q.id);
    answers[q.position] = saved.responseText;
    if (saved.revealedAnswer) {
      revealed.add(q.position);
    }
  }

  return { answers, revealed, persisted };
}

// ── Component ──────────────────────────────────────────────

export default function ComprehensionQuestions({
  questions,
  allowReveal = true,
  unlockAt,
  sessionId,
  savedResponses,
}: ComprehensionQuestionsProps) {
  const initial = hydrateFromSaved(questions, savedResponses);
  const [revealed, setRevealed] = useState<Set<number>>(
    () => initial.revealed
  );
  const [answers, setAnswers] = useState<Record<number, string>>(
    () => initial.answers
  );
  const [canReveal, setCanReveal] = useState(allowReveal);
  const timersRef = useRef<Record<string, number>>({});
  const persistedRef = useRef<Set<string>>(initial.persisted);

  useEffect(() => {
    if (allowReveal) {
      setCanReveal(true);
      return;
    }

    if (!unlockAt) {
      setCanReveal(false);
      return;
    }

    const remaining = new Date(unlockAt).getTime() - Date.now();
    if (!Number.isFinite(remaining)) {
      setCanReveal(false);
      return;
    }
    if (remaining <= 0) {
      setCanReveal(true);
      return;
    }

    setCanReveal(false);
    if (remaining > MAX_TIMEOUT_MS) return;

    const id = window.setTimeout(() => setCanReveal(true), remaining);
    return () => window.clearTimeout(id);
  }, [allowReveal, unlockAt]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of Object.values(timers)) {
        window.clearTimeout(id);
      }
    };
  }, []);

  const persist = (
    questionId: string,
    text: string,
    revealedAnswer: boolean
  ) => {
    if (!sessionId) return;
    const already = persistedRef.current.has(questionId);
    if (!text.trim() && !revealedAnswer && !already) return;

    void saveComprehensionResponse({
      sessionId,
      questionId,
      responseText: text,
      revealedAnswer: revealedAnswer || undefined,
    }).then((result) => {
      if (result.ok) {
        persistedRef.current.add(questionId);
      } else {
        console.error("saveComprehensionResponse failed");
      }
    });
  };

  const flushSave = (
    questionId: string,
    text: string,
    revealedAnswer: boolean
  ) => {
    const existing = timersRef.current[questionId];
    if (existing) {
      window.clearTimeout(existing);
      delete timersRef.current[questionId];
    }
    persist(questionId, text, revealedAnswer);
  };

  const scheduleSave = (
    questionId: string,
    text: string,
    revealedAnswer: boolean
  ) => {
    if (!sessionId) return;
    const existing = timersRef.current[questionId];
    if (existing) window.clearTimeout(existing);
    timersRef.current[questionId] = window.setTimeout(() => {
      delete timersRef.current[questionId];
      persist(questionId, text, revealedAnswer);
    }, SAVE_DEBOUNCE_MS);
  };

  const handleReveal = (position: number, questionId: string) => {
    if (!canReveal) return;
    setRevealed((prev) => new Set(prev).add(position));
    flushSave(questionId, answers[position] || "", true);
  };

  const handleAnswerChange = (
    position: number,
    questionId: string,
    value: string
  ) => {
    setAnswers((prev) => ({ ...prev, [position]: value }));
    scheduleSave(questionId, value, revealed.has(position));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    position: number,
    questionId: string,
    hasAnswer: boolean
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasAnswer && canReveal) {
        handleReveal(position, questionId);
      }
    }
  };

  return (
    <section className="mt-12 border-t border-gray-100 pt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Comprehension Questions
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {canReveal
          ? "Escribe tu respuesta y luego verifica si acertaste."
          : "Escribe tu respuesta. El Profe Kyle te dice cuándo puedes verificar."}
      </p>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isRevealed = revealed.has(q.position);
          const studentAnswer = answers[q.position] || "";

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
                rows={2}
                value={studentAnswer}
                onChange={(e) =>
                  handleAnswerChange(q.position, q.id, e.target.value)
                }
                onBlur={(e) =>
                  flushSave(q.id, e.currentTarget.value, isRevealed)
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, q.position, q.id, !!q.answer)
                }
                disabled={isRevealed}
              />

              {/* Reveal button or answer */}
              {isRevealed ? (
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">
                    Respuesta:
                  </p>
                  {studentAnswer.trim() && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="text-gray-400">Tu respuesta: </span>
                      {studentAnswer}
                    </p>
                  )}
                  {q.answer && (
                    <p className="text-sm text-gray-800">
                      {q.answer}
                    </p>
                  )}
                </div>
              ) : canReveal ? (
                <button
                  onClick={() => handleReveal(q.position, q.id)}
                  disabled={!studentAnswer.trim()}
                  className={`mt-2 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                    studentAnswer.trim()
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  type="button"
                >
                  Ver respuesta
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
