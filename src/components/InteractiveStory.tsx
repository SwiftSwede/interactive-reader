"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import WordTooltip, {
  type WordData,
  type ExpressionData,
} from "./WordTooltip";
import StoryAudioPlayer from "./StoryAudioPlayer";

// ── Types ──────────────────────────────────────────────────

type WordTimestamp = {
  position: number;
  text: string;
  start: number;
  end: number;
};

type InteractiveStoryProps = {
  bodyText: string;
  words: WordData[];
  expressions: ExpressionData[];
  audioUrl: string;
  timestamps: WordTimestamp[];
};

// ── Component ──────────────────────────────────────────────

export default function InteractiveStory({
  bodyText,
  words,
  expressions,
  audioUrl,
  timestamps,
}: InteractiveStoryProps) {
  const [seenPositions, setSeenPositions] = useState<Set<number>>(new Set());
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [activeExpressionId, setActiveExpressionId] = useState<string | null>(
    null
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for direct-DOM karaoke highlight (bypasses React render cycle).
  // Driving the highlight through React state (setAudioCurrentTime 60x/sec)
  // causes re-renders that mobile browsers can't keep up with, resulting
  // in the highlight flashing for 1 frame and disappearing.
  // Instead, StoryAudioPlayer calls onAudioTime with the current time,
  // and a RAF loop here directly toggles the .word-audio-current CSS class
  // on the appropriate DOM element via classList.
  const audioTimeRef = useRef(0);
  const karaokeRafRef = useRef<number | null>(null);
  const highlightedPosRef = useRef<number>(-1);

  // Build expression lookup
  const expressionMap = useMemo(() => {
    const map = new Map<string, ExpressionData>();
    for (const expr of expressions) {
      map.set(expr.id, expr);
    }
    return map;
  }, [expressions]);

  // Build expression group map: expression_id -> Set of word positions
  const expressionPositions = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const word of words) {
      if (word.expression_id) {
        let positions = map.get(word.expression_id);
        if (!positions) {
          positions = new Set();
          map.set(word.expression_id, positions);
        }
        positions.add(word.position);
      }
    }
    return map;
  }, [words]);

  // ── Karaoke: direct DOM manipulation ───────────────────
  // Finds the word span elements once, then on each RAF tick
  // toggles the .word-audio-current class directly. No React
  // state updates, no re-renders, no virtual DOM diffing.

  const getWordSpans = useCallback(() => {
    return containerRef.current?.querySelectorAll<HTMLElement>(".word-span");
  }, []);

  // Binary search: last word whose start <= time
  const findPositionAtTime = useCallback(
    (time: number) => {
      if (time <= 0) return -1;
      let lo = 0;
      let hi = timestamps.length - 1;
      let result = -1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const ts = timestamps[mid];
        if (ts.start <= time) {
          result = ts.position;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return result;
    },
    [timestamps]
  );

  // The RAF loop that does the actual highlight via direct DOM access
  const karaokeTick = useCallback(() => {
    const spans = getWordSpans();
    if (!spans) return;

    // Interpolate the audio time for smoothness on mobile
    const time = audioTimeRef.current;
    const newPos = findPositionAtTime(time);

    if (newPos !== highlightedPosRef.current) {
      // Remove highlight from old word
      if (highlightedPosRef.current >= 0 && highlightedPosRef.current < spans.length) {
        spans[highlightedPosRef.current].classList.remove("word-audio-current");
      }
      // Add highlight to new word
      if (newPos >= 0 && newPos < spans.length) {
        spans[newPos].classList.add("word-audio-current");

        // Auto-scroll: only if word is near viewport edge
        const target = spans[newPos];
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        if (rect.top < 80 || rect.bottom > viewportHeight - 100) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      highlightedPosRef.current = newPos;
    }

    karaokeRafRef.current = requestAnimationFrame(karaokeTick);
  }, [getWordSpans, findPositionAtTime]);

  // Start/stop the karaoke RAF loop based on play state
  useEffect(() => {
    if (isAudioPlaying) {
      karaokeRafRef.current = requestAnimationFrame(karaokeTick);
    } else {
      if (karaokeRafRef.current) {
        cancelAnimationFrame(karaokeRafRef.current);
        karaokeRafRef.current = null;
      }
      // Clear highlight when audio stops
      const spans = getWordSpans();
      if (spans && highlightedPosRef.current >= 0 && highlightedPosRef.current < spans.length) {
        spans[highlightedPosRef.current].classList.remove("word-audio-current");
      }
      highlightedPosRef.current = -1;
    }
    return () => {
      if (karaokeRafRef.current) {
        cancelAnimationFrame(karaokeRafRef.current);
        karaokeRafRef.current = null;
      }
    };
  }, [isAudioPlaying, karaokeTick, getWordSpans]);

  // Split body text into paragraphs, then tokenize each paragraph
  const paragraphs = bodyText.split("\n").filter((p) => p.trim());

  const handleActivate = useCallback((word: WordData) => {
    setActivePosition(word.position);
    setActiveExpressionId(word.expression_id);
    setSeenPositions((prev) => {
      const next = new Set(prev);
      next.add(word.position);
      if (word.expression_id) {
        const positions = expressionPositions.get(word.expression_id);
        if (positions) {
          for (const pos of positions) next.add(pos);
        }
      }
      return next;
    });
  }, [expressionPositions]);

  const handleDismiss = useCallback(() => {
    setActivePosition(null);
    setActiveExpressionId(null);
  }, []);

  // Click outside the story area dismisses the active tooltip
  useEffect(() => {
    if (activePosition === null) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const container = containerRef.current;
      if (container && container.contains(target)) return;

      const tooltip = (target as HTMLElement)?.closest?.(".word-tooltip-pinned");
      if (tooltip) return;

      handleDismiss();
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [activePosition, handleDismiss]);

  // StoryAudioPlayer calls this ~60x/sec with the current audio time.
  // We store it in a ref (no state update) so React never re-renders.
  const handleAudioTimeUpdate = useCallback((time: number) => {
    audioTimeRef.current = time;
  }, []);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsAudioPlaying(playing);
  }, []);

  let wordPosition = 0;
  const audioDuration = timestamps.length > 0
    ? timestamps[timestamps.length - 1].end
    : 0;

  return (
    <div ref={containerRef}>
      <StoryAudioPlayer
        audioUrl={audioUrl}
        duration={audioDuration}
        onTimeUpdate={handleAudioTimeUpdate}
        onPlayStateChange={handlePlayStateChange}
      />

      <div className="space-y-4">
        {paragraphs.map((paragraph, paraIdx) => {
          const tokens = paragraph.split(/\s+/).filter((t) => t);

          return (
            <p key={paraIdx} className="text-gray-800 leading-relaxed text-base">
              {tokens.map((token, tokenIdx) => {
                const currentPos = wordPosition++;
                const word = words[currentPos];

                if (!word) {
                  return <span key={tokenIdx}>{token} </span>;
                }

                // Normalize curly quotes for matching
                const tokenNorm = token
                  .replace(/\u2018/g, "'")
                  .replace(/\u2019/g, "'")
                  .replace(/\u201C/g, '"')
                  .replace(/\u201D/g, '"');
                const wordNorm = word.text
                  .replace(/\u2018/g, "'")
                  .replace(/\u2019/g, "'")
                  .replace(/\u201C/g, '"')
                  .replace(/\u201D/g, '"');

                if (tokenNorm !== wordNorm) {
                  return <span key={tokenIdx}>{token} </span>;
                }

                // Find expression for this word (if any)
                const expression = word.expression_id
                  ? expressionMap.get(word.expression_id) || null
                  : null;

                const isHighlighted = seenPositions.has(word.position);
                const isActive = activePosition === word.position;
                const isExpressionActive =
                  !!word.expression_id &&
                  word.expression_id === activeExpressionId &&
                  activePosition !== word.position;

                return (
                  <span key={tokenIdx}>
                    <WordTooltip
                      word={word}
                      expression={expression}
                      isHighlighted={isHighlighted}
                      onActivate={handleActivate}
                      onDismiss={handleDismiss}
                      isActive={isActive}
                      isExpressionActive={isExpressionActive}
                      hintClass={!hasInteracted && currentPos < 4 ? "word-hint" : undefined}
                      onFirstInteraction={() => setHasInteracted(true)}
                    />
                    {tokenIdx < tokens.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
