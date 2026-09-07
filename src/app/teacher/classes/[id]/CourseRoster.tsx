"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import LocalDateTime from "@/components/LocalDateTime";
import type { RosterStudent } from "@/lib/teacher";
import type { CourseLevel } from "@/types";
import MoveStudentButton from "./MoveStudentButton";
import RemoveStudentButton from "@/components/RemoveStudentButton";

type SortKey = "name" | "attendance" | "activity";

export default function CourseRoster({
  courseId,
  courseLevel,
  students,
}: {
  courseId: string;
  courseLevel: CourseLevel;
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
        <div className="mb-3 flex flex-wrap gap-2">
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
      <ul className="grid grid-cols-1 items-start gap-3 min-[600px]:grid-cols-2 lg:grid-cols-3">
        {sorted.map((student) => (
          <li
            key={student.studentId}
            className="rounded-sheet border border-paper-line bg-surface p-4"
          >
            <Link
              href={`/teacher/classes/${courseId}/students/${student.studentId}`}
              className="block rounded-card hover:bg-surface-hover"
            >
              <p className="text-label-md text-text-primary">
                {student.displayName}
              </p>
              <p className="mt-1 text-label-sm text-text-secondary">
                Asistencia: {student.attendedCount}/{student.sessionCount}
              </p>
              {student.lastActivityAt ? (
                <div className="mt-0.5 text-label-sm text-text-muted">
                  Última actividad:
                  <LocalDateTime iso={student.lastActivityAt} />
                </div>
              ) : (
                <p className="mt-0.5 text-label-sm text-text-muted">
                  Todavía no entra a una clase.
                </p>
              )}
            </Link>
            <MoveStudentButton
              courseId={courseId}
              studentId={student.studentId}
              fromLevel={courseLevel}
            />
            <RemoveStudentButton studentId={student.studentId} />
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
      className={`min-h-11 rounded-small px-3 text-label-sm ${
        active
          ? "bg-accent text-white"
          : "border border-paper-line text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}
