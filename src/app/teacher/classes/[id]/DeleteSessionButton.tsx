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
        className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-card border border-paper-line px-3 text-sm font-medium text-text-primary"
      >
        Quitar
      </button>
    );
  }

  return (
    <div className="col-span-2">
      <p className="mb-2 text-sm text-text-secondary">
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
        className="mt-2 w-full text-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline disabled:opacity-60"
      >
        No, déjala
      </button>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
