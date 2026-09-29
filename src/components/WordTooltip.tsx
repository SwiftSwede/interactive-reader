"use client";

import { useRef, useState, useEffect, memo } from "react";
import { Pause, Play } from "lucide-react";
import IpaText from "./IpaText";
import WordHelpSheet from "./WordHelpSheet";
import ActionButton from "./ActionButton";
import { wordFlagClassName } from "@/lib/word-flags";
import type { WordFlagType } from "@/types";

export type WordData = {
  id: string;
  position: number;
  text: string;
  spanish_translation: string;
  phonetic_transcription: string;
  part_of_speech: string;
  is_transparent: boolean;
  expression_id: string | null;
  audio_url: string;
};

export type ExpressionData = {
  id: string;
  text: string;
  spanish_translation: string;
  explanation: string;
};

type WordTooltipProps = {
  word: WordData;
  expression: ExpressionData | null;
  isHighlighted: boolean;
  onPin: (word: WordData) => void;
  onDismiss?: () => void;
  isActive: boolean;
  isExpressionActive: boolean;
  hintClass?: string;
  onFirstInteraction?: () => void;
  onLookup?: (word: WordData) => void;
  onClearLookup?: (word: WordData) => void;
  justCleared?: boolean;
  flagText?: string;
  occurrenceIndex?: number;
  isBold?: boolean;
  isUnderline?: boolean;
  requestCount?: number;
  ownRequested?: boolean;
  showTeacherFlags?: boolean;
  showStudentRequest?: boolean;
  studentRequestDisabled?: boolean;
  onToggleFlag?: (
    flagText: string,
    occurrenceIndex: number,
    flagType: WordFlagType,
    on: boolean
  ) => void;
  onRequestWord?: (flagText: string, occurrenceIndex: number) => void;
  onConvertRequests?: (flagText: string, occurrenceIndex: number) => void;
  flagNote?: string | null;
  onOpenNote?: () => void;
  onSaveNote?: (note: string) => void;
};

function WordTooltip({
  word,
  expression,
  isHighlighted,
  onPin,
  onDismiss,
  isActive,
  isExpressionActive,
  hintClass,
  onFirstInteraction,
  onLookup,
  onClearLookup,
  justCleared = false,
  flagText,
  occurrenceIndex = 0,
  isBold = false,
  isUnderline = false,
  requestCount = 0,
  ownRequested = false,
  showTeacherFlags = false,
  showStudentRequest = false,
  studentRequestDisabled = false,
  onToggleFlag,
  onRequestWord,
  onConvertRequests,
  flagNote = null,
  onOpenNote,
  onSaveNote,
}: WordTooltipProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [noteDraft, setNoteDraft] = useState(flagNote ?? "");
  const [requestState, setRequestState] = useState<
    "idle" | "pending" | "success"
  >("idle");

  useEffect(() => {
    setNoteDraft(flagNote ?? "");
  }, [flagNote]);

  useEffect(() => {
    if (!isActive) setRequestState("idle");
  }, [isActive]);

  const displayTranslation = expression
    ? expression.spanish_translation
    : word.spanish_translation;
  const displayPhonetic = word.phonetic_transcription;
  const anchorText = flagText ?? word.text;
  const flagClasses = `${wordFlagClassName({
    bold: isBold,
    underline: isUnderline,
    requestedOwn: ownRequested,
  })}${flagNote ? " word-flag-has-note" : ""}`.trim();

  const handleToggle = (type: WordFlagType, on: boolean) => {
    onToggleFlag?.(anchorText, occurrenceIndex, type, on);
  };

  const handleRequest = () => {
    if (ownRequested || studentRequestDisabled) return;
    setRequestState("pending");
    onRequestWord?.(anchorText, occurrenceIndex);
    setRequestState("success");
  };

  const handleConvert = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConvertRequests?.(anchorText, occurrenceIndex);
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!word.audio_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(word.audio_url);
    audioRef.current = audio;
    setIsPlaying(true);

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      audioRef.current = null;
    });

    audio.addEventListener("error", () => {
      setIsPlaying(false);
      audioRef.current = null;
    });

    audio.play().catch(() => {
      setIsPlaying(false);
      audioRef.current = null;
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFirstInteraction) onFirstInteraction();
    if (!showTeacherFlags && flagNote && onOpenNote) {
      onOpenNote();
      return;
    }
    onPin(word);
    if (isHighlighted) onClearLookup?.(word);
    else onLookup?.(word);
  };

  return (
    <>
      <span className="word-flag-wrap">
        <span
          ref={spanRef}
          className={`word-span ${isHighlighted ? "word-seen" : ""} ${
            isActive ? "word-active" : ""
          } ${isExpressionActive ? "word-expr-active" : ""} ${hintClass || ""} ${flagClasses}`.trim()}
          data-word-text={anchorText}
          data-word-occurrence={String(occurrenceIndex)}
          onClick={handleClick}
        >
          {word.text}
        </span>
        {showTeacherFlags && requestCount > 0 && onConvertRequests ? (
          <button
            type="button"
            className="word-flag-badge"
            aria-label={
              requestCount === 1
                ? "1 no entendió. Marcar en negrita"
                : `${requestCount} no entendieron. Marcar en negrita`
            }
            onClick={handleConvert}
          >
            <span className="word-flag-badge-count">{requestCount}</span>
          </button>
        ) : null}
      </span>

      <WordHelpSheet
        open={isActive}
        onClose={() => onDismiss?.()}
        title={word.text}
      >
        <div className="word-tooltip-inner">
          {justCleared ? (
            <p className="text-label-sm text-text-muted">Ya no está marcada.</p>
          ) : null}
          <div className="word-tooltip-gloss">
            <span className="word-tooltip-translation">
              {displayTranslation || "Sin traduccion"}
            </span>
            {word.part_of_speech ? (
              <span className="word-tooltip-pos">({word.part_of_speech})</span>
            ) : null}
            {displayPhonetic ? (
              <span className="word-tooltip-phonetic">
                <IpaText text={displayPhonetic} interactive />
              </span>
            ) : null}
            {word.audio_url ? (
              <button
                className="word-tooltip-play-btn"
                onClick={handlePlayAudio}
                aria-label="Escuchar pronunciacion"
                type="button"
              >
                {isPlaying ? (
                  <Pause size={20} strokeWidth={1.75} aria-hidden />
                ) : (
                  <Play size={20} strokeWidth={1.75} aria-hidden />
                )}
              </button>
            ) : null}
          </div>
          {expression ? (
            <span className="word-tooltip-expression">
              Expresion: {expression.text}
            </span>
          ) : null}
          {showTeacherFlags && onToggleFlag ? (
            <div className="word-tooltip-actions">
              <button
                type="button"
                className={`word-tooltip-action${isUnderline ? " word-tooltip-action-on" : ""}`}
                aria-pressed={isUnderline}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle("underline", !isUnderline);
                }}
              >
                Subrayar
              </button>
              <button
                type="button"
                className={`word-tooltip-action${isBold ? " word-tooltip-action-on" : ""}`}
                aria-pressed={isBold}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle("bold", !isBold);
                }}
              >
                Negrita
              </button>
            </div>
          ) : null}
          {showTeacherFlags && onSaveNote && (isBold || isUnderline) ? (
            <label className="mt-2 block">
              <span className="mb-1 block text-label-sm text-text-secondary">
                Nota
              </span>
              <textarea
                className="min-h-20 w-full rounded-card border border-paper-line bg-surface p-2 text-label-md text-text-primary focus:border-accent focus:outline-none"
                value={noteDraft}
                maxLength={1000}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => onSaveNote(noteDraft)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          ) : null}
          {showStudentRequest && !ownRequested && onRequestWord ? (
            <div className="word-tooltip-actions mt-2">
              <ActionButton
                variant="secondary"
                className="w-full"
                state={requestState}
                pendingLabel="Guardando..."
                successLabel="Listo"
                disabled={studentRequestDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRequest();
                }}
              >
                No entendí
              </ActionButton>
            </div>
          ) : null}
        </div>
      </WordHelpSheet>
    </>
  );
}

export default memo(WordTooltip);
