"use client";

import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import {
  applyBlankSlotEdit,
  splitBlankTyped,
} from "@/lib/music";
import type { ExamFillSentence, ExamFillSlot } from "@/types";

type FlatSlot = {
  slotIndex: number;
  sentenceNumber: number;
  slot: ExamFillSlot;
};

export default function ExamFillBlanks({
  sentences,
  slots,
  valueFor,
  onChange,
  readOnly,
  revealedFor,
  acceptedFor,
  matchFor,
  afterSlot,
}: {
  sentences: ExamFillSentence[];
  slots: FlatSlot[];
  valueFor: (slotIndex: number) => string;
  onChange: (slotIndex: number, value: string) => void;
  readOnly: boolean;
  revealedFor: (slotIndex: number) => boolean;
  acceptedFor: (slotIndex: number) => string[];
  matchFor: (slotIndex: number) => boolean;
  afterSlot?: (slotIndex: number) => ReactNode;
}) {
  return (
    <div className="space-y-4 text-story-body text-text-primary">
      {sentences.map((sentence) => {
        const sentenceSlots = slots.filter(
          (slot) => slot.sentenceNumber === sentence.number
        );
        const pieces = sentence.sentence.split(/(\([^)]+\))/g);
        let used = 0;
        return (
          <div key={sentence.number} className="space-y-2">
            <p className="mb-0">
              <span className="text-text-muted">{sentence.number}. </span>
              {pieces.map((piece, index) => {
                if (!/^\([^)]+\)$/.test(piece)) {
                  return <span key={index}>{piece}</span>;
                }
                const slot = sentenceSlots[used];
                used += 1;
                if (!slot) return <span key={index}>{piece}</span>;
                return (
                  <ExamBlank
                    key={`${sentence.number}-${slot.slotIndex}`}
                    slot={slot}
                    typed={valueFor(slot.slotIndex)}
                    onChange={onChange}
                    readOnly={readOnly}
                    revealed={revealedFor(slot.slotIndex)}
                    accepted={acceptedFor(slot.slotIndex)}
                    ok={matchFor(slot.slotIndex)}
                  />
                );
              })}
            </p>
            {sentenceSlots.map((slot) => afterSlot?.(slot.slotIndex))}
          </div>
        );
      })}
    </div>
  );
}

function ExamBlank({
  slot,
  typed,
  onChange,
  readOnly,
  revealed,
  accepted,
  ok,
}: {
  slot: FlatSlot;
  typed: string;
  onChange: (slotIndex: number, value: string) => void;
  readOnly: boolean;
  revealed: boolean;
  accepted: string[];
  ok: boolean;
}) {
  const answer = accepted[0] || slot.slot.expectedEnglish;
  const wordCount = Math.max(
    1,
    slot.slot.expectedEnglish.trim().split(/\s+/).filter(Boolean).length
  );
  const parts = splitBlankTyped(typed, wordCount);
  const empty = typed.trim() === "";
  const spanish = slot.slot.spanishWord;
  const inputId = `exam-blank-${slot.slotIndex}`;

  return (
    <span className="lyric-blank-slot">
      <span className="lyric-blank-words">
        {parts.map((part, wordSlot) => (
          <span key={wordSlot} className="lyric-blank-grow">
            <span className="lyric-blank-sizer" aria-hidden="true">
              {blankSizerText(part, revealed, empty ? spanish : "", wordSlot)}
            </span>
            <input
              id={`${inputId}-${wordSlot}`}
              value={part}
              size={1}
              placeholder={empty && wordSlot === 0 ? spanish : undefined}
              onChange={(event) => {
                const next = applyBlankSlotEdit(
                  typed,
                  wordCount,
                  wordSlot,
                  event.target.value
                );
                onChange(slot.slotIndex, next.typed);
                if (next.focusSlot === wordSlot || readOnly) return;
                requestAnimationFrame(() => {
                  document
                    .getElementById(`${inputId}-${next.focusSlot}`)
                    ?.focus();
                });
              }}
              onKeyDown={(event) => {
                if (event.key !== "Backspace") return;
                if (event.currentTarget.value !== "") return;
                if (wordSlot === 0) return;
                event.preventDefault();
                document.getElementById(`${inputId}-${wordSlot - 1}`)?.focus();
              }}
              readOnly={readOnly}
              aria-label={spanish}
              className={`lyric-blank${
                revealed ? (ok ? " lyric-blank-ok" : " lyric-blank-bad") : ""
              }`}
            />
          </span>
        ))}
      </span>
      {revealed && !ok ? (
        <span className="lyric-blank-answer text-label-sm text-success">
          {accepted.filter((value) => value.trim()).join(" / ") || answer}
        </span>
      ) : null}
      {revealed ? (
        ok ? (
          <Check
            size={14}
            className="lyric-blank-mark text-success"
            aria-label="Correcto"
          />
        ) : (
          <X
            size={14}
            className="lyric-blank-mark text-error"
            aria-label="Incorrecto"
          />
        )
      ) : null}
    </span>
  );
}

function blankSizerText(
  typed: string,
  hugWord: boolean,
  emptyHint: string,
  wordSlot: number
): string {
  if (hugWord) return typed;
  if (!typed && wordSlot === 0 && emptyHint) return emptyHint;
  if (typed.length >= 3) return typed;
  return typed + "\u00a0".repeat(3 - typed.length);
}
