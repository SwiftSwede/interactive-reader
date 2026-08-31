"use client";

import { useState } from "react";
import type { LyricBlank } from "@/types";

export default function MusicBlanks({ blanks }: { blanks: LyricBlank[] }) {
  const [values, setValues] = useState<string[]>(() => blanks.map(() => ""));
  const [checked, setChecked] = useState(false);

  if (blanks.length === 0) return null;

  return (
    <div className="mb-6 rounded-card border border-paper-line bg-white px-4 py-4">
      <h3 className="font-heading text-headline-md text-text-primary">
        Escucha y completa
      </h3>
      <p className="mt-1 text-body-main text-text-secondary">
        8 a 10 huecos en clase. Aquí practicas los de esta canción.
      </p>
      <ol className="mt-4 space-y-3">
        {blanks.map((blank, index) => {
          const typed = values[index] ?? "";
          const ok =
            checked &&
            typed.trim().toLowerCase() === blank.answer.trim().toLowerCase();
          const inputId = `lyric-blank-${blank.id}`;
          return (
            <li key={blank.id}>
              <label
                htmlFor={inputId}
                className="block text-label-md text-text-secondary"
              >
                {blank.prompt}
              </label>
              <input
                id={inputId}
                value={typed}
                onChange={(event) => {
                  setChecked(false);
                  setValues((current) => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  });
                }}
                className="mt-1 min-h-11 w-full rounded-card border border-paper-line px-3 py-2 text-body-main"
              />
              {checked && (
                <p
                  className={`mt-1 text-label-sm ${
                    ok ? "text-success" : "text-error"
                  }`}
                >
                  {ok ? "Bien." : `Era: ${blank.answer}`}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => setChecked(true)}
        className="mt-4 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white"
      >
        Comprobar
      </button>
    </div>
  );
}

export function youtubeEmbedId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const parts = parsed.pathname.split("/");
    const embed = parts.indexOf("embed");
    if (embed >= 0 && parts[embed + 1]) return parts[embed + 1];
  } catch {
    return null;
  }
  return null;
}
