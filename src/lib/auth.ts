const DEFAULT_NEXT = "/dashboard";

export const AUTH_NEXT_COOKIE = "pk-auth-next";

export type EmailOtpKind =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

export function isEmailOtpKind(value: string | null | undefined): value is EmailOtpKind {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return DEFAULT_NEXT;
  }
  return next;
}

/**
 * Accepts a relative path or a same-origin URL (email templates sometimes
 * pass the full RedirectTo). Nested next= on /auth/confirm or /auth/callback
 * is unwrapped.
 */
export function resolveAuthNext(
  raw: string | null | undefined,
  origin?: string
): string {
  if (!raw) return DEFAULT_NEXT;

  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("://")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (!origin || url.origin !== origin) return DEFAULT_NEXT;

    if (url.pathname === "/auth/confirm" || url.pathname === "/auth/callback") {
      const inner = url.searchParams.get("next");
      if (inner) return resolveAuthNext(inner, origin ?? url.origin);
    }

    const path = `${url.pathname}${url.search}`;
    if (path.startsWith("/") && !path.startsWith("//")) return path;
    return DEFAULT_NEXT;
  } catch {
    return DEFAULT_NEXT;
  }
}

export function authConfirmRedirectTo(origin: string, nextPath: string): string {
  const next = safeNextPath(nextPath);
  return `${origin.replace(/\/$/, "")}/auth/confirm?next=${encodeURIComponent(next)}`;
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
