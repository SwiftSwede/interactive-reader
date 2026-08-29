"use client";

import { useEffect, useRef, useState } from "react";
import { usePlaybackRate } from "./PlaybackRateContext";
import MicroExplanation from "./MicroExplanation";
import IpaText from "./IpaText";
import type { PronunciationWordNote } from "@/types";

type DictationPracticeProps = {
  audioUrl: string;
  standardText: string;
  phoneticText: string;
  ipaText?: string;
  wordNotes?: PronunciationWordNote[];
  explanation?: string;
  microExplanation: string;
};

export default function DictationPractice({
  audioUrl,
  standardText,
  phoneticText,
  ipaText,
  wordNotes = [],
  explanation,
  microExplanation,
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
    setPhase("revealed");
  };

  const handleRetry = () => {
    setPhase("listening");
    setUserText("");
  };

  return (
    <section>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <h3 className="text-lg font-bold text-gray-900 mb-2">
        Dictado: Escucha y escribe
      </h3>

      <MicroExplanation text={microExplanation} />

      {phase === "listening" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Escucha el audio y escribe lo que oyes. No mires el texto.
          </p>

          <button
            onClick={playClip}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors min-h-11"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {hasPlayed ? "Escuchar otra vez" : "Escuchar"}
          </button>

          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Escribe lo que oyes..."
            className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-blue-400 min-h-[80px] text-base"
            rows={3}
          />

          <button
            onClick={handleSubmit}
            disabled={!userText.trim()}
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors min-h-11"
          >
            Comprobar
          </button>
        </div>
      )}

      {phase === "revealed" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="text-xs text-gray-500 mb-1">Tu respuesta:</p>
              <p className="text-gray-800">{userText || "(vacio)"}</p>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-100 p-3">
              <p className="text-xs text-gray-500 mb-1">Correcto:</p>
              <p className="text-gray-800 font-medium">{standardText}</p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs text-gray-500 mb-1">Como suena:</p>
            <p className="text-gray-800 text-sm leading-relaxed">
              <IpaText text={studentIpa} interactive />
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Toca un sonido para ver el video.
            </p>
          </div>

          {(wordNotes.length > 0 || explanation) && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-3">
              <p className="text-xs font-medium text-blue-900">
                Notas del Profe Kyle:
              </p>
              {wordNotes.length > 0
                ? wordNotes.map((item) => (
                    <div key={item.word}>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.word}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.note}
                      </p>
                    </div>
                  ))
                : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {explanation}
                    </p>
                  )}
            </div>
          )}

          <button
            onClick={handleRetry}
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-11"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </section>
  );
}
