import type { CourseLevel } from "@/types";

export type SessionType = "story" | "writing";

export function isSessionType(value: string | null | undefined): value is SessionType {
  return value === "story" || value === "writing";
}

export function sessionTypeLabel(type: SessionType): string {
  return type === "writing" ? "Escritura" : "Historia";
}

export function defaultWritingMinutes(level: CourseLevel): 10 | 20 {
  return level === "pre-intermediate" ? 10 : 20;
}

export function studentSessionPath(input: {
  sessionType: SessionType;
  token: string;
  storySlug?: string | null;
}): string {
  if (input.sessionType === "writing") {
    return `/writing?session=${encodeURIComponent(input.token)}`;
  }
  if (!input.storySlug) {
    return `/writing?session=${encodeURIComponent(input.token)}`;
  }
  return `/story/${input.storySlug}?session=${encodeURIComponent(input.token)}`;
}
