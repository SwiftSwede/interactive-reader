"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { formatLessonMeta } from "@/lib/lesson-header";
import StudentPreviewBanner from "@/components/shell/StudentPreviewBanner";
import {
  enterLessonStudentPreview,
  exitLessonStudentPreview,
} from "@/app/teacher/preview/actions";
import type { LessonViewToggle } from "@/lib/student-preview";
import type { CourseLevel } from "@/types";

const HEADER_VAR = "--lesson-sticky-header-height";
const LINK_CLASS =
  "inline-flex h-11 shrink-0 cursor-pointer items-center text-label-md text-text-secondary hover:text-text-accent";

export default function LessonHeader({
  typeLabel,
  title,
  level,
  wordCount,
  isTeacher = false,
  previewLevel = null,
  viewToggle = null,
}: {
  typeLabel: string;
  title: string;
  level: string;
  wordCount?: number | null;
  isTeacher?: boolean;
  previewLevel?: CourseLevel | null;
  viewToggle?: LessonViewToggle | null;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const meta = formatLessonMeta(level, wordCount);
  const inicioHref = viewToggle || isTeacher ? "/teacher" : "/dashboard";

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
            {viewToggle ? (
              <form
                action={
                  previewLevel
                    ? exitLessonStudentPreview
                    : enterLessonStudentPreview
                }
              >
                <input type="hidden" name="level" value={viewToggle.level} />
                <input type="hidden" name="next" value={viewToggle.next} />
                <button type="submit" className={LINK_CLASS}>
                  {previewLevel ? "Vista de profe" : "Vista de estudiante"}
                </button>
              </form>
            ) : null}
            {!isTeacher ? (
              <Link href="/progress" className={LINK_CLASS}>
                Progreso
              </Link>
            ) : null}
            <Link href={inicioHref} className={LINK_CLASS}>
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
