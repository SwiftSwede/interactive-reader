"use client";

import { useRef, useState, useEffect, useCallback, memo } from "react";

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
  isExpressionActive: boolean;
  hintClass?: string;
  onFirstInteraction?: () => void;
  onLookup?: (word: WordData) => void;
};

function WordTooltip({
  word,
  expression,
  isHighlighted,
  onActivate,
  onDismiss,
  isActive,
  isExpressionActive,
  hintClass,
  onFirstInteraction,
  onLookup,
}: WordTooltipProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine what to show in the tooltip
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

  // Hide tooltip (only if not pinned)
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

  // Desktop: hover shows tooltip (quick peek, not pinned)
  const handleMouseEnter = () => {
    if (isPinned) return; // Don't re-trigger hover if pinned
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      showTooltip();
      onActivate(word);
    }, 150);
  };

  // Desktop: mouse leave hides tooltip only if not pinned
  const handleMouseLeave = () => {
    if (isPinned) return; // Pinned tooltip stays open
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hideTooltip();
    onDismiss();
  };

  // Click: pin the tooltip open so user can interact with play button
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFirstInteraction) onFirstInteraction();
    if (isPinned) {
      // Already pinned, unpin and hide
      setIsPinned(false);
      hideTooltip();
      onDismiss();
    } else {
      // Pin it open
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setIsPinned(true);
      showTooltip();
      onActivate(word);
      onLookup?.(word);
    }
  };

  // When parent says this word is no longer active (another word clicked, or click outside)
  useEffect(() => {
    if (!isActive) {
      setIsPinned(false);
      hideTooltip();
    }
  }, [isActive, hideTooltip]);

  // Reposition on scroll/resize (only when visible)
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
        } ${isExpressionActive ? "word-expr-active" : ""} ${hintClass || ""}`.trim()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {word.text}
      </span>

      {tooltip.visible && (
        <span
          className={`word-tooltip ${isPinned ? "word-tooltip-pinned" : ""}`}
          style={{ left: tooltip.x, top: tooltip.y }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            // If hovering the tooltip while it was shown by hover (not pinned), keep it open
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
          }}
          onMouseLeave={() => {
            // If not pinned, hide when leaving the tooltip area
            if (!isPinned) {
              hideTooltip();
              onDismiss();
            }
          }}
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

export default memo(WordTooltip);