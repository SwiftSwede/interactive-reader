"use client";

import { Check, Plus } from "lucide-react";

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
        <div key={`variant-${index}`} className="flex items-center gap-2">
          {index === 0 ? (
            <button
              type="button"
              onClick={() => onAcceptedChange([...values, ""])}
              aria-label="Añadir otra"
              className="-ml-6 flex h-11 w-11 shrink-0 items-center justify-end pr-0 text-text-accent hover:text-text-primary"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          ) : (
            <span className="h-11 w-5 shrink-0" aria-hidden="true" />
          )}
          <input
            value={value}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onAcceptedChange(next);
            }}
            placeholder={index === 0 ? "Respuesta" : "Otra forma"}
            className="min-h-11 min-w-0 flex-1 rounded-card border border-paper-line bg-white px-3 py-2 text-body-main text-text-primary focus:border-accent focus:outline-none"
          />
          {index === 0 ? (
            <button
              type="button"
              onClick={onCheck}
              disabled={!canCheck}
              aria-label={revealed ? "Volver a marcar" : "Marcar"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-accent text-white transition-colors duration-200 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
            >
              <Check size={20} aria-hidden="true" />
            </button>
          ) : (
            <span className="h-11 w-11 shrink-0" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}
