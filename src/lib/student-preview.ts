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
