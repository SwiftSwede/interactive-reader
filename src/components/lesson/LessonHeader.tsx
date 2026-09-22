"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { formatLessonMeta } from "@/lib/lesson-header";
import StudentPreviewBanner from "@/components/shell/StudentPreviewBanner";
import type { CourseLevel } from "@/types";

const HEADER_VAR = "--lesson-sticky-header-height";

export default function LessonHeader({
  typeLabel,
  title,
  level,
  wordCount,
  isTeacher = false,
  previewLevel = null,
}: {
  typeLabel: string;
  title: string;
  level: string;
  wordCount?: number | null;
  isTeacher?: boolean;
  previewLevel?: CourseLevel | null;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const meta = formatLessonMeta(level, wordCount);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const sticky =
      node.closest<HTMLElement>("[data-lesson-sticky]") ?? node;
    const root = document.documentElement;

    const apply = () => {
      const height = Math.round(sticky.getBoundingClientRect().height);
      root.style.setProperty(HEADER_VAR, `${height}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(sticky);
    return () => {
      observer.disconnect();
      root.style.removeProperty(HEADER_VAR);
    };
  }, []);

  return (
    <header ref={rootRef} className="pb-2">
      {previewLevel ? <StudentPreviewBanner level={previewLevel} /> : null}
      <div className="px-4 pt-2">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-label-sm text-text-muted">
              {typeLabel}
            </p>
            {!isTeacher ? (
              <Link
                href="/progress"
                className="inline-flex h-11 shrink-0 items-center text-label-md text-text-secondary hover:text-text-accent"
              >
                Progreso
              </Link>
            ) : null}
            <Link
              href={isTeacher ? "/teacher" : "/dashboard"}
              className="inline-flex h-11 shrink-0 items-center text-label-md text-text-secondary hover:text-text-accent"
            >
              Inicio
            </Link>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h1 className="min-w-0 flex-1 truncate font-heading text-headline-md text-text-primary">
              {title}
            </h1>
            {meta ? (
              <p className="shrink-0 text-label-sm text-text-muted">{meta}</p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
