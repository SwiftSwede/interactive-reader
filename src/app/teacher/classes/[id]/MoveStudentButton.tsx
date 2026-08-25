"use client";

import { useState } from "react";
import { moveStudentToOtherGroup } from "../../actions";
import type { CourseLevel } from "@/types";

function levelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export default function MoveStudentButton({
  courseId,
  studentId,
  fromLevel,
}: {
  courseId: string;
  studentId: string;
  fromLevel: CourseLevel;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const toLevel: CourseLevel =
    fromLevel === "pre-intermediate" ? "intermediate" : "pre-intermediate";
  const toLabel = levelLabel(toLevel);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-800"
      >
        Mover a {toLabel}
      </button>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-2 text-sm text-gray-600">
        Van a {toLabel} desde ahora. Siguen pagando igual. Los cursos nuevos
        también.
      </p>
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          const result = await moveStudentToOtherGroup(formData);
          if (!result.ok) {
            setPending(false);
            setError(result.error);
          }
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="studentId" value={studentId} />
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Moviendo..." : `Sí, a ${toLabel}`}
        </button>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="mt-2 w-full text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline disabled:opacity-60"
      >
        No, déjalo
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
