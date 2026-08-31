import type { CourseLevel, ExamTask2Type } from "@/types";

export type SessionType = "story" | "writing" | "exam" | "video_summary";

export function isSessionType(
  value: string | null | undefined
): value is SessionType {
  return (
    value === "story" ||
    value === "writing" ||
    value === "exam" ||
    value === "video_summary"
  );
}

export function sessionTypeLabel(type: SessionType): string {
  if (type === "writing") return "Escritura";
  if (type === "exam") return "Examen";
  if (type === "video_summary") return "Traducción";
  return "Historia";
}

export function defaultWritingMinutes(level: CourseLevel): 10 | 20 {
  return level === "pre-intermediate" ? 10 : 20;
}

export function defaultExamTask2Type(level: CourseLevel): ExamTask2Type {
  return level === "intermediate"
    ? "paragraph_restructuring"
    : "sentence_correction";
}

/** Public lesson URL. Slug comes from the `stories` table, not a lessons table. */
export function lessonPath(slug: string, sessionToken?: string): string {
  const base = `/lesson/${encodeURIComponent(slug)}`;
  if (!sessionToken) return base;
  return `${base}?session=${encodeURIComponent(sessionToken)}`;
}

export function studentSessionPath(input: {
  sessionType: SessionType;
  token: string;
  storySlug?: string | null;
}): string {
  if (input.sessionType === "writing") {
    return `/writing?session=${encodeURIComponent(input.token)}`;
  }
  if (input.sessionType === "exam") {
    return `/exam?session=${encodeURIComponent(input.token)}`;
  }
  if (!input.storySlug) {
    return `/writing?session=${encodeURIComponent(input.token)}`;
  }
  return lessonPath(input.storySlug, input.token);
}
