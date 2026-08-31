"use client";

import { useState } from "react";
import { createExamGroup, deleteExamGroup } from "../../actions";

type Student = {
  studentId: string;
  displayName: string;
};

type Group = {
  id: string;
  groupLabel: string;
  writerId: string;
  memberIds: string[];
};

export default function ExamGroupForm({
  courseId,
  sessionId,
  students,
  groups,
}: {
  courseId: string;
  sessionId: string;
  students: Student[];
  groups: Group[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [writerId, setWriterId] = useState("");

  const taken = new Set(groups.flatMap((group) => group.memberIds));
  const available = students.filter((student) => !taken.has(student.studentId));
  const nameById = new Map(students.map((row) => [row.studentId, row.displayName]));

  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 3);
      if (!next.includes(writerId)) setWriterId(next[0] ?? "");
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Grupos</h2>
      <p className="text-sm text-gray-600">
        2 o 3 estudiantes. Uno escribe. Los demás ven el examen en vivo.
      </p>

      {groups.length > 0 && (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-lg border border-gray-100 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{group.groupLabel}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {group.memberIds
                      .map((id) => nameById.get(id) ?? "Sin nombre")
                      .join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Escribe: {nameById.get(group.writerId) ?? "Sin nombre"}
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
                    className="h-11 text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
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
        <p className="text-sm text-gray-500">
          {students.length === 0
            ? "Todavía no hay estudiantes en este curso."
            : "Todos ya tienen grupo."}
        </p>
      ) : (
        <form
          className="space-y-3 rounded-lg border border-gray-100 px-3 py-3"
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
            setWriterId("");
          }}
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <p className="text-sm font-medium text-gray-800">Nuevo grupo</p>
          <ul className="space-y-1">
            {available.map((student) => (
              <li key={student.studentId}>
                <label className="flex min-h-11 items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={student.studentId}
                    checked={selected.includes(student.studentId)}
                    onChange={() => toggle(student.studentId)}
                    disabled={
                      !selected.includes(student.studentId) && selected.length >= 3
                    }
                  />
                  {student.displayName}
                </label>
              </li>
            ))}
          </ul>
          {selected.length >= 2 && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Quién escribe
              </span>
              <select
                name="writerId"
                required
                value={writerId}
                onChange={(event) => setWriterId(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800"
              >
                {selected.map((id) => (
                  <option key={id} value={id}>
                    {nameById.get(id)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending || selected.length < 2}
            className="h-11 w-full rounded-lg bg-gray-900 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Armando..." : "Armar grupo"}
          </button>
        </form>
      )}
    </div>
  );
}
