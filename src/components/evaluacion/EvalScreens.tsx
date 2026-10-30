"use client";

import { evalUiCopy, openerOptions } from "@/lib/evaluacion/copy";
import type { Opener } from "@/lib/evaluacion/types";
import type { Transition } from "@/lib/evaluacion/view";

export function EvalSplash({
  canResume,
  onStart,
  onResume,
}: {
  canResume: boolean;
  onStart: () => void;
  onResume: () => void;
}) {
  return (
    <div className="ev-column ev-center ev-fade">
      <h1 className="ev-title">{evalUiCopy.splashTitle}</h1>
      <p className="ev-body">{evalUiCopy.splashLead}</p>
      <p className="ev-note">{evalUiCopy.splashNote}</p>
      <div className="ev-actions">
        {canResume ? (
          <>
            <button type="button" className="ev-cta" onClick={onResume}>
              {evalUiCopy.splashResume}
            </button>
            <button type="button" className="ev-secondary" onClick={onStart}>
              {evalUiCopy.splashRestart}
            </button>
          </>
        ) : (
          <button type="button" className="ev-cta" onClick={onStart}>
            {evalUiCopy.splashStart}
          </button>
        )}
      </div>
    </div>
  );
}

export function EvalOpener({
  busy,
  error,
  onChoose,
}: {
  busy: boolean;
  error: string | null;
  onChoose: (opener: Opener) => void;
}) {
  return (
    <div className="ev-column ev-screen ev-fade">
      <div className="ev-screen-head">
        <h1 className="ev-heading">{evalUiCopy.openerTitle}</h1>
        <p className="ev-note">{evalUiCopy.openerNote}</p>
      </div>
      <div className="ev-options">
        {openerOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className="ev-option ev-opener-button"
            disabled={busy}
            onClick={() => onChoose(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="ev-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EvalTransition({
  transition,
  onContinue,
}: {
  transition: Transition;
  onContinue: () => void;
}) {
  const copy = evalUiCopy.transition[transition];
  return (
    <div className="ev-column ev-center ev-fade">
      <h1 className="ev-heading">{copy.title}</h1>
      <p className="ev-body">{copy.body}</p>
      <div className="ev-actions">
        <button type="button" className="ev-cta" onClick={onContinue} autoFocus>
          {evalUiCopy.continueCta}
        </button>
      </div>
    </div>
  );
}

export function EvalLoading() {
  return (
    <div className="ev-column ev-screen" aria-busy="true" aria-label={evalUiCopy.loading}>
      <div className="ev-skeleton" style={{ height: 32, width: "70%" }} />
      <div className="ev-skeleton" style={{ height: 20, width: "50%" }} />
      <div className="ev-skeleton" style={{ height: 56 }} />
      <div className="ev-skeleton" style={{ height: 56 }} />
      <div className="ev-skeleton" style={{ height: 56 }} />
    </div>
  );
}

export function EvalErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ev-column ev-center ev-fade" role="alert">
      <h1 className="ev-subheading">{message}</h1>
      <div className="ev-actions">
        <button type="button" className="ev-cta" onClick={onRetry}>
          {evalUiCopy.retry}
        </button>
      </div>
    </div>
  );
}
