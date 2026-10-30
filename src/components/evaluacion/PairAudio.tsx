"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { evalUiCopy } from "@/lib/evaluacion/copy";

/** Plays the word once on arrival (if the browser allows) and on every tap. A missing file fails soft. */
export function PairAudio({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    audioRef.current?.play().catch(() => {
      // Autoplay blocked or file missing; the button and onError cover both.
    });
  }, [src]);

  function play() {
    const audio = audioRef.current;
    if (!audio || pending) return;
    audio.currentTime = 0;
    audio.play().catch((error: unknown) => {
      console.error("evaluacion: pair audio failed", error);
      setPending(true);
    });
  }

  return (
    <div className="ev-audio">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onError={() => setPending(true)}
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        className="ev-audio-button"
        onClick={play}
        disabled={pending}
        aria-pressed={playing}
      >
        <Volume2 size={28} aria-hidden="true" />
        <span>{evalUiCopy.listen}</span>
      </button>
      {pending ? (
        <p className="ev-note" role="status">
          {evalUiCopy.audioPending}
        </p>
      ) : null}
    </div>
  );
}
