"use client";

import { useState } from "react";
import { Check, CircleHelp, X } from "lucide-react";
import { evalUiCopy, resultHeadline } from "@/lib/evaluacion/copy";
import type { PairVerdict } from "@/lib/evaluacion/pairs";
import type { EvalResult as EvalResultData, HoleSummary, ReviewEntry } from "@/lib/evaluacion/result";

function HoleList({ holes }: { holes: HoleSummary[] }) {
  return (
    <ul className="ev-holes">
      {holes.map((hole) => (
        <li key={hole.structureId} className="ev-hole">
          <span className="ev-hole-name">{hole.nameEs}</span>
        </li>
      ))}
    </ul>
  );
}

function MissMap({ result }: { result: EvalResultData }) {
  if (result.outcome === "gentle") {
    const start = [...result.confirmed, ...result.candidates];
    if (start.length === 0) return <p className="ev-body">{evalUiCopy.noHoles}</p>;
    return (
      <section className="ev-section" aria-labelledby="ev-start-here">
        <h2 className="ev-subheading" id="ev-start-here">
          Por dónde empezar
        </h2>
        <p className="ev-body">{evalUiCopy.grammarIntro}</p>
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
          <p className="ev-body">{evalUiCopy.grammarIntro}</p>
          <p className="ev-note">{evalUiCopy.confirmedNote}</p>
          <HoleList holes={result.confirmed} />
        </section>
      ) : null}
      {result.candidates.length > 0 ? (
        <section className="ev-section" aria-labelledby="ev-candidates">
          <h2 className="ev-subheading" id="ev-candidates">
            {evalUiCopy.candidatesTitle}
          </h2>
          {result.confirmed.length === 0 ? <p className="ev-body">{evalUiCopy.grammarIntro}</p> : null}
          <p className="ev-note">{evalUiCopy.candidatesNote}</p>
          <HoleList holes={result.candidates} />
        </section>
      ) : null}
    </>
  );
}

function Listening({ verdicts }: { verdicts: PairVerdict[] }) {
  if (verdicts.length === 0) return null;
  const allClean = verdicts.every((verdict) => verdict.status === null);
  return (
    <section className="ev-section" aria-labelledby="ev-listening">
      <h2 className="ev-subheading" id="ev-listening">
        {evalUiCopy.listeningTitle}
      </h2>
      {allClean ? null : <p className="ev-body">{evalUiCopy.soundIntro}</p>}
      <p className="ev-note">{allClean ? evalUiCopy.listeningAllClean : evalUiCopy.listeningNote}</p>
      <ul className="ev-holes">
        {verdicts.map((verdict) => (
          <li key={verdict.pairId} className="ev-hole ev-pair">
            <span className="ev-pair-main">
              <span className="ev-hole-name ev-ipa">
                /{verdict.sounds[0]}/ y /{verdict.sounds[1]}/
              </span>
              {verdict.said && verdict.heard ? (
                <span className="ev-pair-line">
                  Dije <span lang="en">«{verdict.said}»</span>, escuchaste{" "}
                  <span lang="en">«{verdict.heard}»</span>.
                </span>
              ) : null}
              {verdict.status ? (
                <span className="ev-pair-count">
                  {evalUiCopy.listeningMisses(verdict.wrong, verdict.total)}
                </span>
              ) : null}
            </span>
            {verdict.status ? null : (
              <span className="ev-pair-ok">
                <Check size={16} aria-hidden="true" />
                {evalUiCopy.listeningClean}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
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
  listening,
  moreInfoUrl,
  onRetake,
}: {
  result: EvalResultData;
  listening: PairVerdict[];
  moreInfoUrl: string | null;
  onRetake: () => void;
}) {
  const [tab, setTab] = useState<"grammar" | "sounds" | "answers">("grammar");
  const tabs = [
    ["grammar", evalUiCopy.tabGrammar],
    ["sounds", evalUiCopy.tabSounds],
    ["answers", evalUiCopy.tabAnswers],
  ] as const;

  return (
    <div className="ev-column ev-result ev-fade">
      <header className="ev-result-head">
        <p className="ev-eyebrow">{evalUiCopy.resultEyebrow}</p>
        <h1 className="ev-heading">{resultHeadline(result.outcome, result.placedTrack)}</h1>
        {result.outcome === "gentle" ? <p className="ev-body">{evalUiCopy.resultGentleBody}</p> : null}
      </header>

      <div className="ev-tabs" role="tablist" aria-label={evalUiCopy.resultEyebrow}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="ev-tab"
            role="tab"
            id={`ev-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`ev-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="ev-tab-panel"
        role="tabpanel"
        id={`ev-panel-${tab}`}
        aria-labelledby={`ev-tab-${tab}`}
      >
        {tab === "grammar" ? <MissMap result={result} /> : null}
        {tab === "sounds" ? <Listening verdicts={listening} /> : null}
        {tab === "answers" ? <Review review={result.review} /> : null}
      </div>

      <section className="ev-card" aria-labelledby="ev-offer">
        <h2 className="ev-subheading" id="ev-offer">
          {evalUiCopy.offerTitle}
        </h2>
        <p className="ev-body">{evalUiCopy.offerBody}</p>
      </section>

      {moreInfoUrl ? (
        <a className="ev-cta" href={moreInfoUrl} target="_blank" rel="noopener noreferrer">
          {evalUiCopy.whatsappCta}
        </a>
      ) : null}

      <button type="button" className="ev-secondary" onClick={onRetake}>
        {evalUiCopy.retake}
      </button>
    </div>
  );
}
