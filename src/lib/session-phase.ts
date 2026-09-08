import type { CourseSession } from "@/types";

export type SessionPhase = "before" | "live" | "after";

export const JOIN_LEAD_MINUTES = 10;

export function getSessionPhase(
  session: Pick<CourseSession, "sessionStartTime" | "sessionEndTime">,
  now = new Date()
): SessionPhase {
  const t = now.getTime();
  if (t < new Date(session.sessionStartTime).getTime()) return "before";
  if (t > new Date(session.sessionEndTime).getTime()) return "after";
  return "live";
}

export function isWithinSessionWindow(
  session: Pick<CourseSession, "sessionStartTime" | "sessionEndTime">,
  now = new Date()
): boolean {
  return getSessionPhase(session, now) === "live";
}

export function getSessionJoinTime(
  session: Pick<CourseSession, "sessionStartTime">
): Date {
  return new Date(
    new Date(session.sessionStartTime).getTime() -
      JOIN_LEAD_MINUTES * 60 * 1000
  );
}

export type SessionLifecycle = "placeholder" | "upcoming" | "live" | "after";

export type ClassDayPhase = "countdown" | "join" | "done-pending";

export function getSessionLifecycle(
  session: Pick<CourseSession, "sessionStartTime" | "sessionEndTime">,
  hasContent: boolean,
  now = new Date()
): SessionLifecycle {
  if (!hasContent) return "placeholder";
  const t = now.getTime();
  const joinAt = getSessionJoinTime(session).getTime();
  const end = new Date(session.sessionEndTime).getTime();
  if (t < joinAt) return "upcoming";
  if (t <= end) return "live";
  return "after";
}

export function sessionRecordingUrl(
  session: Pick<CourseSession, "sessionStartTime" | "sessionEndTime"> & {
    recordingYoutubeUrl?: string | null;
  },
  now = new Date()
): string | null {
  if (!session.recordingYoutubeUrl) return null;
  if (getSessionPhase(session, now) !== "after") return null;
  return session.recordingYoutubeUrl;
}

export function getClassDayPhase(
  session: Pick<CourseSession, "sessionStartTime" | "sessionEndTime">,
  now = new Date()
): ClassDayPhase {
  const t = now.getTime();
  const joinAt = getSessionJoinTime(session).getTime();
  const end = new Date(session.sessionEndTime).getTime();
  if (t < joinAt) return "countdown";
  if (t <= end) return "join";
  return "done-pending";
}

const COUNTDOWN_LEAD_MS = 18 * 60 * 60 * 1000;
const DONE_PENDING_MS = 12 * 60 * 60 * 1000;

function localCalendarDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesLocalOrUtcDate(sessionDate: string, now: Date): boolean {
  return (
    sessionDate === localCalendarDate(now) ||
    sessionDate === now.toISOString().slice(0, 10)
  );
}

export function isClassDayCardSession(
  session: Pick<
    CourseSession,
    "sessionDate" | "sessionStartTime" | "sessionEndTime"
  >,
  now = new Date()
): boolean {
  const t = now.getTime();
  const start = new Date(session.sessionStartTime).getTime();
  const joinAt = getSessionJoinTime(session).getTime();
  const end = new Date(session.sessionEndTime).getTime();

  if (t >= joinAt && t <= end) return true;
  if (t < joinAt && start - t >= 0 && start - t <= COUNTDOWN_LEAD_MS) {
    return true;
  }
  if (t > end && t - end <= DONE_PENDING_MS) return true;
  return matchesLocalOrUtcDate(session.sessionDate, now) && t <= end + DONE_PENDING_MS;
}

export function pickClassDaySession<
  T extends Pick<
    CourseSession,
    "sessionDate" | "sessionStartTime" | "sessionEndTime"
  >,
>(sessions: T[], now = new Date()): T | null {
  const candidates = sessions.filter((session) =>
    isClassDayCardSession(session, now)
  );
  if (candidates.length === 0) return null;
  const t = now.getTime();
  const joinLive = candidates.find((session) => {
    const joinAt = getSessionJoinTime(session).getTime();
    const end = new Date(session.sessionEndTime).getTime();
    return t >= joinAt && t <= end;
  });
  if (joinLive) return joinLive;
  return [...candidates].sort((a, b) => {
    const da = Math.abs(new Date(a.sessionStartTime).getTime() - t);
    const db = Math.abs(new Date(b.sessionStartTime).getTime() - t);
    return da - db;
  })[0];
}
