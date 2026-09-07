"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RemoveStudentButton from "@/components/RemoveStudentButton";

export type TeacherStudentRow = {
  id: string;
  email: string;
  displayName: string | null;
  groupName: string | null;
  courseId: string | null;
};

export default function StudentRoster({
  students,
}: {
  students: TeacherStudentRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return students;
    return students.filter((student) => {
      const name = (student.displayName ?? "").toLocaleLowerCase("es");
      const email = student.email.toLocaleLowerCase("es");
      return name.includes(needle) || email.includes(needle);
    });
  }, [students, query]);

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Buscar
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o email"
          className="w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="mt-6 text-body-main text-text-muted">
          {students.length === 0
            ? "Todavía no hay nadie. Invita al primero."
            : "Nadie coincide con esa búsqueda."}
        </p>
      ) : (
        <ul className="mt-6 overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
          {filtered.map((student) => {
            const name = student.displayName ?? "Sin nombre";
            const body = (
              <>
                <p className="text-label-md text-text-primary">{name}</p>
                <p className="mt-0.5 text-label-sm text-text-muted">
                  {student.email}
                </p>
                <p className="mt-1 text-label-sm text-text-secondary">
                  {student.groupName ?? "Sin grupo"}
                </p>
              </>
            );
            const infoClass = "block rounded-card px-3 py-3";
            return (
              <li key={student.id} className="px-3 py-3">
                {student.courseId ? (
                  <Link
                    href={`/teacher/classes/${student.courseId}/students/${student.id}`}
                    className={`${infoClass} hover:bg-surface-hover`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={infoClass}>{body}</div>
                )}
                <RemoveStudentButton studentId={student.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
