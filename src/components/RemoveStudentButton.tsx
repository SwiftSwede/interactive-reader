"use client";

import { useState } from "react";
import { removeClassroomStudent } from "@/app/teacher/actions";

export default function RemoveStudentButton({
  studentId,
}: {
  studentId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-card border border-paper-line px-3 text-label-md font-medium text-text-primary hover:bg-surface-hover"
      >
        Quitar
      </button>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-2 text-label-sm text-text-secondary">
        ¿Lo saco de clase? Deja de entrar a las clases nuevas. Lo que ya hizo se
        queda.
      </p>
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          const result = await removeClassroomStudent(formData);
          if (!result.ok) {
            setPending(false);
            setError(result.error);
          }
        }}
      >
        <input type="hidden" name="studentId" value={studentId} />
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center rounded-card bg-accent px-3 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Sacando..." : "Sí, sacar"}
        </button>
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
