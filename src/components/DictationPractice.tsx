"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { usePlaybackRate } from "./PlaybackRateContext";
import MicroExplanation from "./MicroExplanation";
import IpaText from "./IpaText";
import { recordDictationAttempt } from "@/app/lesson/[slug]/actions";
import type { PronunciationWordNote } from "@/types";

type DictationPracticeProps = {
  audioUrl: string;
  standardText: string;
  phoneticText: string;
  ipaText?: string;
  wordNotes?: PronunciationWordNote[];
  explanation?: string;
  microExplanation: string;
  /** Omitted for anonymous free-story practice, which stays in-session. */
  storyId?: string;
  sessionId?: string;
};

export default function DictationPractice({
  audioUrl,
  standardText,
  phoneticText,
  ipaText,
  wordNotes = [],
  explanation,
  microExplanation,
  storyId,
  sessionId,
}: DictationPracticeProps) {
  const [phase, setPhase] = useState<"listening" | "revealed">("listening");
  const [userText, setUserText] = useState("");
  const [hasPlayed, setHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const studentIpa = ipaText?.trim() || phoneticText;
  const { rate } = usePlaybackRate();

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const playClip = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.playbackRate = rate;
    audio.play();
    setHasPlayed(true);
  };

  const handleSubmit = () => {
    // Reveal first: the learner never waits on a network round trip, and the
    // action is a no-op for anonymous users.
    setPhase("revealed");

    if (!storyId) return;
    void recordDictationAttempt({
      storyId,
      responseText: userText,
      sessionId,
    });
  };

  const handleRetry = () => {
    setPhase("listening");
    setUserText("");
  };

  return (
    <section>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <h3 className="text-headline-md text-text-primary mb-2">
        Dictado: Escucha y escribe
      </h3>

      <p className="text-label-md text-text-secondary mb-3">
        Escucha el audio y escribe lo que oyes. No mires el texto.
      </p>

      <MicroExplanation dismissKey="dictation" text={microExplanation} />

      {phase === "listening" && (
        <div className="space-y-4">
          <button
            onClick={playClip}
            type="button"
            className="flex items-center gap-2 px-5 py-3 rounded-card bg-accent text-white text-label-md hover:bg-accent-hover transition-colors min-h-11"
          >
            <Play size={16} aria-hidden="true" />
            {hasPlayed ? "Escuchar otra vez" : "Escuchar"}
          </button>

          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Escribe lo que oyes..."
            className="w-full border border-paper-line bg-surface rounded-card p-3 text-body-main text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-accent min-h-[80px]"
            rows={3}
          />

          <button
            onClick={handleSubmit}
            disabled={!userText.trim()}
            type="button"
            className="px-5 py-3 rounded-card bg-accent text-white text-label-md disabled:bg-surface-hover disabled:text-text-muted disabled:cursor-not-allowed hover:bg-accent-hover transition-colors min-h-11"
          >
            Comprobar
          </button>
        </div>
      )}

      {phase === "revealed" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-card bg-error-bg border border-paper-line p-3">
              <p className="text-label-sm text-text-secondary mb-1">
                Tu respuesta:
              </p>
              <p className="text-body-main text-text-primary">
                {userText || "(vacio)"}
              </p>
            </div>
            <div className="rounded-card bg-success-bg border border-paper-line p-3">
              <p className="text-label-sm text-text-secondary mb-1">Correcto:</p>
              <p className="text-body-main font-semibold text-text-primary">
                {standardText}
              </p>
            </div>
          </div>

          <div className="rounded-card bg-accent-soft border border-paper-line p-3">
            <p className="text-label-sm text-text-secondary mb-1">Como suena:</p>
            <p className="text-body-main text-text-primary">
              <IpaText text={studentIpa} interactive />
            </p>
            <p className="text-label-sm text-text-secondary mt-2">
              Toca un sonido para ver el video.
            </p>
          </div>

          {(wordNotes.length > 0 || explanation) && (
            <div className="rounded-card bg-accent-softer border border-paper-line p-4 space-y-3">
              <p className="text-label-sm text-text-accent">
                Notas del Profe Kyle:
              </p>
              {wordNotes.length > 0
                ? wordNotes.map((item) => (
                    <div key={item.word}>
                      <p className="text-body-main font-semibold text-text-primary">
                        {item.word}
                      </p>
                      <p className="text-body-main text-text-secondary">
                        {item.note}
                      </p>
                    </div>
                  ))
                : (
                    <p className="text-body-main text-text-secondary whitespace-pre-line">
                      {explanation}
                    </p>
                  )}
            </div>
          )}

          <button
            onClick={handleRetry}
            type="button"
            className="min-h-11 rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </section>
  );
}
