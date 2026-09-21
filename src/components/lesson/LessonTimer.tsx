"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HEADER_VAR = "--lesson-sticky-header-height";

function headerOffsetPx(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(HEADER_VAR)
    .trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
}

function toneClass(tone: LessonTimerTone): string {
  if (tone === "warning") return "text-warning";
  if (tone === "error") return "text-error";
  if (tone === "accent") return "text-accent";
  return "text-text-primary";
}

export type LessonTimerTone = "default" | "warning" | "error" | "accent";

export default function LessonTimer({
  value,
  tone = "default",
  sticky = true,
}: {
  value: string;
  tone?: LessonTimerTone;
  sticky?: boolean;
}) {
  const inlineRef = useRef<HTMLParagraphElement>(null);
  const [docked, setDocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const node = inlineRef.current;
    if (!node || !sticky) {
      setDocked(false);
      return;
    }

    let observer: IntersectionObserver | null = null;

    const watch = () => {
      observer?.disconnect();
      const offset = headerOffsetPx();
      observer = new IntersectionObserver(
        ([entry]) => {
          setDocked(!entry.isIntersecting);
        },
        { threshold: 0, rootMargin: `-${offset}px 0px 0px 0px` }
      );
      observer.observe(node);
    };

    watch();
    const retry = window.setTimeout(watch, 50);
    window.addEventListener("resize", watch);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("resize", watch);
      observer?.disconnect();
    };
  }, [sticky]);

  const color = toneClass(tone);
  const showChip = sticky && docked && mounted;

  return (
    <>
      <p
        ref={inlineRef}
        role="timer"
        className={`mb-3 text-right font-heading text-headline-md tabular-nums ${color}`}
        aria-hidden={showChip || undefined}
      >
        {value}
      </p>
      {showChip
        ? createPortal(
            <div className="sticky-lesson-timer" role="presentation">
              <div className="sticky-lesson-timer-inner">
                <p
                  role="timer"
                  className={`sticky-lesson-timer-chip ${color}`}
                >
                  {value}
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
