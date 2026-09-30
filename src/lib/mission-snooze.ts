// "más tarde" hides the Inicio card until the next calendar day on the
// student's phone. The phone computes that instant; the server bounds it.

const MAX_SNOOZE_MS = 36 * 60 * 60 * 1000;

/** Next midnight on the device clock, as an instant. */
export function nextLocalMidnight(now = new Date()): Date {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

/** Refuses a past instant or one more than 36 hours out. */
export function isValidSnoozeUntil(untilIso: string, now = new Date()): boolean {
  const until = new Date(untilIso).getTime();
  if (Number.isNaN(until)) return false;
  const delta = until - now.getTime();
  return delta > 0 && delta <= MAX_SNOOZE_MS;
}

export function isMissionSnoozed(
  dismissedUntil: string | null,
  now = new Date(),
): boolean {
  if (!dismissedUntil) return false;
  const until = new Date(dismissedUntil).getTime();
  return !Number.isNaN(until) && until > now.getTime();
}
