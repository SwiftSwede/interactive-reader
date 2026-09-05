import type { CourseSession } from "@/types";

export type SessionPhase = "before" | "live" | "after";

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
