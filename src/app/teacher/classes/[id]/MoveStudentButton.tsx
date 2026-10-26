"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { TEACHER_BUTTON_SECONDARY } from "@/components/teacher/teacher-ui";
import { moveStudentToOtherGroup } from "../../actions";
import type { CourseLevel } from "@/types";

function levelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export default function MoveStudentButton({
  courseId,
  studentId,
  fromLevel,
  afterSuccessHref,
}: {
  courseId: string;
  studentId: string;
  fromLevel: CourseLevel;
  afterSuccessHref: string;
}) {
  const router = useRouter();
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
        className={TEACHER_BUTTON_SECONDARY}
      >
        Mover a {toLabel}
      </button>
    );
  }

  return (
    <div className="max-w-sm">
      <p className="mb-2 text-label-sm text-text-secondary">
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
            return;
          }
          router.replace(afterSuccessHref);
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="studentId" value={studentId} />
        <ActionButton
          type="submit"
          className="w-full"
          state={pending ? "pending" : "idle"}
          pendingLabel="Moviendo..."
        >
          Sí, a {toLabel}
        </ActionButton>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="mt-2 min-h-11 w-full text-label-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline disabled:opacity-60"
      >
        No, déjalo
      </button>
      {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
