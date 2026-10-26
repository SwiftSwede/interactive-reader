export const TEACHER_BUTTON_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-card bg-accent px-5 py-2 text-label-md font-semibold text-white hover:bg-accent-hover active:bg-accent-hover";

export const TEACHER_BUTTON_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-card border border-paper-line bg-surface px-5 py-2 text-label-md font-semibold text-text-primary hover:bg-surface-hover active:bg-surface-hover";

export const TEACHER_ICON_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover";

export function teacherClassHref(courseId: string, sessionId: string): string {
  return `/teacher/classes/${courseId}?clase=${sessionId}`;
}
