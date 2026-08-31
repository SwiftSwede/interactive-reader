/**
 * Browser drafts for comprehension and personal answers.
 * Logged-in saves still go to Supabase. This covers the same device when
 * the student is signed out, and keeps text across a refresh.
 */

const PREFIX = "ir-draft:";

export function draftKey(kind: "comprehension" | "personal", questionId: string): string {
  return `${PREFIX}${kind}:${questionId}`;
}

export function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode / quota
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
