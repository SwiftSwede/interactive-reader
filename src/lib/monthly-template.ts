import type { SessionType } from "@/lib/activities";
import {
  courseMonthKey,
  isMonthStartSpilloverDate,
  sessionDateFitsGeneratedMonth,
} from "@/lib/teacher-month";
import type { CourseLevel } from "@/types";

export const MONTHLY_TEMPLATE: readonly SessionType[] = [
  "story",
  "pronunciation",
  "flex",
  "conversation",
  "dialogue",
  "song",
  "writing",
  "exam",
] as const;

export const TEMPLATE_LENGTH = MONTHLY_TEMPLATE.length;

export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_CODES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export function templateForLevel(_level: CourseLevel): readonly SessionType[] {
  return MONTHLY_TEMPLATE;
}

export function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return 0;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Sunday = 0. Calendar-month only, no spillover into the previous month. */
export function weekdayOnMonthDay(yearMonth: string, day: number): number {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return 0;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export type ClassOccurrence = {
  sessionDate: string;
  day: number;
  weekday: number;
};

export function occurrencesInMonth(
  yearMonth: string,
  weekdays: number[]
): ClassOccurrence[] {
  const chosen = new Set(weekdays.filter((day) => day >= 0 && day <= 6));
  if (chosen.size === 0) return [];
  const last = daysInMonth(yearMonth);
  const rows: ClassOccurrence[] = [];
  for (let day = 1; day <= last; day += 1) {
    const weekday = weekdayOnMonthDay(yearMonth, day);
    if (!chosen.has(weekday)) continue;
    rows.push({
      sessionDate: `${yearMonth}-${String(day).padStart(2, "0")}`,
      day,
      weekday,
    });
  }
  return rows;
}

export function capOccurrences<T>(rows: T[], length = TEMPLATE_LENGTH): T[] {
  return rows.slice(0, length);
}

function weekdayOfSessionDate(sessionDate: string): number {
  return weekdayOnMonthDay(
    sessionDate.slice(0, 7),
    Number(sessionDate.slice(8, 10))
  );
}

function addUtcDays(sessionDate: string, days: number): string {
  const [year, month, day] = sessionDate.split("-").map(Number);
  if (!year || !month || !day) return sessionDate;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function isSelectableStart(
  sessionDate: string,
  yearMonth: string,
  weekdays: Set<number>
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return false;
  if (!weekdays.has(weekdayOfSessionDate(sessionDate))) return false;
  return (
    sessionDate.startsWith(yearMonth) ||
    isMonthStartSpilloverDate(sessionDate, yearMonth)
  );
}

export function generateMonthDates(
  yearMonth: string,
  weekdays: number[],
  length = TEMPLATE_LENGTH,
  startDate?: string | null
): ClassOccurrence[] {
  const inMonth = capOccurrences(occurrencesInMonth(yearMonth, weekdays), length);
  const chosen = new Set(weekdays.filter((day) => day >= 0 && day <= 6));
  if (!startDate || !isSelectableStart(startDate, yearMonth, chosen)) {
    return inMonth;
  }

  const rows: ClassOccurrence[] = [];
  let cursor = startDate;
  for (let step = 0; step < 70 && rows.length < length; step += 1) {
    const weekday = weekdayOfSessionDate(cursor);
    if (chosen.has(weekday)) {
      if (!sessionDateFitsGeneratedMonth(cursor, yearMonth)) break;
      const next = [
        ...rows,
        { sessionDate: cursor, day: Number(cursor.slice(8, 10)), weekday },
      ];
      const key = courseMonthKey(
        next.map((row) => ({ sessionDate: row.sessionDate })),
        `${yearMonth}-01T00:00:00.000Z`
      );
      if (key !== yearMonth) break;
      rows.push(next[next.length - 1]);
    }
    cursor = addUtcDays(cursor, 1);
  }
  return rows;
}

export type MonthCalendarDay = {
  sessionDate: string;
  day: number;
  weekday: number;
  inMonth: boolean;
};

/** Monday-first grid covering the month and any class date just after it. */
export function monthCalendarDays(
  yearMonth: string,
  throughDate?: string | null
): MonthCalendarDay[] {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return [];
  const firstWeekday = weekdayOnMonthDay(yearMonth, 1);
  const leading = (firstWeekday + 6) % 7;
  const last = daysInMonth(yearMonth);
  const monthEnd = `${yearMonth}-${String(last).padStart(2, "0")}`;
  const end = throughDate && throughDate > monthEnd ? throughDate : monthEnd;
  const origin = addUtcDays(`${yearMonth}-01`, -leading);
  const cells: MonthCalendarDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const sessionDate = addUtcDays(origin, index);
    cells.push({
      sessionDate,
      day: Number(sessionDate.slice(8, 10)),
      weekday: weekdayOfSessionDate(sessionDate),
      inMonth: sessionDate.startsWith(yearMonth),
    });
    const endOfWeek = index % 7 === 6;
    if (endOfWeek && sessionDate >= end && cells.length >= leading + last) {
      break;
    }
  }
  return cells;
}

export function canStartMonthOn(
  sessionDate: string,
  yearMonth: string,
  weekdays: number[]
): boolean {
  const chosen = new Set(weekdays.filter((day) => day >= 0 && day <= 6));
  return isSelectableStart(sessionDate, yearMonth, chosen);
}

export function defaultCourseName(
  level: CourseLevel,
  yearMonth: string
): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return level === "intermediate" ? "Intermediate" : "Pre-intermediate";
  const code = MONTH_CODES[month - 1] ?? "";
  const levelName =
    level === "intermediate" ? "Intermediate" : "Pre-intermediate";
  return `${levelName} ${year} ${code}`;
}

export function formatClassPreview(rows: ClassOccurrence[]): string {
  if (rows.length === 0) return "";
  const parts = rows.map((row) => {
    const weekday = WEEKDAY_SHORT[row.weekday]?.toLowerCase() ?? "";
    const [year, month] = row.sessionDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, (month ?? 1) - 1, row.day));
    const monthLabel = date
      .toLocaleDateString("es", { month: "short", timeZone: "UTC" })
      .replace(/\./g, "");
    return `${weekday} ${row.day} ${monthLabel}`;
  });
  return `${rows.length} ${rows.length === 1 ? "clase" : "clases"}: ${parts.join(", ")}`;
}

export function patternFromSessionStarts(starts: string[]): {
  weekdays: number[];
  hour: string;
  minute: string;
} {
  const days = new Set<number>();
  let hour = "";
  let minute = "";
  for (const iso of starts) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    days.add(date.getDay());
    if (!hour) {
      hour = String(date.getHours()).padStart(2, "0");
      const rounded = Math.round(date.getMinutes() / 15) * 15;
      const normalized = rounded === 60 ? 0 : rounded;
      minute = String(normalized).padStart(2, "0");
    }
  }
  return {
    weekdays: [1, 2, 3, 4, 5, 6, 0].filter((day) => days.has(day)),
    hour,
    minute,
  };
}

export function shouldArchiveMonthKey(
  courseMonthKey: string,
  generatedMonth: string
): boolean {
  return courseMonthKey < generatedMonth;
}
