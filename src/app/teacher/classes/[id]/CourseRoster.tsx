"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import LocalDateTime from "@/components/LocalDateTime";
import type { RosterStudent } from "@/lib/teacher";
import type { CourseLevel } from "@/types";
import MoveStudentButton from "./MoveStudentButton";

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
      <p className="text-sm text-gray-500">
        Todavía no hay estudiantes en este curso. Invítalos desde Invitaciones.
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
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
        {sorted.map((student) => (
          <li key={student.studentId} className="px-3 py-3">
            <Link
              href={`/teacher/classes/${courseId}/students/${student.studentId}`}
              className="block hover:bg-gray-50 md:flex md:items-baseline md:justify-between md:gap-4"
            >
              <p className="font-medium text-gray-900">{student.displayName}</p>
              <div className="mt-0.5 md:mt-0 md:text-right">
                <p className="text-sm text-gray-600">
                  Asistencia: {student.attendedCount}/{student.sessionCount}
                </p>
                {student.lastActivityAt ? (
                  <div className="text-sm text-gray-500">
                    Última actividad:
                    <LocalDateTime iso={student.lastActivityAt} />
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm text-gray-400">
                    Todavía no entra a una clase.
                  </p>
                )}
              </div>
            </Link>
            <MoveStudentButton
              courseId={courseId}
              studentId={student.studentId}
              fromLevel={courseLevel}
            />
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
      className={`rounded-full px-3 py-1.5 text-sm ${
        active
          ? "bg-gray-900 text-white"
          : "border border-gray-200 text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}
