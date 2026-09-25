"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { fieldClass } from "@/components/teacher/content/editor-ui";
import { flattenFillSlots, type ParsedExamPrompt } from "@/lib/exam";
import type { ExamClassSessionOption } from "@/lib/content-editor";
import type {
  ExamCorrectionItem,
  ExamFillSentence,
  ExamTranslationItem,
} from "@/types";

export default function ExamAnswersSection({
  live,
  sessions,
  copyPending,
  copyError,
  onFillChange,
  onCorrectionsChange,
  onTranslationsChange,
  onCopyFromClass,
}: {
  live: ParsedExamPrompt;
  sessions: ExamClassSessionOption[];
  copyPending: boolean;
  copyError: string;
  onFillChange: (sentences: ExamFillSentence[]) => void;
  onCorrectionsChange: (items: ExamCorrectionItem[]) => void;
  onTranslationsChange: (items: ExamTranslationItem[]) => void;
  onCopyFromClass: (sessionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const slots = flattenFillSlots(live.fillInTranslation);
  const corrections = live.sentenceCorrection ?? [];

  function patchSlot(
    slotIndex: number,
    patch: { expectedEnglish?: string | null; acceptableVariations?: string[] }
  ) {
    const sentences = live.fillInTranslation.map((sentence) => ({
      ...sentence,
      slots: sentence.slots.map((slot) => ({ ...slot })),
    }));
    const row = flattenFillSlots(sentences).find(
      (item) => item.slotIndex === slotIndex
    );
    if (!row) return;
    Object.assign(row.slot, patch);
    onFillChange(sentences);
  }

  return (
    <div className="rounded-card border border-paper-line">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-label-md font-medium text-text-primary">
          Respuestas (después de clase)
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-text-secondary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="space-y-6 border-t border-paper-line px-4 py-4">
          {sessions.length > 0 ? (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1.5 block text-label-md text-text-secondary">
                  Copiar respuestas de la clase
                </span>
                <select
                  value={sessionId}
                  onChange={(event) => setSessionId(event.target.value)}
                  className={fieldClass}
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={copyPending || !sessionId}
                onClick={() => onCopyFromClass(sessionId)}
                className="inline-flex min-h-11 items-center justify-center rounded-card border border-paper-line px-4 text-label-md text-text-primary hover:bg-surface-hover disabled:opacity-60"
              >
                {copyPending ? "Copiando..." : "Copiar respuestas de la clase"}
              </button>
              {copyError ? (
                <p className="text-sm text-error">{copyError}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Todavía no hay una clase con este examen. Las respuestas se
              copian después de type-check en vivo.
            </p>
          )}

          {slots.length > 0 ? (
            <section className="space-y-4">
              <h3 className="text-label-md text-text-secondary">Tarea 1</h3>
              {slots.map((row) => (
                <div key={row.slotIndex} className="space-y-2">
                  <p className="text-label-md text-text-primary">
                    Hueco {row.slotIndex + 1}: ({row.slot.spanishWord})
                  </p>
                  <input
                    value={row.slot.expectedEnglish ?? ""}
                    onChange={(event) =>
                      patchSlot(row.slotIndex, {
                        expectedEnglish: event.target.value.trim() || null,
                      })
                    }
                    placeholder="Respuesta"
                    className={fieldClass}
                  />
                  {row.slot.acceptableVariations.map((variant, index) => (
                    <input
                      key={`t1-var-${row.slotIndex}-${index}`}
                      value={variant}
                      onChange={(event) => {
                        const next = [...row.slot.acceptableVariations];
                        next[index] = event.target.value;
                        patchSlot(row.slotIndex, {
                          acceptableVariations: next,
                        });
                      }}
                      placeholder="Otra forma"
                      className={fieldClass}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      patchSlot(row.slotIndex, {
                        acceptableVariations: [
                          ...row.slot.acceptableVariations,
                          "",
                        ],
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Añadir
                  </button>
                </div>
              ))}
            </section>
          ) : null}

          {corrections.length > 0 ? (
            <section className="space-y-4">
              <h3 className="text-label-md text-text-secondary">Tarea 2</h3>
              {corrections.map((item, index) => (
                <div key={item.number} className="space-y-2">
                  <p className="text-story-body text-text-primary">
                    {item.number}. {item.sentence}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={item.isCorrect === true}
                      onClick={() => {
                        const next = corrections.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                isCorrect: true,
                                correctedVersion: null,
                              }
                            : row
                        );
                        onCorrectionsChange(next);
                      }}
                      className={`h-11 flex-1 rounded-card text-label-md ${
                        item.isCorrect === true
                          ? "bg-success text-white"
                          : "border border-paper-line"
                      }`}
                    >
                      Correcta
                    </button>
                    <button
                      type="button"
                      aria-pressed={item.isCorrect === false}
                      onClick={() => {
                        const next = corrections.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                isCorrect: false,
                                correctedVersion: row.correctedVersion ?? "",
                              }
                            : row
                        );
                        onCorrectionsChange(next);
                      }}
                      className={`h-11 flex-1 rounded-card text-label-md ${
                        item.isCorrect === false
                          ? "bg-error text-white"
                          : "border border-paper-line"
                      }`}
                    >
                      Incorrecta
                    </button>
                  </div>
                  {item.isCorrect === false ? (
                    <textarea
                      value={item.correctedVersion ?? ""}
                      onChange={(event) => {
                        const next = corrections.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, correctedVersion: event.target.value }
                            : row
                        );
                        onCorrectionsChange(next);
                      }}
                      rows={2}
                      placeholder="Corrección"
                      className={fieldClass}
                    />
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {live.translationSentences.length > 0 ? (
            <section className="space-y-4">
              <h3 className="text-label-md text-text-secondary">Tarea 3</h3>
              {live.translationSentences.map((item, index) => (
                <div key={item.number} className="space-y-2">
                  <p className="text-story-body text-text-primary">
                    {item.number}. {item.spanish}
                  </p>
                  <input
                    value={item.acceptedEnglish[0] ?? ""}
                    onChange={(event) => {
                      const next = live.translationSentences.map(
                        (row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                acceptedEnglish: event.target.value.trim()
                                  ? [event.target.value]
                                  : [],
                              }
                            : row
                      );
                      onTranslationsChange(next);
                    }}
                    placeholder="Inglés"
                    className={fieldClass}
                  />
                  {item.acceptableVariations.map((variant, variantIndex) => (
                    <input
                      key={`t3-var-${item.number}-${variantIndex}`}
                      value={variant}
                      onChange={(event) => {
                        const next = live.translationSentences.map(
                          (row, rowIndex) => {
                            if (rowIndex !== index) return row;
                            const vars = [...row.acceptableVariations];
                            vars[variantIndex] = event.target.value;
                            return { ...row, acceptableVariations: vars };
                          }
                        );
                        onTranslationsChange(next);
                      }}
                      placeholder="Otra forma"
                      className={fieldClass}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = live.translationSentences.map(
                        (row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                acceptableVariations: [
                                  ...row.acceptableVariations,
                                  "",
                                ],
                              }
                            : row
                      );
                      onTranslationsChange(next);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Añadir variación
                  </button>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
