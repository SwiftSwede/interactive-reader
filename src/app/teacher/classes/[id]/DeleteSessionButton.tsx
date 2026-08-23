"use client";

import { useState } from "react";
import { deleteSession } from "./actions";

export default function DeleteSessionButton({
  courseId,
  sessionId,
}: {
  courseId: string;
  sessionId: string;
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
        className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-800"
      >
        Quitar
      </button>
    );
  }

  return (
    <div className="col-span-2">
      <p className="mb-2 text-sm text-gray-600">
        ¿La quito? El link deja de servir.
      </p>
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          const result = await deleteSession(formData);
          if (!result.ok) {
            setPending(false);
            setError(result.error);
          }
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Quitando..." : "Sí, quitar"}
        </button>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="mt-2 w-full text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline disabled:opacity-60"
      >
        No, déjala
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
