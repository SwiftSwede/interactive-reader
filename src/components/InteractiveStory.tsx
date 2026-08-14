"use client";

import { useState, useCallback } from "react";
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

  // Build expression lookup
  const expressionMap = new Map<string, ExpressionData>();
  for (const expr of expressions) {
    expressionMap.set(expr.id, expr);
  }

  // Split body text into paragraphs, then tokenize each paragraph
  const paragraphs = bodyText.split("\n").filter((p) => p.trim());

  const handleActivate = useCallback((word: WordData) => {
    setActivePosition(word.position);
    setSeenPositions((prev) => new Set(prev).add(word.position));
  }, []);

  const handleDismiss = useCallback(() => {
    setActivePosition(null);
  }, []);

  // For each paragraph, we need to know which tokens belong to it
  // and map them to global word positions
  let wordPosition = 0;

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, paraIdx) => {
        const tokens = paragraph.split(/\s+/).filter((t) => t);

        return (
          <p key={paraIdx} className="text-gray-800 leading-relaxed text-base">
            {tokens.map((token, tokenIdx) => {
              const currentPos = wordPosition++;
              const word = words[currentPos];

              if (!word) {
                // Fallback: just render the token as plain text
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
                // Position mismatch - render as plain text
                return <span key={tokenIdx}>{token} </span>;
              }

              // Find expression for this word (if any)
              const expression = word.expression_id
                ? expressionMap.get(word.expression_id) || null
                : null;

              const isHighlighted = seenPositions.has(word.position);
              const isActive = activePosition === word.position;

              return (
                <span key={tokenIdx}>
                  <WordTooltip
                    word={word}
                    expression={expression}
                    isHighlighted={isHighlighted}
                    onActivate={handleActivate}
                    onDismiss={handleDismiss}
                    isActive={isActive}
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