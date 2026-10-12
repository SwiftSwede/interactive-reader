"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { keywordAudioPath } from "@/lib/sound-guide";
import { playSoundUrl } from "./playSound";

export default function SoundExamples({ words }: { words: string[] }) {
  const [error, setError] = useState<string | null>(null);

  if (words.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {words.map((word) => (
        <li key={word}>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-card border border-paper-line bg-surface px-4 text-left hover:bg-surface-hover active:bg-accent-soft"
            onClick={() => {
              setError(null);
              playSoundUrl(keywordAudioPath(word), 1).catch(() => setError(word));
            }}
          >
            <span className="text-body-main text-text-primary" lang="en">
              {word}
            </span>
            <Volume2 className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <span className="sr-only">Escuchar {word}</span>
          </button>
          {error === word ? (
            <p className="mt-1 text-label-sm text-text-secondary">Sin audio.</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
