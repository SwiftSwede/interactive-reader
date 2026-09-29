"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import { endClassSession } from "@/app/teacher/end-class-action";

export default function EndClassButton({
  sessionId,
  classEndedAt,
  onEnded,
}: {
  sessionId: string;
  classEndedAt: string | null;
  onEnded?: (endedAt: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (classEndedAt) return null;

  return (
    <div className="mt-10 border-t border-paper-line pt-6">
      {confirming ? (
        <>
          <p className="text-body-main text-text-secondary">
            Los estudiantes pasan a repasar solos. Tú ya no vas a poder marcar
            Listo ni agregar notas en vivo.
          </p>
          <div className="mt-3 flex gap-2">
            <ActionButton
              className="flex-1"
              state={pending ? "pending" : "idle"}
              pendingLabel="Guardando..."
              onClick={async () => {
                setPending(true);
                setError("");
                const result = await endClassSession(sessionId);
                setPending(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                onEnded?.(result.endedAt);
              }}
            >
              Terminar
            </ActionButton>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="h-11 flex-1 rounded-card border border-paper-line text-label-md"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="h-11 w-full rounded-card border border-paper-line text-label-md text-text-secondary"
        >
          Terminar clase
        </button>
      )}
      {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
