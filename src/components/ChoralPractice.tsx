"use client";

import { useEffect, useRef, useState } from "react";
import { usePlaybackRate } from "./PlaybackRateContext";
import MicroExplanation from "./MicroExplanation";

const PLAYS_PER_ROUND = 10;
const TOTAL_ROUNDS = 5;
const GAP_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function ChoralPractice({
  audioUrl,
  storyId,
  alreadyCompleted = false,
}: {
  audioUrl: string;
  storyId: string;
  alreadyCompleted?: boolean;
}) {
  const [plays, setPlays] = useState(0);
  const [rounds, setRounds] = useState(alreadyCompleted ? TOTAL_ROUNDS : 0);
  const [playing, setPlaying] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cancelRef = useRef({ cancelled: false });
  const { rate } = usePlaybackRate();

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const completed = rounds >= TOTAL_ROUNDS;

  useEffect(() => {
    if (alreadyCompleted) return;
    try {
      if (localStorage.getItem(`choral-complete:${storyId}`)) {
        setRounds(TOTAL_ROUNDS);
      }
    } catch {
      // localStorage can be blocked
    }
  }, [alreadyCompleted, storyId]);

  useEffect(() => {
    const cancel = cancelRef.current;
    return () => {
      cancel.cancelled = true;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
    };
  }, []);

  const playOnce = () =>
    new Promise<void>((resolve) => {
      const audio = audioRef.current;
      if (!audio) {
        resolve();
        return;
      }

      const finish = () => {
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        resolve();
      };

      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
      audio.currentTime = 0;
      audio.playbackRate = rate;
      audio.play().catch(finish);
    });

  const saveCompletion = async () => {
    try {
      localStorage.setItem(`choral-complete:${storyId}`, "1");
    } catch {
      // ignore
    }

    try {
      const response = await fetch("/api/choral-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, roundsCompleted: TOTAL_ROUNDS }),
      });
      if (response.status === 401) return;
      if (!response.ok) {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    }
  };

  const startRound = async () => {
    if (playing || completed) return;
    cancelRef.current.cancelled = false;
    setPlaying(true);
    setPlays(0);

    for (let i = 0; i < PLAYS_PER_ROUND; i++) {
      if (cancelRef.current.cancelled) {
        setPlaying(false);
        return;
      }
      await playOnce();
      if (cancelRef.current.cancelled) {
        setPlaying(false);
        return;
      }
      setPlays(i + 1);
      if (i < PLAYS_PER_ROUND - 1) {
        await sleep(GAP_MS);
      }
    }

    const nextRounds = rounds + 1;
    setRounds(nextRounds);
    setPlaying(false);
    if (nextRounds >= TOTAL_ROUNDS) {
      await saveCompletion();
    }
  };

  return (
    <section>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <h3 className="text-headline-md text-text-primary mb-2">
        Práctica coral
      </h3>

      <p className="text-label-md text-text-secondary mb-3">
        Escucha el clip y repite en voz alta. No pienses. Solo sigue.
      </p>

      <MicroExplanation
        dismissKey="choral"
        text="Repetir en voz alta es como ir al gimnasio: tu boca necesita las repeticiones para que el sonido salga solo. No pienses. Escucha y repite."
      />

      {completed ? (
        <div className="rounded-card bg-success-bg border border-paper-line p-4">
          <p className="text-body-main font-semibold text-success">
            ¡Práctica completa!
          </p>
          <p className="text-body-main text-text-secondary mt-1">
            50 repeticiones. Eso ya es trabajo de verdad.
          </p>
          {saveError && (
            <p className="text-label-md text-text-secondary mt-2">
              No pude guardar tu progreso. La practica igual cuenta.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-headline-md text-text-primary tabular-nums">
            Repeticiones: {plays}/{PLAYS_PER_ROUND}
          </p>

          <div className="flex gap-2" aria-label="Rondas">
            {Array.from({ length: TOTAL_ROUNDS }, (_, index) => (
              <span
                key={index}
                className={`h-3 w-3 rounded-full ${
                  index < rounds ? "bg-accent" : "bg-paper-line"
                }`}
                aria-hidden
              />
            ))}
          </div>

          <button
            type="button"
            onClick={startRound}
            disabled={playing}
            className="px-5 py-3 rounded-card bg-accent text-white text-label-md hover:bg-accent-hover transition-colors disabled:bg-surface-hover disabled:text-text-muted disabled:cursor-not-allowed min-h-11"
          >
            {playing
              ? "Repitiendo..."
              : rounds === 0
                ? "Empezar ronda"
                : "Siguiente ronda"}
          </button>
        </div>
      )}
    </section>
  );
}
