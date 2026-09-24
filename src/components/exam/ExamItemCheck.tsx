"use client";

import { Check } from "lucide-react";

export default function ExamItemCheck({
  accepted,
  revealed,
  onAcceptedChange,
  onCheck,
}: {
  accepted: string[];
  revealed: boolean;
  onAcceptedChange: (next: string[]) => void;
  onCheck: () => void;
}) {
  const values = accepted.length > 0 ? accepted : [""];
  const canCheck = values.some((value) => value.trim());

  return (
    <div className="mt-2 space-y-2">
      {values.map((value, index) => (
        <input
          key={`variant-${index}`}
          value={value}
          onChange={(event) => {
            const next = [...values];
            next[index] = event.target.value;
            onAcceptedChange(next);
          }}
          placeholder={index === 0 ? "Respuesta" : "Otra forma"}
          className="min-h-11 w-full rounded-card border border-paper-line bg-white px-3 py-2 text-body-main text-text-primary focus:border-accent focus:outline-none"
        />
      ))}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAcceptedChange([...values, ""])}
          className="h-11 px-2 text-label-md text-text-accent underline-offset-2 hover:underline"
        >
          Añadir otra
        </button>
        <button
          type="button"
          onClick={onCheck}
          disabled={!canCheck}
          aria-label={revealed ? "Volver a marcar" : "Marcar"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-accent text-white disabled:opacity-40"
        >
          <Check size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
