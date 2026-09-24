"use client";

import { useEffect, useState } from "react";
import { createExamGroup, deleteExamGroup } from "../../actions";
import { listOpenedExamStudents } from "@/app/exam/exam-teacher-actions";

type Student = {
  studentId: string;
  displayName: string;
};

type Group = {
  id: string;
  groupLabel: string;
  writerId: string | null;
  memberIds: string[];
};

export default function ExamGroupForm({
  courseId,
  sessionId,
  students,
  groups,
  openedIds,
}: {
  courseId: string;
  sessionId: string;
  students: Student[];
  groups: Group[];
  openedIds: string[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [opened, setOpened] = useState<Set<string>>(
    () => new Set(openedIds)
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      void listOpenedExamStudents(sessionId).then((result) => {
        if (!result.ok) return;
        setOpened(new Set(result.studentIds));
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  const taken = new Set(groups.flatMap((group) => group.memberIds));
  const available = students.filter(
    (student) => opened.has(student.studentId) && !taken.has(student.studentId)
  );
  const nameById = new Map(
    students.map((row) => [row.studentId, row.displayName])
  );

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id].slice(0, 3);
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-headline-md text-text-primary">Grupos</h2>
      <p className="text-sm text-text-secondary">
        2 o 3 estudiantes. Cada uno escribe su propio examen.
      </p>

      {groups.length > 0 && (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-card border border-paper-line px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary">
                    {group.groupLabel}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {group.memberIds
                      .map((id) => nameById.get(id) ?? "Sin nombre")
                      .join(", ")}
                  </p>
                </div>
                <form
                  action={async (formData) => {
                    await deleteExamGroup(formData);
                  }}
                >
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="groupId" value={group.id} />
                  <button
                    type="submit"
                    className="h-11 text-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline"
                  >
                    Quitar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {available.length === 0 ? (
        <p className="text-sm text-text-muted">
          {opened.size === 0
            ? "Todavía nadie abrió el examen."
            : "Todos los que abrieron el examen ya tienen grupo."}
        </p>
      ) : (
        <form
          className="space-y-3 rounded-card border border-paper-line px-3 py-3"
          action={async (formData) => {
            setPending(true);
            setError("");
            const result = await createExamGroup(formData);
            setPending(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSelected([]);
          }}
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <p className="text-sm font-medium text-text-primary">Nuevo grupo</p>
          <ul className="space-y-1">
            {available.map((student) => (
              <li key={student.studentId}>
                <label className="flex min-h-11 items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={student.studentId}
                    checked={selected.includes(student.studentId)}
                    onChange={() => toggle(student.studentId)}
                    disabled={
                      !selected.includes(student.studentId) &&
                      selected.length >= 3
                    }
                  />
                  {student.displayName}
                </label>
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={pending || selected.length < 2}
            className="h-11 w-full rounded-card bg-accent text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Armando..." : "Armar grupo"}
          </button>
        </form>
      )}
    </div>
  );
}
