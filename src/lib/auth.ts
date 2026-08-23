const DEFAULT_NEXT = "/dashboard";

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return DEFAULT_NEXT;
  }
  return next;
}

export function getTeacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getTeacherEmails().includes(email.trim().toLowerCase());
}
