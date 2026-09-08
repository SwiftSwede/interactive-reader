import { teachingEndMs } from "./session-phase";

export function isAutoMarked(
  firstOpenedAt: string | null | undefined,
  sessionStart: string,
  sessionEnd: string,
  classEndedAt?: string | null
): boolean {
  if (!firstOpenedAt) return false;
  const opened = new Date(firstOpenedAt).getTime();
  if (Number.isNaN(opened)) return false;
  const end = teachingEndMs({
    sessionStartTime: sessionStart,
    sessionEndTime: sessionEnd,
    classEndedAt,
  });
  return opened >= new Date(sessionStart).getTime() && opened <= end;
}
