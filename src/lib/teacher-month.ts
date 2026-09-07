export function currentYearMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function yearMonthFromIso(iso: string): string {
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return currentYearMonth(date);
}

/** First class of a month-group can land on the last days of the previous month. */
const MONTH_START_SPILLOVER_DAYS = 3;

function addMonthsToYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInUtcMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return 0;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function sessionDay(sessionDate: string): number {
  return Number(sessionDate.slice(8, 10));
}

function isMonthStartSpilloverDate(
  sessionDate: string,
  yearMonth: string
): boolean {
  const previous = addMonthsToYearMonth(yearMonth, -1);
  if (!sessionDate.startsWith(previous)) return false;
  const lastDay = daysInUtcMonth(previous);
  const day = sessionDay(sessionDate);
  return day >= lastDay - MONTH_START_SPILLOVER_DAYS + 1;
}

function previousMonthIsOnlyStartSpillover(
  sessions: Array<{ sessionDate: string }>,
  yearMonth: string
): boolean {
  const previous = addMonthsToYearMonth(yearMonth, -1);
  const previousSessions = sessions.filter((session) =>
    session.sessionDate.startsWith(previous)
  );
  if (previousSessions.length === 0) return false;
  return previousSessions.every((session) =>
    isMonthStartSpilloverDate(session.sessionDate, yearMonth)
  );
}

export function isCourseInMonth(
  sessions: Array<{ sessionDate: string }>,
  createdAt: string,
  yearMonth: string
): boolean {
  if (sessions.length === 0) {
    return yearMonthFromIso(createdAt) === yearMonth;
  }
  if (sessions.some((session) => session.sessionDate.startsWith(yearMonth))) {
    return true;
  }
  return previousMonthIsOnlyStartSpillover(sessions, yearMonth);
}

export function sessionsInMonth<T extends { sessionDate: string }>(
  sessions: T[],
  yearMonth: string
): T[] {
  const includeSpillover = previousMonthIsOnlyStartSpillover(
    sessions,
    yearMonth
  );
  return sessions.filter(
    (session) =>
      session.sessionDate.startsWith(yearMonth) ||
      (includeSpillover &&
        isMonthStartSpilloverDate(session.sessionDate, yearMonth))
  );
}

export function courseMonthKey(
  sessions: Array<{ sessionDate: string }>,
  createdAt: string
): string {
  if (sessions.length === 0) return yearMonthFromIso(createdAt);
  const latest = [...sessions].sort((a, b) =>
    b.sessionDate.localeCompare(a.sessionDate)
  )[0];
  const latestMonth = latest
    ? latest.sessionDate.slice(0, 7)
    : yearMonthFromIso(createdAt);
  const following = addMonthsToYearMonth(latestMonth, 1);
  if (
    previousMonthIsOnlyStartSpillover(sessions, following) &&
    !sessions.some((session) => session.sessionDate.startsWith(following))
  ) {
    return following;
  }
  return latestMonth;
}

export function monthLabelFromYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = date.toLocaleDateString("es", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function weekdayFromDate(date: Date, timeZone?: string): number {
  if (!timeZone) return date.getDay();
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? date.getDay();
}

export function formatDayTimePattern(
  sessionStarts: string[],
  timeZone?: string
): string {
  if (sessionStarts.length === 0) return "";

  const days = new Set<number>();
  const times = new Set<string>();
  for (const iso of sessionStarts) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    days.add(weekdayFromDate(date, timeZone));
    const time = date.toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
    times.add(time.replace(".", ":"));
  }

  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => days.has(day))
    .map((day) => WEEKDAY_SHORT[day]);
  const dayPart =
    ordered.length === 0
      ? ""
      : ordered.length === 1
        ? ordered[0]
        : ordered.length === 2
          ? `${ordered[0]} y ${ordered[1]}`
          : ordered.join(", ");
  const uniqueTimes = [...times];
  const timePart = uniqueTimes.length === 1 ? uniqueTimes[0] : null;
  if (dayPart && timePart) return `${dayPart} · ${timePart}`;
  return dayPart || timePart || "";
}
