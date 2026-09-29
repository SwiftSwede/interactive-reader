"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import { startWritingTimer } from "../../actions";

export default function StartWritingTimerButton({
  courseId,
  sessionId,
  label = "Iniciar",
}: {
  courseId: string;
  sessionId: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <form
        action={async (formData) => {
          setPending(true);
          setError("");
          const result = await startWritingTimer(formData);
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
          pendingLabel="Iniciando..."
        >
          {label}
        </ActionButton>
      </form>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
