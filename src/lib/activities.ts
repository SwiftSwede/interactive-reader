import type { CourseLevel, ExamTask2Type } from "@/types";

export type SessionType =
  | "story"
  | "writing"
  | "exam"
  | "video_summary"
  | "presentation"
  | "conversation"
  | "pronunciation";

export function isSessionType(
  value: string | null | undefined
): value is SessionType {
  return (
    value === "story" ||
    value === "writing" ||
    value === "exam" ||
    value === "video_summary" ||
    value === "presentation" ||
    value === "conversation" ||
    value === "pronunciation"
  );
}

export function isLiveOnlySessionType(type: SessionType): boolean {
  return type === "conversation" || type === "pronunciation";
}

export function sessionTypeLabel(type: SessionType): string {
  if (type === "writing") return "Escritura";
  if (type === "exam") return "Examen";
  if (type === "video_summary") return "Traducción";
  if (type === "presentation") return "Presentación";
  if (type === "conversation") return "Conversación";
  if (type === "pronunciation") return "Pronunciación";
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
}): string | null {
  if (isLiveOnlySessionType(input.sessionType)) return null;
  if (input.sessionType === "writing") {
    return `/writing?session=${encodeURIComponent(input.token)}`;
  }
  if (input.sessionType === "exam") {
    return `/exam?session=${encodeURIComponent(input.token)}`;
  }
  if (input.sessionType === "presentation") {
    return `/presentation?session=${encodeURIComponent(input.token)}`;
  }
  if (!input.storySlug) return null;
  return lessonPath(input.storySlug, input.token);
}
