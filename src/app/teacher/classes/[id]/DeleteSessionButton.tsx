"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
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
        className="inline-flex min-h-11 items-center text-label-md text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
      >
        Quitar clase
      </button>
    );
  }

  return (
    <div>
      <p className="mb-2 text-label-sm text-text-secondary">
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
        <ActionButton
          type="submit"
          className="w-full"
          state={pending ? "pending" : "idle"}
          pendingLabel="Quitando..."
        >
          Sí, quitar
        </ActionButton>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="mt-2 min-h-11 w-full text-label-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline disabled:opacity-60"
      >
        No, déjala
      </button>
      {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
