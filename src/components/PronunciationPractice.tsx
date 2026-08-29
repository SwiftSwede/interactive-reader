"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MicroExplanation from "./MicroExplanation";
import PronunciationDebug from "./PronunciationDebug";
import { assessPronunciation } from "@/lib/pronunciation/client";
import type { PronunciationAssessmentResponse } from "@/lib/pronunciation/types";

const MAX_RECORDING_MS = 15000;

function pickSupportedMimeType(): string | undefined {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];
  const recorder = MediaRecorder as typeof MediaRecorder & {
    isTypeSupported?: (mimeType: string) => boolean;
  };
  for (const type of candidates) {
    if (
      typeof recorder.isTypeSupported === "function" &&
      recorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return undefined;
}

function formatSeconds(ms: number): number {
  return Math.max(0, Math.floor(ms / 1000));
}

export default function PronunciationPractice({
  referenceText,
  kyleIpa,
}: {
  referenceText: string;
  kyleIpa?: string;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PronunciationAssessmentResponse | null>(
    null
  );
  const [showDebug, setShowDebug] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startAtRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const mimeType = useMemo(() => pickSupportedMimeType(), []);
  const [recorderSupported, setRecorderSupported] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowDebug(params.get("debug") === "1");
    setRecorderSupported(
      "MediaRecorder" in window &&
        typeof navigator.mediaDevices?.getUserMedia === "function"
    );
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (!isRecording) return;
    const handle = window.setInterval(() => {
      if (startAtRef.current == null) return;
      setElapsedMs(Date.now() - startAtRef.current);
    }, 100);
    return () => window.clearInterval(handle);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current != null) {
        window.clearTimeout(stopTimerRef.current);
      }
      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
    };
  }, []);

  const stopStream = () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    setPermissionDenied(false);
    setAudioBlob(null);
    setResult(null);
    if (audioUrl) setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startAtRef.current = Date.now();
      setElapsedMs(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError("No pude grabar. Recarga la pagina e intenta de nuevo.");
        setIsRecording(false);
        stopStream();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        startAtRef.current = null;
        setElapsedMs(0);
        mediaRecorderRef.current = null;
        stopStream();
        if (stopTimerRef.current != null) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      stopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_MS);
    } catch (caught) {
      const name =
        caught && typeof caught === "object" && "name" in caught
          ? String((caught as { name: string }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionDenied(true);
        setError(
          "Necesito el microfono para esto. Dale permiso en el navegador y vuelve a intentar."
        );
      } else {
        setError("No pude abrir el microfono. Intenta de nuevo.");
      }
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  const handleRetry = () => {
    setAudioBlob(null);
    if (audioUrl) setAudioUrl(null);
    setError(null);
    setPermissionDenied(false);
    setElapsedMs(0);
    setResult(null);
  };

  const handleAssess = async () => {
    if (!audioBlob || isRecording || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const data = await assessPronunciation({
        audioBlob,
        referenceText,
      });
      setResult(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Algo salio mal. Intenta de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        Practica tu pronunciacion
      </h3>

      <MicroExplanation text="Esto no es un examen. Graba la oracion, escuchate, y vuelve a intentar. El oido y la boca se entrenan juntos." />

      <p className="text-sm text-gray-500 mb-3">Lee esta oracion en voz alta:</p>
      <p className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-gray-900 font-medium leading-relaxed">
        {referenceText}
      </p>

      {!recorderSupported ? (
        <p className="mt-4 text-sm text-gray-600">
          Este navegador no deja grabar audio. Prueba en Chrome o Safari en tu
          celular.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {isRecording && (
            <p className="text-sm text-red-600" aria-live="polite">
              Grabando... {formatSeconds(elapsedMs)}s /{" "}
              {formatSeconds(MAX_RECORDING_MS)}s
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-11 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {audioBlob ? "Grabar otra vez" : "Empezar a grabar"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:bg-black transition-colors min-h-11"
              >
                Parar
              </button>
            )}

            {audioBlob && !isRecording && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-11 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Borrar grabacion
              </button>
            )}
          </div>

          {audioUrl && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 mb-2">Tu grabacion:</p>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}

          {audioBlob && !isRecording && (
            <button
              type="button"
              onClick={() => void handleAssess()}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:bg-black transition-colors min-h-11 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Revisando..." : "Revisar pronunciacion"}
            </button>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="text-sm text-gray-800">{error}</p>
              <button
                type="button"
                onClick={() =>
                  permissionDenied ? void startRecording() : void handleAssess()
                }
                disabled={isSubmitting || (permissionDenied ? false : !audioBlob)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium min-h-11 disabled:opacity-40"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {result && (
            <PronunciationDebug
              result={result}
              kyleIpa={kyleIpa}
              debug={showDebug}
            />
          )}
        </div>
      )}
    </section>
  );
}
