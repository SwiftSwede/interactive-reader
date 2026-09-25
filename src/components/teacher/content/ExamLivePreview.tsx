"use client";

import ExamFillBlanks from "@/components/exam/ExamFillBlanks";
import {
  displayParagraphItems,
  examRowLetter,
  flattenFillSlots,
  type ParsedExamPrompt,
} from "@/lib/exam";

export default function ExamLivePreview({
  live,
  promptId,
}: {
  live: ParsedExamPrompt;
  promptId: string;
}) {
  const fillSentences = live.fillInTranslation.slice(0, 3);
  const fillSlots = flattenFillSlots(fillSentences);
  const orderItems = displayParagraphItems(
    live.paragraphRestructuring ?? [],
    promptId
  ).slice(0, 3);
  const corrections = (live.sentenceCorrection ?? []).slice(0, 3);
  const translations = live.translationSentences.slice(0, 3);

  return (
    <div className="space-y-5 rounded-card border border-paper-line bg-white p-4">
      <p className="text-label-md text-text-secondary">Vista previa</p>
      {fillSentences.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-label-md text-text-secondary">Tarea 1</h3>
          <ExamFillBlanks
            sentences={fillSentences}
            slots={fillSlots}
            valueFor={() => ""}
            onChange={() => undefined}
            readOnly
            revealedFor={() => false}
            acceptedFor={() => []}
            matchFor={() => false}
          />
        </section>
      ) : null}
      {orderItems.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-label-md text-text-secondary">Tarea 2</h3>
          <ol className="space-y-2">
            {orderItems.map((item, index) => (
              <li key={item.number} className="flex items-start gap-3">
                <span className="pt-2 text-label-md text-text-secondary">
                  {examRowLetter(index)}.
                </span>
                <span
                  className="h-11 w-11 shrink-0 rounded-small border border-paper-line bg-surface-hover"
                  aria-hidden="true"
                />
                <p className="pt-2 text-story-body text-text-primary">
                  {item.sentence}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {corrections.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-label-md text-text-secondary">Tarea 2</h3>
          <ol className="space-y-3">
            {corrections.map((item) => (
              <li key={item.number} className="space-y-2">
                <p className="text-story-body text-text-primary">
                  {item.number}. {item.sentence}
                </p>
                <div className="flex gap-2">
                  <span className="flex h-11 flex-1 items-center justify-center rounded-card border border-paper-line text-label-md text-text-muted">
                    Correcta
                  </span>
                  <span className="flex h-11 flex-1 items-center justify-center rounded-card border border-paper-line text-label-md text-text-muted">
                    Corregir
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {translations.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-label-md text-text-secondary">Tarea 3</h3>
          <ol className="space-y-3">
            {translations.map((item) => (
              <li key={item.number} className="space-y-2">
                <p className="text-story-body text-text-primary">
                  {item.number}. {item.spanish}
                </p>
                <div
                  className="min-h-11 rounded-card border border-paper-line bg-surface-hover"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
