"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import LocalDateTime from "@/components/LocalDateTime";
import { moveStudentsToCohort } from "@/app/teacher/actions";
import type { ClassroomCohort } from "@/lib/classroom-cohort";
import type { RosterStudent } from "@/lib/teacher";

type SortKey = "name" | "attendance" | "activity";

export default function CourseRoster({
  courseId,
  cohort,
  canMove = true,
  students,
}: {
  courseId: string;
  cohort: ClassroomCohort;
  canMove?: boolean;
  students: RosterStudent[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const destination =
    cohort === "extra" ? "al horario de siempre" : "al otro horario";

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
      {canMove ? (
      <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.length === students.length
                    ? []
                    : students.map((student) => student.studentId)
                )
              }
              className="inline-flex min-h-11 items-center rounded-card border border-paper-line px-3 text-label-sm text-text-secondary hover:bg-surface-hover"
            >
              {selected.length === students.length ? "Quitar todos" : "Todos"}
            </button>
            <button
              type="button"
              disabled={selected.length === 0 || pending}
              onClick={() => {
                setError("");
                setConfirming(true);
              }}
              className="inline-flex min-h-11 items-center rounded-card bg-accent px-3 text-label-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              Mover {selected.length || ""} {destination}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setSelecting(false);
                setConfirming(false);
                setSelected([]);
                setError("");
              }}
              className="inline-flex min-h-11 items-center px-3 text-label-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline disabled:opacity-60"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            className="inline-flex min-h-11 items-center rounded-card border border-paper-line px-3 text-label-sm text-text-secondary hover:bg-surface-hover"
          >
            Mover {destination}
          </button>
        )}
      </div>
      {confirming ? (
        <form
          className="mb-4 max-w-sm"
          action={async (formData) => {
            setPending(true);
            setError("");
            const result = await moveStudentsToCohort(formData);
            if (!result.ok) {
              setPending(false);
              setError(result.error);
              return;
            }
            router.refresh();
            setSelecting(false);
            setConfirming(false);
            setSelected([]);
            setPending(false);
          }}
        >
          <p className="mb-2 text-label-sm text-text-secondary">
            Pasan {destination}. Siguen pagando igual. El próximo mes entran a
            ese horario solos.
          </p>
          <input type="hidden" name="courseId" value={courseId} />
          <input
            type="hidden"
            name="studentIds"
            value={JSON.stringify(selected)}
          />
          <ActionButton
            type="submit"
            className="w-full"
            state={pending ? "pending" : "idle"}
            pendingLabel="Moviendo..."
          >
            Sí, {destination}
          </ActionButton>
          {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
        </form>
      ) : null}
      </>
      ) : null}
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
          <li key={student.studentId} className="flex items-stretch gap-2">
            {selecting ? (
              <label className="flex min-h-11 min-w-11 items-center justify-center">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={selected.includes(student.studentId)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(student.studentId)
                        ? current.filter((id) => id !== student.studentId)
                        : [...current, student.studentId]
                    )
                  }
                />
                <span className="sr-only">Elegir a {student.displayName}</span>
              </label>
            ) : null}
            <Link
              href={`/teacher/classes/${courseId}/students/${student.studentId}`}
              className="flex h-full min-w-0 flex-1 items-start gap-2 rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover active:bg-surface-hover"
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
