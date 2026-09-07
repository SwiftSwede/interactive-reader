"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleSessionAttendance } from "@/app/teacher/classes/[id]/actions";

export default function AttendanceToggle({
  courseId,
  sessionId,
  studentId,
  attended,
  autoMarked,
  name,
}: {
  courseId: string;
  sessionId: string;
  studentId: string;
  attended: boolean;
  autoMarked: boolean;
  name: string;
}) {
  const [checked, setChecked] = useState(attended);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setChecked(attended);
  }, [attended]);

  function onChange(next: boolean) {
    const previous = checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleSessionAttendance({
        courseId,
        sessionId,
        studentId,
        attended: next,
      });
      if (!result.ok) {
        setChecked(previous);
        setError(result.error);
      }
    });
  }

  const inputId = `attendance-${sessionId}-${studentId}`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex min-h-11 cursor-pointer items-center gap-3"
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 shrink-0 accent-accent"
          aria-label={checked ? `Asistió: ${name}` : `No asistió: ${name}`}
        />
        <span className="min-w-0">
          <span className="block text-label-md text-text-primary">{name}</span>
          {autoMarked ? (
            <span className="text-label-sm text-text-muted">auto</span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p className="mt-1 text-label-sm text-error">{error}</p>
      ) : null}
    </div>
  );
}
