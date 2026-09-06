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
