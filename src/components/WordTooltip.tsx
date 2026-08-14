"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────

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

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
};

// ── Component ──────────────────────────────────────────────

type WordTooltipProps = {
  word: WordData;
  expression: ExpressionData | null;
  isHighlighted: boolean;
  onActivate: (word: WordData) => void;
  onDismiss: () => void;
  isActive: boolean;
};

export default function WordTooltip({
  word,
  expression,
  isHighlighted,
  onActivate,
  onDismiss,
  isActive,
}: WordTooltipProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine what to show in the tooltip
  const displayText = expression ? expression.text : word.text;
  const displayTranslation = expression
    ? expression.spanish_translation
    : word.spanish_translation;
  const displayPhonetic = word.phonetic_transcription;

  // Position the tooltip relative to the word span
  const positionTooltip = useCallback(() => {
    const span = spanRef.current;
    if (!span) return;

    const rect = span.getBoundingClientRect();
    const tooltipWidth = 260; // max-width of tooltip
    const viewportWidth = window.innerWidth;

    // Center the tooltip under the word, but clamp to viewport
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    x = Math.max(8, Math.min(x, viewportWidth - tooltipWidth - 8));

    const y = rect.bottom + 6;

    setTooltip({ visible: true, x, y });
  }, []);

  // Show tooltip
  const showTooltip = useCallback(() => {
    positionTooltip();
  }, [positionTooltip]);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // Play word audio
  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!word.audio_url) return;

    // Stop existing audio if playing
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

  // Desktop: hover events
  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      showTooltip();
      onActivate(word);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hideTooltip();
    onDismiss();
  };

  // Mobile: tap to toggle
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tooltip.visible) {
      hideTooltip();
      onDismiss();
    } else {
      showTooltip();
      onActivate(word);
    }
  };

  // Listen for external dismiss (clicking elsewhere)
  useEffect(() => {
    if (!isActive) {
      hideTooltip();
    }
  }, [isActive, hideTooltip]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!tooltip.visible) return;
    const handleReposition = () => positionTooltip();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [tooltip.visible, positionTooltip]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  return (
    <>
      <span
        ref={spanRef}
        className={`word-span ${isHighlighted ? "word-seen" : ""} ${
          tooltip.visible ? "word-active" : ""
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {word.text}
      </span>

      {tooltip.visible && (
        <span
          className="word-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <span className="word-tooltip-inner">
            <span className="word-tooltip-translation">
              {displayTranslation || "Sin traduccion"}
            </span>
            {displayPhonetic && (
              <span className="word-tooltip-phonetic-row">
                <span className="word-tooltip-phonetic">
                  {displayPhonetic}
                </span>
                {word.audio_url && (
                  <button
                    className="word-tooltip-play-btn"
                    onClick={handlePlayAudio}
                    aria-label="Escuchar pronunciacion"
                    type="button"
                  >
                    {isPlaying ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>
                )}
              </span>
            )}
            {expression && (
              <span className="word-tooltip-expression">
                Expresion: {expression.text}
              </span>
            )}
            {word.part_of_speech && (
              <span className="word-tooltip-pos">{word.part_of_speech}</span>
            )}
          </span>
        </span>
      )}
    </>
  );
}