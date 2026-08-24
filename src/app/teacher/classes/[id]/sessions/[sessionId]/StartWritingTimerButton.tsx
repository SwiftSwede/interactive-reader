"use client";

import { useState } from "react";
import { startWritingTimer } from "../../actions";

export default function StartWritingTimerButton({
  courseId,
  sessionId,
}: {
  courseId: string;
  sessionId: string;
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
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Iniciando..." : "Iniciar"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
