"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
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
        <ActionButton
          type="submit"
          className="w-full whitespace-nowrap"
          state={pending ? "pending" : "idle"}
          pendingLabel={pendingLabel}
        >
          {label}
        </ActionButton>
      </form>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
