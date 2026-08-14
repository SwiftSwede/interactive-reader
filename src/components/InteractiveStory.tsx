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
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Binary search for current word based on audio time
  const currentAudioPosition = useMemo(() => {
    if (!isAudioPlaying || audioCurrentTime === 0) return -1;

    // Binary search timestamps for the word being spoken
    let lo = 0;
    let hi = timestamps.length - 1;
    let result = -1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const ts = timestamps[mid];

      if (audioCurrentTime >= ts.start && audioCurrentTime < ts.end) {
        result = ts.position;
        break;
      } else if (audioCurrentTime < ts.start) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    // If we didn't find an exact match, find the last word that started before current time
    if (result === -1 && timestamps.length > 0) {
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i].start <= audioCurrentTime) {
          // Only return if we're within a reasonable gap (2 seconds)
          if (audioCurrentTime - timestamps[i].end < 2) {
            result = timestamps[i].position;
          }
          break;
        }
      }
    }

    return result;
  }, [audioCurrentTime, isAudioPlaying, timestamps]);

  // Auto-scroll current word into view during playback
  useEffect(() => {
    if (currentAudioPosition < 0 || !isAudioPlaying) return;

    const spans = containerRef.current?.querySelectorAll(".word-span");
    if (!spans || currentAudioPosition >= spans.length) return;

    const target = spans[currentAudioPosition];
    if (target) {
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Only scroll if the word is near the edge of the viewport
      if (rect.top < 80 || rect.bottom > viewportHeight - 100) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentAudioPosition, isAudioPlaying]);

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

  const handleTimeUpdate = useCallback((time: number) => {
    setAudioCurrentTime(time);
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
        onTimeUpdate={handleTimeUpdate}
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
                const isAudioCurrent = currentAudioPosition === word.position;

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
                      isAudioCurrent={isAudioCurrent}
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