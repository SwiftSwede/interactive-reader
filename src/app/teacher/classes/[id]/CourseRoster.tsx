"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import LocalDateTime from "@/components/LocalDateTime";
import type { RosterStudent } from "@/lib/teacher";

type SortKey = "name" | "attendance" | "activity";

export default function CourseRoster({
  courseId,
  students,
}: {
  courseId: string;
  students: RosterStudent[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const sorted = useMemo(() => {
    const copy = [...students];
    copy.sort((a, b) => {
      if (sortKey === "name") {
        return a.displayName.localeCompare(b.displayName, "es");
      }
      if (sortKey === "attendance") {
        const aRate =
          a.sessionCount === 0 ? -1 : a.attendedCount / a.sessionCount;
        const bRate =
          b.sessionCount === 0 ? -1 : b.attendedCount / b.sessionCount;
        if (bRate !== aRate) return bRate - aRate;
        return a.displayName.localeCompare(b.displayName, "es");
      }
      const aTime = a.lastActivityAt
        ? new Date(a.lastActivityAt).getTime()
        : 0;
      const bTime = b.lastActivityAt
        ? new Date(b.lastActivityAt).getTime()
        : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.displayName.localeCompare(b.displayName, "es");
    });
    return copy;
  }, [students, sortKey]);

  if (students.length === 0) {
    return (
      <p className="text-label-sm text-text-muted">
        Todavía no hay estudiantes en este curso. Invítalos desde{" "}
        <Link href="/teacher/students" className="text-text-accent hover:underline">
          Estudiantes
        </Link>
        .
      </p>
    );
  }

  return (
    <div>
      {students.length >= 2 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-label-sm text-text-muted">Ordenar</span>
          <SortChip
            active={sortKey === "name"}
            onClick={() => setSortKey("name")}
            label="Nombre"
          />
          <SortChip
            active={sortKey === "attendance"}
            onClick={() => setSortKey("attendance")}
            label="Asistencia"
          />
          <SortChip
            active={sortKey === "activity"}
            onClick={() => setSortKey("activity")}
            label="Actividad"
          />
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2 lg:grid-cols-3">
        {sorted.map((student) => (
          <li key={student.studentId}>
            <Link
              href={`/teacher/classes/${courseId}/students/${student.studentId}`}
              className="flex h-full items-start gap-2 rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover active:bg-surface-hover"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label-md text-text-primary">
                  {student.displayName}
                </span>
                <span className="mt-1 block text-label-sm text-text-secondary">
                  Asistencia: {student.attendedCount} de {student.sessionCount}
                </span>
                <span className="mt-0.5 block text-label-sm text-text-muted">
                  {student.lastActivityAt ? (
                    <>
                      En la app:{" "}
                      <LocalDateTime
                        iso={student.lastActivityAt}
                        format="dayTime"
                        className=""
                      />
                    </>
                  ) : (
                    "Sin actividad en la app."
                  )}
                </span>
              </span>
              <ChevronRight
                className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-card border px-3 text-label-sm ${
        active
          ? "border-accent bg-accent-soft text-text-accent"
          : "border-paper-line bg-surface text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}
