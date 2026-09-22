"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  generateMonthAction,
  type GenerateMonthActionResult,
} from "@/app/teacher/actions";
import { courseMonthKey, currentYearMonth } from "@/lib/teacher-month";
import {
  WEEKDAY_SHORT,
  defaultCourseName,
  formatClassPreview,
  generateMonthDates,
} from "@/lib/monthly-template";
import { patternFromSessionStarts } from "@/lib/monthly-template";
import type { CourseLevel } from "@/types";

export type MonthSourceCourse = {
  id: string;
  name: string;
  level: CourseLevel;
  archived: boolean;
  createdAt: string;
  sessionStarts: string[];
  sessionDates: string[];
};

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const MINUTES = ["00", "15", "30", "45"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Step = "nivel" | "mes" | "patron" | "nombre";

function monthOptions(now = new Date()): Array<{ value: string; label: string }> {
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  const rows: Array<{ value: string; label: string }> = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(startYear, startMonth + offset, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es", {
      month: "long",
      year: "numeric",
    });
    rows.push({
      value,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
  }
  return rows;
}

function mostRecentAtLevel(
  courses: MonthSourceCourse[],
  level: CourseLevel
): MonthSourceCourse | null {
  const matches = courses.filter((course) => course.level === level);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => {
    const aStart = a.sessionStarts.reduce((max, iso) => {
      const t = new Date(iso).getTime();
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, 0);
    const bStart = b.sessionStarts.reduce((max, iso) => {
      const t = new Date(iso).getTime();
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, 0);
    return bStart - aStart || b.createdAt.localeCompare(a.createdAt);
  })[0] ?? null;
}

function levelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export default function NewMonthWizard({
  courses,
}: {
  courses: MonthSourceCourse[];
}) {
  const [state, formAction, isPending] = useActionState(
    generateMonthAction,
    null as GenerateMonthActionResult | null
  );
  const [step, setStep] = useState<Step>("nivel");
  const [level, setLevel] = useState<CourseLevel | "">("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const months = useMemo(() => monthOptions(), []);

  useEffect(() => {
    if (!level) return;
    const prior = mostRecentAtLevel(courses, level);
    if (!prior) {
      setWeekdays([]);
      setHour("");
      setMinute("");
      return;
    }
    const pattern = patternFromSessionStarts(prior.sessionStarts);
    setWeekdays(pattern.weekdays);
    setHour(pattern.hour);
    setMinute(pattern.minute);
  }, [courses, level]);

  useEffect(() => {
    if (!level || nameTouched) return;
    setName(defaultCourseName(level, yearMonth));
  }, [level, yearMonth, nameTouched]);

  const dates = useMemo(
    () => generateMonthDates(yearMonth, weekdays),
    [yearMonth, weekdays]
  );

  const occurrences = useMemo(() => {
    if (!hour || !minute) return [];
    return dates.map((row) => {
      const start = new Date(`${row.sessionDate}T${hour}:${minute}:00`);
      return {
        sessionDate: row.sessionDate,
        startIso: Number.isNaN(start.getTime()) ? "" : start.toISOString(),
      };
    });
  }, [dates, hour, minute]);

  const duplicate = useMemo(() => {
    if (!level) return null;
    return (
      courses.find((course) => {
        if (course.level !== level) return false;
        const key = courseMonthKey(
          course.sessionDates.map((sessionDate) => ({ sessionDate })),
          course.createdAt
        );
        return key === yearMonth;
      }) ?? null
    );
  }, [courses, level, yearMonth]);

  const preview = formatClassPreview(dates);
  const canPattern = weekdays.length > 0 && hour !== "" && minute !== "";
  const canGenerate =
    Boolean(level) &&
    name.trim().length > 0 &&
    occurrences.length > 0 &&
    occurrences.every((row) => row.startIso);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="yearMonth" value={yearMonth} />
      <input type="hidden" name="occurrences" value={JSON.stringify(occurrences)} />

      {step === "nivel" ? (
        <fieldset>
          <legend className="mb-1.5 block text-label-md text-text-secondary">
            Nivel
          </legend>
          <div className="grid grid-cols-1 gap-2">
            {(["pre-intermediate", "intermediate"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLevel(value)}
                className={`min-h-11 rounded-card border px-4 text-left text-label-md font-medium ${
                  level === value
                    ? "border-accent bg-accent text-white"
                    : "border-paper-line text-text-primary hover:bg-surface-hover"
                }`}
              >
                {levelLabel(value)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === "mes" ? (
        <label className="block">
          <span className="mb-1.5 block text-label-md text-text-secondary">
            Mes
          </span>
          <select
            value={yearMonth}
            onChange={(event) => setYearMonth(event.target.value)}
            className={fieldClass}
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {step === "patron" ? (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-1.5 block text-label-md text-text-secondary">
              Días
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAY_ORDER.map((day) => {
                const active = weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setWeekdays((current) =>
                        current.includes(day)
                          ? current.filter((value) => value !== day)
                          : [...current, day]
                      )
                    }
                    className={`min-h-11 rounded-card border text-label-sm font-medium ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-paper-line text-text-primary hover:bg-surface-hover"
                    }`}
                  >
                    {WEEKDAY_SHORT[day]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div>
            <span className="mb-1.5 block text-label-md text-text-secondary">
              Hora
            </span>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={hour}
                onChange={(event) => setHour(event.target.value)}
                className={fieldClass}
              >
                <option value="" disabled>
                  Hora
                </option>
                {HOURS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(event) => setMinute(event.target.value)}
                className={fieldClass}
              >
                <option value="" disabled>
                  Min
                </option>
                {MINUTES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {preview ? (
            <p className="text-label-sm text-text-secondary">{preview}</p>
          ) : (
            <p className="text-label-sm text-text-muted">
              Elige los días y la hora para ver las fechas.
            </p>
          )}
        </div>
      ) : null}

      {step === "nombre" ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-label-md text-text-secondary">
              Nombre
            </span>
            <input
              name="name"
              value={name}
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
              required
              maxLength={80}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-label-md text-text-secondary">
              Tema (opcional)
            </span>
            <input
              name="theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              maxLength={80}
              className={fieldClass}
              placeholder="Viajes, comida, trabajo..."
            />
          </label>
          {preview ? (
            <p className="text-label-sm text-text-secondary">{preview}</p>
          ) : null}
        </div>
      ) : null}

      {duplicate ? (
        <p className="text-label-sm text-text-secondary">
          Ya hay un curso de {level ? levelLabel(level) : ""} para este mes (
          {duplicate.name}). Puedes crear otro.
        </p>
      ) : null}

      {state && !state.ok ? (
        <p className="text-label-sm text-error">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        {step !== "nivel" ? (
          <button
            type="button"
            onClick={() =>
              setStep(
                step === "mes"
                  ? "nivel"
                  : step === "patron"
                    ? "mes"
                    : "patron"
              )
            }
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card border border-paper-line px-4 text-label-md font-medium text-text-primary hover:bg-surface-hover"
          >
            Atrás
          </button>
        ) : null}
        {step !== "nombre" ? (
          <button
            type="button"
            disabled={
              (step === "nivel" && !level) ||
              (step === "patron" && !canPattern)
            }
            onClick={() =>
              setStep(
                step === "nivel"
                  ? "mes"
                  : step === "mes"
                    ? "patron"
                    : "nombre"
              )
            }
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card bg-accent px-4 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || !canGenerate}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card bg-accent px-4 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {isPending ? "Creando..." : "Generar"}
          </button>
        )}
      </div>
    </form>
  );
}
