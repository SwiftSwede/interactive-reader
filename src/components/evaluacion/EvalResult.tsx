"use client";

import { useState } from "react";
import { Check, CircleHelp, X } from "lucide-react";
import { sessionTypeLabel } from "@/lib/activities";
import { evaluacionConfig } from "@/lib/evaluacion/config";
import { evalUiCopy, resultHeadline } from "@/lib/evaluacion/copy";
import type { EvalResult as EvalResultData, HoleSummary, ReviewEntry } from "@/lib/evaluacion/result";
import { evalApi, EvalRequestError } from "./evalApi";

const MAX_LISTED = 5;

function HoleList({ holes }: { holes: HoleSummary[] }) {
  const shown = holes.slice(0, MAX_LISTED);
  const hidden = holes.length - shown.length;
  return (
    <>
      <ul className="ev-holes">
        {shown.map((hole) => (
          <li key={hole.structureId} className="ev-hole">
            <span className="ev-hole-name">{hole.nameEs}</span>
            <span className="ev-hole-class">Clase: {sessionTypeLabel(hole.classType)}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? <p className="ev-note">Y {hidden} más en la revisión de abajo.</p> : null}
    </>
  );
}

function MissMap({ result }: { result: EvalResultData }) {
  if (result.outcome === "gentle") {
    const start = [...result.confirmed, ...result.candidates];
    if (start.length === 0) return null;
    return (
      <section className="ev-section" aria-labelledby="ev-start-here">
        <h2 className="ev-subheading" id="ev-start-here">
          Por dónde empezar
        </h2>
        <HoleList holes={start} />
      </section>
    );
  }

  if (result.confirmed.length === 0 && result.candidates.length === 0) {
    return <p className="ev-body">{evalUiCopy.noHoles}</p>;
  }

  return (
    <>
      {result.confirmed.length > 0 ? (
        <section className="ev-section" aria-labelledby="ev-confirmed">
          <h2 className="ev-subheading" id="ev-confirmed">
            {evalUiCopy.confirmedTitle}
          </h2>
          <p className="ev-note">{evalUiCopy.confirmedNote}</p>
          <HoleList holes={result.confirmed} />
        </section>
      ) : null}
      {result.candidates.length > 0 ? (
        <section className="ev-section" aria-labelledby="ev-candidates">
          <h2 className="ev-subheading" id="ev-candidates">
            {evalUiCopy.candidatesTitle}
          </h2>
          <p className="ev-note">{evalUiCopy.candidatesNote}</p>
          <HoleList holes={result.candidates} />
        </section>
      ) : null}
    </>
  );
}

function EmailCapture({ alreadySaved }: { alreadySaved: boolean }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "skipped">(
    alreadySaved ? "saved" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (status === "skipped") return null;
  if (status === "saved") {
    return (
      <p className="ev-body ev-review-right" role="status">
        {evalUiCopy.emailSaved}
      </p>
    );
  }

  return (
    <form
      className="ev-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("saving");
        setError(null);
        try {
          await evalApi.email(email, website);
          setStatus("saved");
        } catch (caught) {
          setError(caught instanceof EvalRequestError ? caught.message : evalUiCopy.error);
          setStatus("idle");
        }
      }}
    >
      <h2 className="ev-subheading">{evalUiCopy.emailTitle}</h2>
      <p className="ev-note">{evalUiCopy.emailNote}</p>
      <div className="ev-field">
        <label htmlFor="ev-email">{evalUiCopy.emailLabel}</label>
        <input
          id="ev-email"
          className="ev-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={200}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="ev-honeypot" aria-hidden="true">
        <label htmlFor="ev-website">Website</label>
        <input
          id="ev-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      {error ? (
        <p className="ev-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ev-actions">
        <button type="submit" className="ev-cta" disabled={status === "saving"}>
          {status === "saving" ? "Enviando…" : evalUiCopy.emailCta}
        </button>
        <button type="button" className="ev-link" onClick={() => setStatus("skipped")}>
          {evalUiCopy.emailSkip}
        </button>
      </div>
    </form>
  );
}

function ReviewItem({ entry }: { entry: ReviewEntry }) {
  return (
    <li className="ev-review-item">
      <p className="ev-review-prompt">{entry.prompt}</p>
      {entry.isCorrect ? (
        <p className="ev-review-line ev-review-right">
          <Check size={18} aria-hidden="true" />
          <span>
            <span className="sr-only">{evalUiCopy.reviewCorrect}: </span>
            <span lang="en">{entry.correctText}</span>
          </span>
        </p>
      ) : (
        <>
          <p className="ev-review-line ev-review-wrong">
            {entry.choseNoSe ? (
              <>
                <CircleHelp size={18} aria-hidden="true" />
                <span>{evalUiCopy.reviewNoSe}</span>
              </>
            ) : (
              <>
                <X size={18} aria-hidden="true" />
                <span>
                  {evalUiCopy.reviewYours}: <span lang="en">{entry.selectedText}</span>
                </span>
              </>
            )}
          </p>
          <p className="ev-review-line ev-review-right">
            <Check size={18} aria-hidden="true" />
            <span>
              {evalUiCopy.reviewCorrect}: <span lang="en">{entry.correctText}</span>
            </span>
          </p>
          <p className="ev-review-rule">{entry.ruleText}</p>
        </>
      )}
    </li>
  );
}

function Review({ review }: { review: ReviewEntry[] }) {
  const wrong = review.filter((entry) => !entry.isCorrect);
  const right = review.filter((entry) => entry.isCorrect);
  return (
    <section className="ev-section" aria-labelledby="ev-review">
      <h2 className="ev-subheading" id="ev-review">
        {evalUiCopy.reviewTitle}
      </h2>
      {wrong.length > 0 ? (
        <ul className="ev-review">
          {wrong.map((entry) => (
            <ReviewItem key={entry.itemId} entry={entry} />
          ))}
        </ul>
      ) : null}
      {right.length > 0 ? (
        <details className="ev-details">
          <summary>
            {evalUiCopy.reviewShowCorrect} ({right.length})
          </summary>
          <ul className="ev-review">
            {right.map((entry) => (
              <ReviewItem key={entry.itemId} entry={entry} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export function EvalResult({
  result,
  emailCaptured,
  onRetake,
}: {
  result: EvalResultData;
  emailCaptured: boolean;
  onRetake: () => void;
}) {
  return (
    <div className="ev-column ev-result ev-fade">
      <header className="ev-result-head">
        <p className="ev-eyebrow">{evalUiCopy.resultEyebrow}</p>
        <h1 className="ev-heading">{resultHeadline(result.outcome, result.placedTrack)}</h1>
        {result.outcome === "gentle" ? (
          <p className="ev-body">{evalUiCopy.resultGentleBody}</p>
        ) : (
          <p className="ev-note">
            {result.outcome === "top" ? evalUiCopy.challengeWon : evalUiCopy.challengeNotYet}
          </p>
        )}
      </header>

      <MissMap result={result} />

      <section className="ev-card ev-card-accent" aria-labelledby="ev-offer">
        <h2 className="ev-subheading" id="ev-offer">
          {evalUiCopy.offerTitle}
        </h2>
        <p className="ev-body">{evalUiCopy.offerBody}</p>
        <a className="ev-cta" href={evaluacionConfig.circleOfferUrl}>
          {evalUiCopy.offerCta}
        </a>
      </section>

      <EmailCapture alreadySaved={emailCaptured} />

      <Review review={result.review} />

      <button type="button" className="ev-secondary" onClick={onRetake}>
        {evalUiCopy.retake}
      </button>
    </div>
  );
}
