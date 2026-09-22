import type { CourseLevel, UserRole } from "@/types";

export const STUDENT_PREVIEW_COOKIE = "pk_student_preview";

export function parseStudentPreviewLevel(
  value: string | undefined | null
): CourseLevel | null {
  if (value === "intermediate" || value === "pre-intermediate") {
    return value;
  }
  return null;
}

export function studentPreviewLevelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export function isTeacherView(
  role: UserRole | null | undefined,
  previewLevel: CourseLevel | null
): boolean {
  return role === "teacher" && previewLevel == null;
}

export type LessonViewToggle = {
  level: CourseLevel;
  next: string;
};

export function parseLessonPreviewNext(
  next: string | undefined | null
): string | null {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("://")
  ) {
    return null;
  }
  const path = next.split("?")[0] ?? "";
  if (
    path.startsWith("/lesson/") ||
    path === "/writing" ||
    path === "/exam" ||
    path === "/conversation" ||
    path === "/presentation"
  ) {
    return next;
  }
  return null;
}

export function lessonSessionNext(
  pathname: string,
  sessionToken: string | undefined | null
): string | null {
  if (!sessionToken) return null;
  return parseLessonPreviewNext(
    `${pathname}?session=${encodeURIComponent(sessionToken)}`
  );
}

export function lessonViewToggle(input: {
  role: UserRole | null | undefined;
  courseLevel: CourseLevel | null | undefined;
  nextPath: string | null | undefined;
}): LessonViewToggle | null {
  if (input.role !== "teacher" || !input.courseLevel) return null;
  const next = parseLessonPreviewNext(input.nextPath);
  if (!next) return null;
  return { level: input.courseLevel, next };
}

export function studentPreviewCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
