"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SCROLL_MS = 200;
const EDGE = 2;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeSmoothOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function scrollBySmooth(node: HTMLElement, delta: number) {
  const max = node.scrollWidth - node.clientWidth;
  const target = Math.max(0, Math.min(max, node.scrollLeft + delta));
  if (prefersReducedMotion() || Math.abs(target - node.scrollLeft) < EDGE) {
    node.scrollLeft = target;
    return;
  }
  const start = node.scrollLeft;
  const distance = target - start;
  const from = performance.now();
  function frame(now: number) {
    const t = Math.min(1, (now - from) / SCROLL_MS);
    node.scrollLeft = start + distance * easeSmoothOut(t);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export default function CharacterBand({
  characters,
  selected,
  onSelect,
  className = "",
}: {
  characters: string[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);

  const updateOverflow = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const overflow = max > EDGE;
    setCanStart(overflow && node.scrollLeft > EDGE);
    setCanEnd(overflow && node.scrollLeft < max - EDGE);
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(node);
    node.addEventListener("scroll", updateOverflow, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", updateOverflow);
    };
  }, [characters, updateOverflow]);

  if (characters.length === 0) return null;

  const overflow = canStart || canEnd;
  const fadeClass = canStart && canEnd
    ? " character-band-fade-both"
    : canEnd
      ? " character-band-fade-end"
      : canStart
        ? " character-band-fade-start"
        : "";

  function nudge(direction: 1 | -1) {
    const node = scrollerRef.current;
    if (!node) return;
    scrollBySmooth(node, direction * Math.max(120, node.clientWidth * 0.7));
  }

  return (
    <div
      data-character-band
      className={`character-band${overflow ? " character-band-overflow" : ""} ${className}`.trim()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {canStart ? (
        <button
          type="button"
          className="character-band-arrow character-band-arrow-start"
          aria-label="Personajes anteriores"
          onClick={() => nudge(-1)}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className={`character-band-scroller${fadeClass}`}
        role="listbox"
        aria-label="Personajes"
        aria-orientation="horizontal"
      >
        <div className="character-band-row">
          {characters.map((name) => {
            const on = selected === name;
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={on}
                className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-label-md ${
                  on
                    ? "border-accent bg-accent text-white"
                    : "border-paper-line bg-surface text-text-primary hover:border-accent"
                }`}
                onClick={() => onSelect(on ? null : name)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
      {canEnd ? (
        <button
          type="button"
          className="character-band-arrow character-band-arrow-end"
          aria-label="Más personajes"
          onClick={() => nudge(1)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
