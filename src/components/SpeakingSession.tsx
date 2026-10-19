"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import BackLink from "@/components/BackLink";
import {
  MAX_AUDIO_SECONDS,
  MIN_AUDIO_SECONDS,
  NUDGE_SECONDS,
  SPEAKING_PROMPT,
} from "@/lib/pronunciation/speakingFeedbackConfig";
import type { SpeakingAttemptView } from "@/lib/speakingAttempts";

type Phase = "idle" | "recording" | "processing" | "short" | "error";

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.min(MAX_AUDIO_SECONDS, Math.floor(seconds)));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function remainingCopy(remaining: number | null): string | null {
  if (remaining === null || remaining >= 3) return null;
  if (remaining === 2) return "Te quedan dos intentos hoy.";
  if (remaining === 1) return "Te queda un intento hoy.";
  return "Ya usaste los intentos de hoy. Mañana puedes volver.";
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function encodeMonoWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const length = Math.ceil(decoded.duration * 16000);
    const offline = new OfflineAudioContext(1, length, 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeMonoWav(rendered.getChannelData(0), 16000);
  } finally {
    await context.close();
  }
}

function FeedbackCard({
  attempt,
  showCounts,
}: {
  attempt: SpeakingAttemptView;
  showCounts: boolean;
}) {
  const card = attempt.feedback;
  if (!card) return null;

  return (
    <article className="rounded-card border border-paper-line bg-surface px-5 py-6">
      <h2 className="text-headline-md text-text-primary">Lo que escuché</h2>
      <p lang="en" className="mt-3 max-w-[65ch] text-story-body text-text-primary">
        {card.transcript}
      </p>

      {showCounts &&
      attempt.aggregate &&
      attempt.aggregate.patterns.length > 0 &&
      card.patterns.length === 0 ? (
        <section className="mt-8">
          <h3 className="text-headline-md text-text-primary">Pronunciación</h3>
          <ul className="mt-4 grid gap-3">
            {attempt.aggregate.patterns.map((pattern) => (
              <li key={pattern.ipaDisplay} className="text-label-sm text-text-muted">
                Interno: /{pattern.ipaDisplay}/ {pattern.instanceCount} veces, promedio{" "}
                {pattern.avgAccuracy}. {pattern.exampleWords.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {card.patterns.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-headline-md text-text-primary">Pronunciación</h3>
          <ul className="mt-4 grid gap-6">
            {card.patterns.map((pattern) => {
              const counts = showCounts
                ? attempt.aggregate?.patterns.find(
                    (item) => item.ipaDisplay === pattern.ipa
                  )
                : undefined;
              return (
                <li key={`${pattern.name}-${pattern.ipa ?? ""}`}>
                  <p className="text-body-main text-text-primary">
                    {pattern.name}
                    {pattern.ipa ? (
                      <span lang="en" className="ml-2 font-mono text-text-secondary">
                        /{pattern.ipa}/
                      </span>
                    ) : null}
                  </p>
                  {pattern.examples.length > 0 ? (
                    <p lang="en" className="mt-1 text-body-main text-text-secondary">
                      {pattern.examples.join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-2 max-w-[65ch] text-body-main text-text-primary">
                    {pattern.tip}
                  </p>
                  {counts ? (
                    <p className="mt-2 text-label-sm text-text-muted">
                      Interno: {counts.instanceCount} veces, promedio {counts.avgAccuracy}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {showCounts && attempt.aggregate && attempt.aggregate.mangledWords.length > 0 ? (
            <p lang="en" className="mt-4 text-label-sm text-text-muted">
              Interno, palabras rotas: {attempt.aggregate.mangledWords.join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {card.grammarFixes.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-headline-md text-text-primary">Gramática</h3>
          <ul className="mt-4 grid gap-5">
            {card.grammarFixes.map((fix) => (
              <li key={`${fix.heard}-${fix.corrected}`}>
                <p lang="en" className="text-body-main text-text-secondary">
                  {fix.heard}
                </p>
                <p lang="en" className="mt-1 text-body-main text-text-primary">
                  {fix.corrected}
                </p>
                <p className="mt-1 text-body-main text-text-secondary">{fix.rule}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.vocabularyTip ? (
        <section className="mt-8">
          <h3 className="text-headline-md text-text-primary">Vocabulario</h3>
          <p lang="en" className="mt-3 text-body-main text-text-secondary">
            {card.vocabularyTip.heard}
          </p>
          <p lang="en" className="mt-1 text-body-main text-text-primary">
            {card.vocabularyTip.better}
          </p>
          <p className="mt-1 text-body-main text-text-secondary">
            {card.vocabularyTip.why}
          </p>
        </section>
      ) : null}

      <p className="mt-8 max-w-[65ch] text-body-main text-text-primary">
        {card.closingLine}
      </p>
    </article>
  );
}

export default function SpeakingSession({
  owner,
  backHref,
  initialAttempts,
  initialRemaining,
}: {
  owner: boolean;
  backHref: string;
  initialAttempts: SpeakingAttemptView[];
  initialRemaining: number | null;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [nudge, setNudge] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [attempts, setAttempts] = useState(initialAttempts);
  const barsRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  function paintLevels(analyser: AnalyserNode) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = barsRef.current?.children;
      if (bars) {
        for (let index = 0; index < bars.length; index += 1) {
          const bar = bars[index] as HTMLElement;
          const value = data[index] ?? 0;
          const height = reduce ? 8 : 8 + Math.round((value / 255) * 28);
          bar.style.transform = `scaleY(${height / 36})`;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  async function send(blob: Blob, filename: string, durationS: number) {
    const body = new FormData();
    body.set("audio", blob, filename);
    body.set("durationS", String(durationS));
    const response = await fetch("/api/speaking-feedback", {
      method: "POST",
      body,
    });
    const payload = (await response.json()) as {
      error?: string;
      code?: string;
      attempt?: SpeakingAttemptView;
      remaining?: number | null;
    };
    if (!response.ok || !payload.attempt) {
      const error = new Error(payload.error || "Algo salió mal. Intenta de nuevo.");
      (error as Error & { code?: string }).code = payload.code;
      throw error;
    }
    return payload;
  }

  async function upload(blob: Blob, mime: string, durationS: number) {
    setPhase("processing");
    setMessage(null);
    const extension = mime.includes("mp4") ? "m4a" : mime.includes("wav") ? "wav" : "webm";
    try {
      let result: Awaited<ReturnType<typeof send>>;
      try {
        result = await send(blob, `speaking.${extension}`, durationS);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        if (code !== "FFMPEG_FAILED") throw error;
        const wav = await blobToWav(blob);
        result = await send(wav, "speaking.wav", durationS);
      }
      setAttempts((current) => [result.attempt!, ...current.filter((item) => item.id !== result.attempt!.id)]);
      if (typeof result.remaining !== "undefined") setRemaining(result.remaining);
      setPhase("idle");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Algo salió mal. Intenta de nuevo."
      );
      setPhase("error");
    }
  }

  function releaseStream() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    timerRef.current = null;
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  stopRef.current = finishRecording;

  async function startRecording() {
    if (phase === "recording" || phase === "processing") return;
    if (remaining === 0) return;
    setMessage(null);
    setNudge(false);
    const mime = pickMime();
    if (!mime) {
      setMessage("Este navegador no puede grabar audio. Prueba en Chrome o Safari.");
      setPhase("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMessage("Necesito el micrófono para escucharte. Actívalo e intenta otra vez.");
      setPhase("error");
      return;
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = context;
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const durationS = (performance.now() - startedAt.current) / 1000;
      const blob = new Blob(chunksRef.current, { type: mime });
      releaseStream();
      setElapsed(durationS);
      if (durationS < MIN_AUDIO_SECONDS) {
        setPhase("short");
        setMessage("Muy corto. Cuéntame un poco más e intenta otra vez.");
        return;
      }
      void upload(blob, mime, durationS);
    };

    startedAt.current = performance.now();
    setElapsed(0);
    setPhase("recording");
    recorder.start();
    paintLevels(analyser);
    timerRef.current = window.setInterval(() => {
      const seconds = (performance.now() - startedAt.current) / 1000;
      setElapsed(seconds);
      if (seconds >= NUDGE_SECONDS) setNudge(true);
      if (seconds >= MAX_AUDIO_SECONDS) stopRef.current();
    }, 200);
  }

  const capped = remaining === 0;
  const recording = phase === "recording";
  const busy = phase === "processing";
  const latest = attempts.find((attempt) => attempt.feedback) ?? null;
  const clock = formatClock(elapsed);

  return (
    <section
      lang="es"
      className="mx-auto w-full max-w-2xl px-4 pt-2 pb-16 selection:bg-accent-soft"
    >
      <BackLink href={backHref} label="Inicio" showLabel />
      <h1 className="mt-8 text-headline-lg text-balance text-text-primary">
        Cuéntame de esa persona
      </h1>
      <p
        lang="en"
        className="mt-4 max-w-[65ch] text-story-body text-text-secondary"
      >
        {SPEAKING_PROMPT}
      </p>

      <div className="mt-10 flex flex-col items-center">
        <p
          className="text-label-md text-text-secondary tabular-nums"
          aria-live="polite"
        >
          {clock}
        </p>
        <div
          className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-paper-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={MAX_AUDIO_SECONDS}
          aria-valuenow={Math.floor(elapsed)}
          aria-label="Tiempo de la grabación"
        >
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(100, (elapsed / MAX_AUDIO_SECONDS) * 100)}%` }}
          />
        </div>
        {recording ? (
          <div
            ref={barsRef}
            className="mt-6 flex h-9 items-center gap-1"
            aria-hidden="true"
          >
            {Array.from({ length: 24 }, (_, index) => (
              <span
                key={index}
                className="block h-9 w-1 origin-center rounded-full bg-accent"
                style={{ transform: "scaleY(0.22)" }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 h-9" aria-hidden="true" />
        )}
        <button
          type="button"
          className="mt-6 flex size-16 items-center justify-center rounded-full bg-accent text-white transition-transform duration-200 ease-out hover:bg-accent-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60"
          aria-pressed={recording}
          aria-label={recording ? "Detener" : "Grabar"}
          disabled={busy || capped}
          onClick={() => {
            if (recording) finishRecording();
            else void startRecording();
          }}
        >
          {recording ? (
            <Square className="size-5 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="size-6" aria-hidden="true" />
          )}
        </button>
        <p className="mt-4 text-center text-label-md text-text-muted">
          {busy
            ? "Estoy escuchando."
            : nudge && recording
              ? "Sigue. Un poco más ayuda."
              : "Al menos quince segundos."}
        </p>
        {remainingCopy(remaining) ? (
          <p className="mt-2 text-center text-label-md text-text-secondary">
            {remainingCopy(remaining)}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 max-w-[40ch] text-center text-body-main text-text-primary" role="status">
            {message}
          </p>
        ) : null}
      </div>

      {busy ? (
        <div className="mt-10 rounded-card border border-paper-line bg-surface px-5 py-6" aria-hidden="true">
          <div className="h-6 w-40 animate-pulse rounded-small bg-paper-line motion-reduce:animate-none" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-small bg-paper-line motion-reduce:animate-none" />
          <div className="mt-2 h-4 w-4/5 animate-pulse rounded-small bg-paper-line motion-reduce:animate-none" />
        </div>
      ) : null}

      {latest && !busy ? (
        <div className="mt-10">
          <FeedbackCard attempt={latest} showCounts={owner} />
          {latest.playbackUrl ? (
            <audio className="mt-4 w-full" controls src={latest.playbackUrl} preload="none" />
          ) : null}
        </div>
      ) : null}

      {owner && attempts.length > 1 ? (
        <section className="mt-12">
          <h2 className="text-headline-md text-text-primary">Intentos</h2>
          <ul className="mt-4 divide-y divide-paper-line">
            {attempts.slice(1).map((attempt) => (
              <li key={attempt.id} className="py-6">
                <p className="text-label-sm text-text-muted">
                  {new Intl.DateTimeFormat("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Mexico_City",
                  }).format(new Date(attempt.createdAt))}
                </p>
                {attempt.playbackUrl ? (
                  <audio className="mt-3 w-full" controls src={attempt.playbackUrl} preload="none" />
                ) : null}
                {attempt.feedback ? (
                  <div className="mt-4">
                    <FeedbackCard attempt={attempt} showCounts />
                  </div>
                ) : (
                  <p className="mt-3 text-body-main text-text-secondary">
                    Este audio se guardó, pero la nota no salió.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
