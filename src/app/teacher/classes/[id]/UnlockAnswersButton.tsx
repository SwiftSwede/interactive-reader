"use client";

import { useState } from "react";
import { unlockAnswers } from "./actions";

export default function UnlockAnswersButton({
  courseId,
  sessionId,
  label = "Desbloquear ahora",
  pendingLabel = "Desbloqueando...",
}: {
  courseId: string;
  sessionId: string;
  label?: string;
  pendingLabel?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          const result = await unlockAnswers(formData);
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
          className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-card bg-accent px-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? pendingLabel : label}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
