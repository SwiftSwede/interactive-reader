"use client";

import { useEffect, useRef, useState } from "react";
import {
  recordComprehensionSelfCheck,
  saveComprehensionResponse,
} from "@/app/story/[slug]/actions";
import MicroExplanation from "./MicroExplanation";

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
  microExplanation?: string;
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
  microExplanation,
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

    if (sessionId) {
      // Classroom: the save path already records progress and evidence.
      flushSave(questionId, answers[position] || "", true);
      return;
    }

    // Open reading: no session to save against, but a logged-in learner still
    // earns reading progress. The action is a no-op when signed out.
    void recordComprehensionSelfCheck({ questionId });
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
    <section>
      <h3 className="text-headline-md text-text-primary mb-1">
        Comprehension Questions
      </h3>
      <p className="text-label-md text-text-secondary mb-4">
        {canReveal
          ? "Escribe tu respuesta y luego verifica si acertaste."
          : "Escribe tu respuesta. El Profe Kyle te dice cuándo puedes verificar."}
      </p>

      {microExplanation && (
        <MicroExplanation
          dismissKey="comprehension"
          text={microExplanation}
        />
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isRevealed = revealed.has(q.position);
          const studentAnswer = answers[q.position] || "";

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
                className="w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-2 focus:border-accent"
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
                <div className="mt-3 rounded-card bg-surface-hover px-3 py-3">
                  <p className="text-label-sm text-text-muted mb-1">
                    Respuesta:
                  </p>
                  {studentAnswer.trim() && (
                    <p className="text-body-main text-text-secondary mb-2">
                      <span className="text-text-muted">Tu respuesta: </span>
                      {studentAnswer}
                    </p>
                  )}
                  {q.answer && (
                    <p className="text-body-main text-text-primary">
                      {q.answer}
                    </p>
                  )}
                </div>
              ) : canReveal ? (
                <button
                  onClick={() => handleReveal(q.position, q.id)}
                  disabled={!studentAnswer.trim()}
                  className={`mt-2 min-h-11 text-label-md px-5 py-3 rounded-card transition-colors ${
                    studentAnswer.trim()
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "bg-surface-hover text-text-muted cursor-not-allowed"
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
