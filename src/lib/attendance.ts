export function isAutoMarked(
  firstOpenedAt: string | null | undefined,
  sessionStart: string,
  sessionEnd: string
): boolean {
  if (!firstOpenedAt) return false;
  const opened = new Date(firstOpenedAt).getTime();
  if (Number.isNaN(opened)) return false;
  return (
    opened >= new Date(sessionStart).getTime() &&
    opened <= new Date(sessionEnd).getTime()
  );
}
