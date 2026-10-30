"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { evalUiCopy } from "@/lib/evaluacion/copy";
import { NO_SE_OPTION_ID, type ItemFormat } from "@/lib/evaluacion/types";
import type { PassProgress, QuestionView } from "@/lib/evaluacion/view";

const instruction: Record<ItemFormat, string> = {
  translation: evalUiCopy.questionTranslation,
  fill_blank: evalUiCopy.questionFill,
  mc: evalUiCopy.questionMc,
};

export function EvalHeader({
  progress,
  onQuit,
}: {
  progress: PassProgress;
  onQuit: () => void;
}) {
  const current = Math.min(progress.answered + 1, progress.total);
  const percent = Math.round((progress.answered / Math.max(progress.total, 1)) * 100);
  return (
    <header className="ev-header">
      <div className="ev-column ev-header-row">
        <button
          type="button"
          className="ev-quit"
          aria-label={evalUiCopy.quit}
          onClick={onQuit}
        >
          <X size={24} aria-hidden="true" />
        </button>
        <div
          className="ev-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.answered}
          aria-label={`Pregunta ${current} de ${progress.total}`}
        >
          <div className="ev-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="ev-progress-count" aria-hidden="true">
          {current}/{progress.total}
        </span>
      </div>
    </header>
  );
}

export function EvalQuestion({
  question,
  busy,
  error,
  onSubmit,
}: {
  question: QuestionView;
  busy: boolean;
  error: string | null;
  onSubmit: (optionId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <form
      className="ev-column ev-screen ev-fade"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected && !busy) onSubmit(selected);
      }}
    >
      <div className="ev-screen-head">
        {question.isDraft ? <span className="ev-draft">{evalUiCopy.draftBadge}</span> : null}
        <p className="ev-note" id="ev-instruction">
          {instruction[question.format]}
        </p>
        <h1 className="ev-prompt">{question.prompt}</h1>
      </div>

      <fieldset className="ev-options" aria-labelledby="ev-instruction">
        {question.options.map((option) => {
          const isNoSe = option.id === NO_SE_OPTION_ID;
          return (
            <label key={option.id} className="ev-option">
              <input
                type="radio"
                name="option"
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
              />
              <span className="ev-option-mark" aria-hidden="true" />
              <span className={isNoSe ? "ev-option-nose" : undefined} lang={isNoSe ? "es" : "en"}>
                {option.text}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="ev-question-foot">
        {error ? (
          <p className="ev-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="ev-cta" disabled={!selected || busy}>
          {evalUiCopy.next}
        </button>
      </div>
    </form>
  );
}
