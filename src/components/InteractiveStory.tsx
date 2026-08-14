"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import WordTooltip, {
  type WordData,
  type ExpressionData,
} from "./WordTooltip";

// ── Types ──────────────────────────────────────────────────

type InteractiveStoryProps = {
  bodyText: string;
  words: WordData[];
  expressions: ExpressionData[];
};

// ── Component ──────────────────────────────────────────────

export default function InteractiveStory({
  bodyText,
  words,
  expressions,
}: InteractiveStoryProps) {
  const [seenPositions, setSeenPositions] = useState<Set<number>>(new Set());
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [activeExpressionId, setActiveExpressionId] = useState<string | null>(
    null
  );
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

  // Split body text into paragraphs, then tokenize each paragraph
  const paragraphs = bodyText.split("\n").filter((p) => p.trim());

  const handleActivate = useCallback((word: WordData) => {
    setActivePosition(word.position);
    setActiveExpressionId(word.expression_id);
    setSeenPositions((prev) => {
      const next = new Set(prev);
      next.add(word.position);
      // Also mark all words in the same expression as seen
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

  let wordPosition = 0;

  return (
    <div className="space-y-4" ref={containerRef}>
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
              // This word is part of the active expression group (but not the clicked word itself)
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
                  />
                  {tokenIdx < tokens.length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}