"use client";

import { useEffect, useRef } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import WritingCorrectionView from "@/components/WritingCorrectionView";
import { examAnswerMatches } from "@/lib/exam";
import { wordDiff } from "@/lib/writing";

const slotClass =
  "min-h-11 w-full rounded-small px-3 py-2 text-body-main leading-7 text-text-primary";

export default function ExamCorrectToggle({
  sentenceNumber,
  original,
  accepted,
  revealed,
  editing,
  onCorrect,
  onIncorrect,
  onDraftChange,
  onSubmitFix,
  onRedo,
}: {
  sentenceNumber: number;
  original: string;
  accepted: string[];
  revealed: boolean;
  editing: boolean;
  onCorrect: () => void;
  onIncorrect: () => void;
  onDraftChange: (value: string) => void;
  onSubmitFix: (draft: string) => void;
  onRedo: () => void;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const draft = accepted[0] ?? original;
  const corrected =
    (accepted.find((value) => value.trim()) ?? "").trim() || original;
  const alreadyCorrect = examAnswerMatches(corrected, [original]);
  const showDiff = revealed && !editing && !alreadyCorrect;
  const correctSelected = revealed && !editing && alreadyCorrect;
  const incorrectSelected = editing || showDiff;
  const locked = revealed && !editing;

  useEffect(() => {
    if (!editing) return;
    fieldRef.current?.focus();
  }, [editing]);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2">
      <span className="pt-2 text-body-main text-text-primary">
        {sentenceNumber}.
      </span>
      <div className="min-w-0">
        {editing ? (
          <textarea
            ref={fieldRef}
            value={draft}
            rows={1}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (next instanceof HTMLElement && next.closest("button")) {
                return;
              }
              if (draft.trim() && !examAnswerMatches(draft, [original])) {
                onSubmitFix(draft);
              }
            }}
            className={`${slotClass} resize-none border-0 bg-surface-hover [field-sizing:content] focus:outline-none`}
          />
        ) : showDiff ? (
          <WritingCorrectionView
            diff={wordDiff(original, corrected)}
            notes={null}
            goodVocabulary={null}
            showGoodVocabulary={false}
          />
        ) : (
          <p
            className={`${slotClass} ${
              correctSelected ? "bg-success-bg" : ""
            }`}
          >
            {original}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Correcta"
            aria-pressed={correctSelected}
            onClick={() => {
              if (locked) return;
              onCorrect();
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card border-2 transition-colors duration-200 ${
              correctSelected
                ? "border-success bg-success text-white hover:bg-success-bg hover:text-success"
                : "border-paper-line bg-white text-success hover:border-success hover:bg-success-bg"
            } active:bg-success-bg active:text-success`}
          >
            <Check size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Incorrecta"
            aria-pressed={incorrectSelected}
            onClick={() => {
              if (locked) return;
              onIncorrect();
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card border-2 transition-colors duration-200 ${
              incorrectSelected
                ? "border-error bg-error text-white hover:bg-error-bg hover:text-error"
                : "border-paper-line bg-white text-error hover:border-error hover:bg-error-bg"
            } active:bg-error-bg active:text-error`}
          >
            <X size={20} aria-hidden="true" />
          </button>
          {locked ? (
            <button
              type="button"
              onClick={onRedo}
              className="ml-1 flex h-11 items-center gap-2 rounded-card px-2 text-label-md text-text-accent transition-colors duration-200 hover:bg-accent-softer"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Rehacer
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
