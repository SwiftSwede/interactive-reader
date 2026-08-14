"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────

type Question = {
  id: string;
  position: number;
  question: string;
  answer: string | null;
};

type ComprehensionQuestionsProps = {
  questions: Question[];
};

// ── Component ──────────────────────────────────────────────

export default function ComprehensionQuestions({
  questions,
}: ComprehensionQuestionsProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleReveal = (position: number) => {
    setRevealed((prev) => new Set(prev).add(position));
  };

  const handleAnswerChange = (position: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [position]: value }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    position: number,
    hasAnswer: boolean
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasAnswer) {
        handleReveal(position);
      }
    }
  };

  return (
    <section className="mt-12 border-t border-gray-100 pt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Comprehension Questions
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Escribe tu respuesta y luego verifica si acertaste.
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
                  handleAnswerChange(q.position, e.target.value)
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, q.position, !!q.answer)
                }
                disabled={isRevealed}
              />

              {/* Reveal button or answer */}
              {!isRevealed ? (
                <button
                  onClick={() => handleReveal(q.position)}
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
              ) : (
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
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}