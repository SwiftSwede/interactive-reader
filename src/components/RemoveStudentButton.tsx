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
        className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-800"
      >
        Quitar
      </button>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-2 text-sm text-gray-600">
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
          className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Sacando..." : "Sí, sacar"}
        </button>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="mt-2 w-full min-h-11 text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline disabled:opacity-60"
      >
        No, déjalo
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
