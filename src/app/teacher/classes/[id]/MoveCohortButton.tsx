"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { TEACHER_BUTTON_SECONDARY } from "@/components/teacher/teacher-ui";
import { moveStudentsToCohort } from "../../actions";
import type { ClassroomCohort } from "@/lib/classroom-cohort";

function destinationPhrase(cohort: ClassroomCohort): string {
  return cohort === "extra" ? "al horario de siempre" : "al otro horario";
}

export default function MoveCohortButton({
  courseId,
  studentId,
  cohort,
  afterSuccessHref,
}: {
  courseId: string;
  studentId: string;
  cohort: ClassroomCohort;
  afterSuccessHref: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const destination = destinationPhrase(cohort);

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
        Mover {destination}
      </button>
    );
  }

  return (
    <div className="max-w-sm">
      <p className="mb-2 text-label-sm text-text-secondary">
        Pasa {destination}. Sigue pagando igual. El próximo mes entra a ese
        horario solo.
      </p>
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          const result = await moveStudentsToCohort(formData);
          if (!result.ok) {
            setPending(false);
            setError(result.error);
            return;
          }
          router.replace(afterSuccessHref);
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="studentIds" value={JSON.stringify([studentId])} />
        <ActionButton
          type="submit"
          className="w-full"
          state={pending ? "pending" : "idle"}
          pendingLabel="Moviendo..."
        >
          Sí, {destination}
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
