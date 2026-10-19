"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import LessonHeader from "@/components/lesson/LessonHeader";
import ActionButton from "@/components/ActionButton";
import { SeekBar } from "@/components/StickyNowPlaying";
import { completeIploAttempt } from "@/app/lesson/[slug]/iplo-actions";
import { answersMatch } from "@/lib/drills";
import {
  IPLO_BACK_SECONDS,
  IPLO_FEEDBACK_HOLD_MS,
  calendarDateKey,
  clampSeek,
  confirmationAfter,
  englishOnScreen,
  karaokePieces,
  lessonVocabulary,
  promptAnswerAt,
  promptInputAt,
  promptLeadText,
  promptQuestionText,
  promptRefs,
  resolveTimeZone,
  savedProgressIsStale,
  subtitleAt,
  type IploScript,
  type IploSegment,
  type KaraokePiece,
} from "@/lib/iplo";
import type { CourseLevel } from "@/types";
import type { LessonViewToggle } from "@/lib/student-preview";

type StoredAnswer = { given: string; correct: boolean };

type Feedback = {
  index: number;
  correct: boolean;
  model: string;
  until: number;
  audioEnd: number;
  withLine: boolean;
};

function segmentAt(segments: IploSegment[], time: number): IploSegment | null {
  let current: IploSegment | null = null;
  for (const segment of segments) {
    if (segment.start <= time + 0.02) current = segment;
    else break;
  }
  if (!current) return null;
  const next = segments[segments.indexOf(current) + 1];
  if (next && time >= next.start) return next;
  return current;
}

function storageKey(storyId: string, day: string) {
  return `iplo:${storyId}:${day}`;
}

type SavedProgress = {
  time?: number;
  answers?: Record<number, StoredAnswer>;
  skipped?: number[];
  seedVersion?: string;
};

function readSavedProgress(raw: string | null, scriptVersion: string | undefined): SavedProgress | "stale" | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedProgress;
    if (savedProgressIsStale(saved.seedVersion, scriptVersion)) return "stale";
    return saved;
  } catch {
    return "stale";
  }
}

export default function AudioCoursePlayer({
  storyId,
  title,
  level,
  script,
  completedOnce,
  dayMarks,
  closingLine,
  writes,
  isTeacher,
  previewLevel,
  viewToggle,
}: {
  storyId: string;
  title: string;
  level: string;
  script: IploScript;
  completedOnce: boolean;
  dayMarks: string[];
  closingLine: boolean;
  writes: boolean;
  isTeacher: boolean;
  previewLevel: CourseLevel | null;
  viewToggle: LessonViewToggle | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);
  const heldRef = useRef<Set<number>>(new Set());
  const skippedRef = useRef<Set<number>>(new Set());
  const answersRef = useRef<Record<number, StoredAnswer>>({});
  const finishing = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  // Seeking an audio element before its metadata arrives (readyState 0) can
  // wedge it permanently: paused=false, currentTime frozen, no fetch, no error.
  // Always defer the seek until loadedmetadata when data has not arrived.
  function applySeek(audio: HTMLAudioElement, time: number) {
    if (audio.readyState >= 1) {
      audio.currentTime = time;
      return;
    }
    const apply = () => {
      audio.removeEventListener("loadedmetadata", apply);
      audio.currentTime = time;
    };
    audio.addEventListener("loadedmetadata", apply, { once: true });
  }

  const zone = useMemo(
    () => resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    []
  );
  const today = useMemo(() => calendarDateKey(zone, new Date()), [zone]);
  const prompts = useMemo(() => promptRefs(script), [script]);
  const vocabulary = useMemo(() => lessonVocabulary(script), [script]);

  const [blocked, setBlocked] = useState(() => {
    if (!writes) return false;
    return dayMarks.some(
      (mark) => calendarDateKey(zone, new Date(mark)) === today
    );
  });
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(script.durationSeconds);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [answers, setAnswers] = useState<Record<number, StoredAnswer>>({});
  const [done, setDone] = useState(false);
  const [doneLine, setDoneLine] = useState(closingLine);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!writes || blocked) return;
    try {
      const key = storageKey(storyId, today);
      const raw = sessionStorage.getItem(key);
      const saved = readSavedProgress(raw, script.seedVersion);
      if (saved === "stale") {
        sessionStorage.removeItem(key);
        return;
      }
      if (!saved) return;
      if (saved.answers) {
        setAnswers(saved.answers);
        answersRef.current = saved.answers;
      }
      if (saved.skipped) skippedRef.current = new Set(saved.skipped);
      if (typeof saved.time === "number") {
        // NEVER seek on load: seeking an audio element before its data arrives
        // can leave it frozen (paused=false, readyState 0, no fetch) and the
        // student hears silence while the UI says playing. Apply the saved
        // position when the user presses play instead.
        pendingSeekRef.current = saved.time;
        setTime(saved.time);
      }
    } catch {
      sessionStorage.removeItem(storageKey(storyId, today));
    }
  }, [blocked, script.seedVersion, storyId, today, writes]);

  useEffect(() => {
    if (feedback || !endedRef.current) return;
    void finish();
  }, [feedback]);

  useEffect(() => {
    if (!feedback) return;
    const wait = Math.max(0, feedback.until - Date.now());
    const id = window.setTimeout(() => {
      const audio = audioRef.current;
      const audioDone =
        !audio || audio.ended || audio.currentTime >= feedback.audioEnd - 0.05;
      if (audioDone) setFeedback(null);
    }, wait);
    return () => window.clearTimeout(id);
  }, [feedback]);

  useEffect(() => {
    if (blocked || done) {
      document.body.classList.remove("sticky-audio-active");
      return;
    }
    document.body.classList.add("sticky-audio-active");
    return () => document.body.classList.remove("sticky-audio-active");
  }, [blocked, done]);

  function persist(nextAnswers: Record<number, StoredAnswer>, nextTime: number) {
    if (!writes) return;
    sessionStorage.setItem(
      storageKey(storyId, today),
      JSON.stringify({
        time: nextTime,
        answers: nextAnswers,
        skipped: [...skippedRef.current],
        ...(script.seedVersion ? { seedVersion: script.seedVersion } : {}),
      })
    );
  }

  function pauseFor(index: number) {
    const audio = audioRef.current;
    const ref = prompts.find((item) => item.index === index);
    if (!audio || !ref) return;
    // Never seek forward to the pause. A jump lands in the gap and cuts off
    // the question the student is still hearing.
    if (audio.currentTime + 0.08 < promptAnswerAt(ref.prompt)) {
      return;
    }
    audio.pause();
    heldRef.current.add(index);
    setActiveIndex(index);
    setTime(audio.currentTime);
    setPlaying(false);
  }

  function resumeAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    // apply a saved-position seek only once data exists (play gesture), never
    // at load time - a load-time seek can wedge the element with no data
    if (pendingSeekRef.current != null) {
      applySeek(audio, pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
    void audio.play();
  }

  function considerPause(now: number) {
    if (feedback || done) return;
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    for (const ref of prompts) {
      if (skippedRef.current.has(ref.index)) continue;
      if (heldRef.current.has(ref.index)) continue;
      if (now + 0.05 < promptAnswerAt(ref.prompt)) continue;
      pauseFor(ref.index);
      return;
    }
  }

  function waitingForAnswer() {
    return activeIndex != null && !answersRef.current[activeIndex];
  }

  function onSeek(target: number) {
    const audio = audioRef.current;
    if (!audio || feedback) return;
    const current = audio.currentTime;
    if (waitingForAnswer() && target > current + 0.05) return;
    // Teacher auditing their own course seeks freely (no wall, passed prompts
    // marked skipped in-memory so they don't trigger pauses); students keep the
    // wall on first runs and the free seek on replays.
    const freeSeek = completedOnce || isTeacher;
    const next = clampSeek({
      target,
      current,
      completedOnce: freeSeek,
      prompts: prompts.map((ref) => ({
        pauseAt: promptAnswerAt(ref.prompt),
        answered: Boolean(answersRef.current[ref.index]),
      })),
    });
    if (freeSeek && next > current + 0.05) {
      for (const ref of prompts) {
        if (
          promptAnswerAt(ref.prompt) > current + 0.05 &&
          promptAnswerAt(ref.prompt) <= next + 0.02 &&
          !answersRef.current[ref.index]
        ) {
          skippedRef.current.add(ref.index);
        }
      }
    }
    if (next < current - 0.05) {
      for (const ref of prompts) {
        if (promptAnswerAt(ref.prompt) >= next - 0.05) {
          skippedRef.current.delete(ref.index);
          heldRef.current.delete(ref.index);
        }
      }
      setActiveIndex(null);
    }
    applySeek(audio, next);
    setTime(next);
    persist(answersRef.current, next);
  }

  function submit(given: string) {
    if (activeIndex == null) return;
    const ref = prompts.find((item) => item.index === activeIndex);
    const audio = audioRef.current;
    if (!ref || !audio) return;
    if (answersRef.current[ref.index]) return;
    const text = given.trim();
    if (!text) return;
    const correct = answersMatch(ref.prompt.expected, text);
    const next = {
      ...answersRef.current,
      [ref.index]: { given: text, correct },
    };
    answersRef.current = next;
    setAnswers(next);
    const spoken = confirmationAfter(script.segments, ref.index);
    // The feedback hold must never ride over the NEXT prompt's pause: when a
    // prompt lacks its own replay, confirmationAfter grabs the next prompt's
    // replay, and feedback (which suppresses considerPause) then swallowed the
    // next pause - the model answered before the student could write (Kyle QA
    // 2026-10-15, 19:50). Cap the hold at the next prompt's start.
    // Kyle QA 2026-10-18: praise words ("Excelente", "Buen trabajo") narrate
    // between the replay and the next prompt and never got a screen moment
    // because feedback owned the display the whole time. Ratified: end the
    // feedback hold as soon as the next audio begins - the cap is now the
    // start of the next segment of ANY kind, and the praise shows as its
    // normal Spanish caption while it plays.
    const promptSeg = script.segments.find(
      (item) => item.t === "prompt" && item.start === ref.prompt.start
    );
    const afterSpoken = script.segments[
      Math.max(
        script.segments.indexOf(promptSeg ?? script.segments[0]),
        script.segments.findIndex((item) => item === spoken)
      ) + 1
    ];
    const nextPrompt = prompts.find((item) => item.index > ref.index);
    const audioEnd = Math.min(
      spoken?.end ?? ref.prompt.end,
      nextPrompt ? nextPrompt.prompt.start : Infinity,
      afterSpoken ? afterSpoken.start : Infinity
    );
    setFeedback({
      index: ref.index,
      correct,
      model: ref.prompt.expected[0] ?? "",
      until: Date.now() + IPLO_FEEDBACK_HOLD_MS,
      audioEnd,
      withLine: Boolean(spoken),
    });
    setActiveIndex(null);
    persist(next, audio.currentTime);
    void audio.play();
  }

  function continueKnown() {
    const audio = audioRef.current;
    if (!audio || activeIndex == null) return;
    setActiveIndex(null);
    void audio.play();
  }

  async function finish() {
    if (finishing.current || done) return;
    finishing.current = true;
    if (!writes) {
      setDone(true);
      setDoneLine(closingLine);
      return;
    }
    const result = await completeIploAttempt({
      storyId,
      timeZone: zone,
      answers: prompts.map((ref) => ({
        index: ref.index,
        given: answersRef.current[ref.index]?.given ?? "",
        skipped: skippedRef.current.has(ref.index),
      })),
    });
    if (!result.ok && result.blocked) {
      setBlocked(true);
      finishing.current = false;
      return;
    }
    if (!result.ok) {
      setSaveError(result.error);
      finishing.current = false;
      return;
    }
    sessionStorage.removeItem(storageKey(storyId, today));
    setDoneLine(result.closingLine);
    setDone(true);
  }

  const segment = segmentAt(script.segments, time);
  // "Otra vez" is a caption while those words play. The question and the input
  // open when the question starts. The audio keeps going and pauses at pauseAt.
  const writing =
    prompts.find((ref) => {
      if (feedback || done || skippedRef.current.has(ref.index) || answers[ref.index]) return false;
      if (activeIndex === ref.index) return true;
      const openAt = promptInputAt(ref.prompt);
      return time + 0.05 >= openAt && time + 0.02 < ref.prompt.pauseAt;
    }) ?? null;
  const leadCaption =
    writing
      ? null
      : prompts
          .map((ref) => {
            if (skippedRef.current.has(ref.index) || heldRef.current.has(ref.index)) return null;
            if (answers[ref.index]) return null;
            const lead = promptLeadText(ref.prompt.spanish);
            const openAt = promptInputAt(ref.prompt);
            if (openAt <= ref.prompt.start + 0.05) return null;
            if (time + 0.05 < ref.prompt.start || time + 0.02 >= openAt) return null;
            // Repeat leads ("Otra vez") caption just the lead - their question
            // text strips it, so the caption is the only place the lead shows.
            // All other leads (Ahora di/dime, question leads) get NO caption:
            // the prompt card itself opens when the question starts, and a
            // caption would show the same text twice (Kyle QA 2026-10-15:
            // "appears briefly before the prompt then appears again in the
            // prompt. The brief appearance should be deleted.").
            if (lead) return lead;
            return null;
          })
          .find((lead) => lead != null) ?? null;
  const screenLine = leadCaption || writing ? null : englishOnScreen(script.segments, time);
  const caption = leadCaption ?? (screenLine?.kind === "narration" ? subtitleAt(screenLine.segment, time) : null);
  const activePrompt = writing;
  const known = activePrompt ? answers[activePrompt.index] : undefined;
  const showInput = Boolean(activePrompt) && !feedback && !done;

  useEffect(() => {
    setDraft("");
  }, [activePrompt?.index]);

  useEffect(() => {
    if (!showInput || known) return;
    answerRef.current?.focus({ preventScroll: true });
  }, [showInput, known, activePrompt?.index]);

  const chip =
    done || feedback || (segment?.t === "english" && !showInput)
      ? null
      : showInput
        ? "Traduce"
        : "Escucha";

  return (
    <div className="min-h-dvh bg-paper">
      <LessonHeader
        typeLabel="Audio"
        title={title}
        level={level}
        isTeacher={isTeacher}
        previewLevel={previewLevel}
        viewToggle={viewToggle}
      />
      <main className="mx-auto flex w-full max-w-[672px] flex-col px-4 pb-8">
        {blocked ? (
          <p className="px-2 pt-16 text-center text-body-md text-text-secondary">
            Ya practicaste esta lección hoy. Vuelve mañana.
          </p>
        ) : done ? (
          <div className="px-2 pt-16 text-center">
            <p className="font-headline text-headline-lg text-text-primary">
              {doneLine
                ? "Listo. Ya puedes seguir con English for Latinos 1."
                : "Listo."}
            </p>
            {vocabulary.length > 0 ? (
              <div className="mt-10">
                <h2 className="font-headline text-headline-md text-text-primary">Palabras de hoy</h2>
                <p className="mt-2 text-body-main text-text-muted">
                  Escuchaste y usaste estas palabras hoy.
                </p>
                <ul className="mt-6 flex flex-wrap justify-center gap-2">
                  {vocabulary.map((word) => (
                    <li
                      key={word}
                      lang="en"
                      className="rounded-card bg-surface px-3 py-1 text-label-sm text-text-secondary"
                    >
                      {word}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex h-8 items-center justify-center">
              {chip ? (
                <span className="rounded-card bg-surface px-3 py-1 text-label-sm text-text-secondary">
                  {chip}
                </span>
              ) : null}
            </div>
            <div className="flex min-h-[40dvh] flex-col items-center pt-[20dvh]">
              {audioError ? (
                <div className="text-center">
                  <p className="text-body-md text-text-secondary">
                    No pude cargar el audio. Intenta de nuevo.
                  </p>
                  <button
                    type="button"
                    className="mt-4 min-h-12 rounded-card bg-accent px-4 text-label-md text-white"
                    onClick={() => {
                      setAudioError(false);
                      audioRef.current?.load();
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              ) : showInput && activePrompt ? (
                <div className="mx-auto w-full max-w-md">
                  <p className="text-center font-story text-story-body text-text-primary" lang="es">
                    {promptQuestionText(activePrompt.prompt.spanish)}
                  </p>
                  {known ? (
                    <div className="mt-6">
                      <ResultLine correct={known.correct} model={activePrompt.prompt.expected[0] ?? ""} />
                      <div className="mt-6 flex justify-end">
                        <ActionButton className="min-h-12 px-5" onClick={continueKnown}>
                          Seguir
                        </ActionButton>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="mt-6 text-left"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submit(draft);
                      }}
                    >
                      <label htmlFor="iplo-answer" className="text-label-sm text-text-secondary">
                        En inglés
                      </label>
                      <input
                        ref={answerRef}
                        id="iplo-answer"
                        value={draft}
                        autoFocus
                        onChange={(event) => setDraft(event.target.value)}
                        autoComplete="off"
                        autoCapitalize="off"
                        className="mt-2 h-12 w-full rounded-card border border-paper-line bg-surface px-3 text-body-md text-text-primary outline-none focus:border-2 focus:border-accent"
                      />
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          className="min-h-11 px-2 text-label-sm text-text-muted"
                          onClick={() => submit("No sé")}
                        >
                          No sé
                        </button>
                        <ActionButton
                          type="submit"
                          className="min-h-12 px-5"
                          disabled={!draft.trim()}
                        >
                          Enviar
                        </ActionButton>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {caption ? (
                    <p className="max-w-[18rem] text-center text-body-main text-text-primary" lang="es">
                      {caption}
                    </p>
                  ) : screenLine?.kind === "english" ? (
                    <KaraokeLine
                      pieces={karaokePieces(screenLine.segment.text, screenLine.segment.words, time)}
                      lang="en"
                      className="max-w-[22rem] text-center font-headline text-headline-lg text-text-primary"
                    />
                  ) : null}
                  {feedback && (screenLine?.kind === "english" || !feedback.withLine) ? (
                    <ResultLine correct={feedback.correct} model={feedback.model} />
                  ) : null}
                </div>
              )}
              {saveError ? (
                <div className="mt-6 text-center">
                  <p className="text-body-md text-text-secondary">{saveError}</p>
                  <button
                    type="button"
                    className="mt-4 min-h-12 rounded-card bg-accent px-4 text-label-md text-white"
                    onClick={() => {
                      finishing.current = false;
                      void finish();
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>

      {!blocked && !done ? (
        <div className="sticky-audio-player" role="region" aria-label={playing ? "Reproduciendo" : "Audio pausado"}>
          <div className="sticky-audio-player-bar">
            <SeekBar currentTime={time} duration={duration} onSeek={onSeek} compact />
            <div className="sticky-audio-player-controls">
              <div className="sticky-audio-player-controls-slot" aria-hidden="true" />
              <div className="sticky-audio-player-transport">
                <button
                  type="button"
                  className="audio-skip-btn"
                  onClick={() =>
                    onSeek(Math.max(0, (audioRef.current?.currentTime ?? time) - IPLO_BACK_SECONDS))
                  }
                  aria-label="Retroceder 15 segundos"
                  disabled={Boolean(feedback)}
                >
                  <SkipBack size={16} aria-hidden="true" />
                  <span className="text-label-sm">15s</span>
                </button>
                <button
                  type="button"
                  className="sticky-audio-player-toggle disabled:opacity-40"
                  aria-label={playing ? "Pausar" : "Reproducir"}
                  disabled={waitingForAnswer() || Boolean(feedback)}
                  onClick={() => {
                    const audio = audioRef.current;
                    if (!audio || feedback || waitingForAnswer()) return;
                    if (audio.paused) resumeAudio();
                    else audio.pause();
                  }}
                >
                  {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="audio-skip-btn"
                  onClick={() =>
                    onSeek((audioRef.current?.currentTime ?? time) + IPLO_BACK_SECONDS)
                  }
                  aria-label="Adelantar 15 segundos"
                  disabled={Boolean(feedback) || waitingForAnswer()}
                >
                  <span className="text-label-sm">15s</span>
                  <SkipForward size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="sticky-audio-player-controls-slot" aria-hidden="true" />
            </div>
          </div>
        </div>
      ) : null}

      <audio
        ref={audioRef}
        src={script.seedVersion ? `${script.audioUrl}?v=${encodeURIComponent(script.seedVersion)}` : script.audioUrl}
        preload="auto"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        onLoadedMetadata={(event) => {
          const node = event.currentTarget;
          setDuration(node.duration || script.durationSeconds);
          if (writes) {
            try {
              const key = storageKey(storyId, today);
              const saved = readSavedProgress(sessionStorage.getItem(key), script.seedVersion);
              if (saved === "stale") {
                sessionStorage.removeItem(key);
                pendingSeekRef.current = null;
                return;
              }
              if (saved && typeof saved.time === "number" && saved.time > 0) {
                pendingSeekRef.current = saved.time;
                setTime(saved.time);
              }
            } catch {
              sessionStorage.removeItem(storageKey(storyId, today));
            }
          }
        }}
        onPlay={(event) => {
          if (waitingForAnswer()) {
            event.currentTarget.pause();
            return;
          }
          endedRef.current = false;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onSeeked={(event) => {
          setTime(event.currentTarget.currentTime);
        }}
        onTimeUpdate={(event) => {
          const now = event.currentTarget.currentTime;
          setTime(now);
          if (feedback) {
            const audioDone = now >= feedback.audioEnd - 0.05;
            if (audioDone && Date.now() >= feedback.until) setFeedback(null);
            return;
          }
          considerPause(now);
        }}
        onEnded={() => {
          setPlaying(false);
          endedRef.current = true;
          if (feedback || activeIndex != null) return;
          void finish();
        }}
      />
    </div>
  );
}

function KaraokeLine({
  pieces,
  lang,
  className,
}: {
  pieces: KaraokePiece[];
  lang: "en" | "es";
  className: string;
}) {
  return (
    <p className={className} lang={lang}>
      {pieces.map((piece, index) => (
        <span
          key={`${index}-${piece.piece}`}
          className={
            piece.active
              ? "rounded-sm bg-accent-soft text-text-primary transition-[background-color,color] duration-200 motion-reduce:transition-none"
              : undefined
          }
        >
          {piece.piece}
        </span>
      ))}
    </p>
  );
}

function ResultLine({ correct, model }: { correct: boolean; model: string }) {
  if (correct) {
    return (
      <p className="flex items-center justify-center gap-2 text-body-md text-success" aria-live="polite">
        <Check size={18} aria-hidden="true" />
        Esa sí.
      </p>
    );
  }
  return (
    <p className="flex items-center justify-center gap-2 text-center text-body-md text-text-secondary" aria-live="polite">
      <X size={18} aria-hidden="true" />
      <span>
        Era: <span lang="en">{model}</span>
      </span>
    </p>
  );
}
