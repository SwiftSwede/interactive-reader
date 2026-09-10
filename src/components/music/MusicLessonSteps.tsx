"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import BackLink from "@/components/BackLink";
import RecordingBanner from "@/components/lesson/RecordingBanner";
import ClassroomYoutubePlayer from "@/components/ClassroomYoutubePlayer";
import EndClassButton from "@/components/EndClassButton";
import SongBio from "@/components/music/SongBio";
import SongBlanksWorksheet from "@/components/music/SongBlanksWorksheet";
import SongLyricsMeaning from "@/components/music/SongLyricsMeaning";
import SongTruquitosKaraoke from "@/components/music/SongTruquitosKaraoke";
import { PlaybackRateProvider } from "@/components/PlaybackRateContext";
import { createClient } from "@/lib/supabase/client";
import { getSessionPhase } from "@/lib/session-phase";
import { recordStoryOpened } from "@/app/lesson/[slug]/actions";
import {
  initMusicLessonPacing,
  saveSongClassAnswers,
  setMusicLessonStep,
  toggleMusicStepLock,
} from "@/app/teacher/music-pacing-actions";
import {
  decodeMusicStep,
  musicStepIndex,
  musicStepList,
  parseLyricBlanks,
  parseSongClassAnswers,
  serializeSongClassAnswers,
} from "@/lib/music";
import { youtubeEmbedId } from "@/lib/youtube-sync";
import type { LoadedStory } from "@/lib/stories";
import type { SavedSongAttempt } from "@/lib/services/songAttempts";
import type { WordFlagging } from "@/types";

export default function MusicLessonSteps({
  data,
  allowReveal = true,
  sessionId,
  trackLookups = false,
  readerMode = "open",
  isTeacher = false,
  recordingYoutubeUrl = null,
  sessionStartTime = null,
  sessionEndTime = null,
  classEndedAt: initialEndedAt = null,
  flagging,
  savedAttempts = [],
  lessonStepCurrent: initialStep = null,
  lessonStepLocked: initialLocked = false,
  answersRevealed: initialRevealed = false,
  songClassAnswers: initialClassAnswers = {},
}: {
  data: LoadedStory;
  allowReveal?: boolean;
  sessionId?: string;
  trackLookups?: boolean;
  readerMode?: "classroom-live" | "classroom-review" | "open";
  isTeacher?: boolean;
  recordingYoutubeUrl?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  classEndedAt?: string | null;
  flagging?: WordFlagging;
  savedAttempts?: SavedSongAttempt[];
  lessonStepCurrent?: string | null;
  lessonStepLocked?: boolean;
  answersRevealed?: boolean;
  songClassAnswers?: Record<number, string>;
}) {
  const { story, words, bioWords, expressions } = data;
  const steps = useMemo(() => musicStepList(story), [story]);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!initialStep) return 0;
    return musicStepIndex(decodeMusicStep(initialStep, story), story);
  });
  const [classEndedAt, setClassEndedAt] = useState(initialEndedAt);
  const [now, setNow] = useState(() => Date.now());
  const [classStep, setClassStep] = useState<string | null>(initialStep);
  const [locked, setLocked] = useState(initialLocked);
  const [answersRevealed, setAnswersRevealed] = useState(initialRevealed);
  const [classAnswers, setClassAnswers] = useState(initialClassAnswers);
  const initRef = useRef(false);
  const classAnswersRef = useRef(classAnswers);
  const classSaveTimer = useRef<number | null>(null);
  classAnswersRef.current = classAnswers;

  const live =
    readerMode !== "open" &&
    Boolean(sessionStartTime) &&
    Boolean(sessionEndTime) &&
    getSessionPhase(
      {
        sessionStartTime: sessionStartTime as string,
        sessionEndTime: sessionEndTime as string,
        classEndedAt,
      },
      new Date(now)
    ) === "live";
  const youtubeLive = live && Boolean(sessionId);
  const studentLive = live && !isTeacher;

  const classIndex = useMemo(() => {
    if (!classStep) return 0;
    return musicStepIndex(decodeMusicStep(classStep, story), story);
  }, [classStep, story]);

  const safeIndex = Math.max(
    0,
    Math.min(
      studentLive && locked ? Math.min(activeIndex, classIndex) : activeIndex,
      Math.max(0, steps.length - 1)
    )
  );
  const active = steps[safeIndex];
  const prev = safeIndex > 0 ? steps[safeIndex - 1] : null;
  const canForward = !(studentLive && locked && safeIndex >= classIndex);
  const next =
    canForward && safeIndex < steps.length - 1 ? steps[safeIndex + 1] : null;
  const forwardBlocked =
    studentLive && locked && safeIndex >= classIndex && safeIndex < steps.length - 1;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active?.id]);

  useEffect(() => {
    void recordStoryOpened({ storyId: story.id });
  }, [story.id]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sessionId || readerMode === "open") return;
    const supabase = createClient();
    const apply = (row: {
      class_ended_at?: string | null;
      lesson_step_current?: string | null;
      lesson_step_locked?: boolean | null;
      answers_revealed?: boolean | null;
      song_class_answers?: unknown;
    }) => {
      if (row.class_ended_at) setClassEndedAt(row.class_ended_at);
      if ("lesson_step_current" in row) {
        setClassStep(row.lesson_step_current ?? null);
      }
      if ("lesson_step_locked" in row) {
        setLocked(Boolean(row.lesson_step_locked));
      }
      if ("answers_revealed" in row) {
        setAnswersRevealed(Boolean(row.answers_revealed));
      }
      if (!isTeacher && "song_class_answers" in row) {
        setClassAnswers(parseSongClassAnswers(row.song_class_answers));
      }
    };
    const channel = supabase
      .channel(`story-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "course_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => apply(payload.new as never)
      )
      .subscribe();
    const poll = window.setInterval(async () => {
      const { data: row } = await supabase
        .from("course_sessions")
        .select(
          "class_ended_at, lesson_step_current, lesson_step_locked, answers_revealed, song_class_answers"
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (row) apply(row);
    }, 3000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, readerMode, isTeacher]);

  useEffect(() => {
    if (!studentLive || !locked || !classStep) return;
    const index = musicStepIndex(decodeMusicStep(classStep, story), story);
    setActiveIndex(index);
  }, [studentLive, locked, classStep, story]);

  useEffect(() => {
    if (!isTeacher || !live || !sessionId || initRef.current) return;
    if (classStep) return;
    initRef.current = true;
    void initMusicLessonPacing(sessionId).then((result) => {
      if (!result.ok) {
        initRef.current = false;
        return;
      }
      setClassStep(result.lessonStepCurrent);
      setLocked(result.lessonStepLocked);
    });
  }, [isTeacher, live, sessionId, classStep]);

  const goTo = (index: number) => {
    if (studentLive && locked && index > classIndex) return;
    setActiveIndex(index);
  };

  function goWithClass(index: number) {
    if (index < 0 || index >= steps.length) return;
    setActiveIndex(index);
    if (!isTeacher || !live || !sessionId) return;
    const stepId = steps[index]?.id;
    if (!stepId) return;
    setClassStep(stepId);
    void setMusicLessonStep(sessionId, stepId).then((result) => {
      if (!result.ok) return;
      setClassStep(result.lessonStepCurrent);
      setLocked(result.lessonStepLocked);
    });
  }

  async function toggleLock() {
    if (!sessionId) return;
    const result = await toggleMusicStepLock(sessionId, !locked);
    if (!result.ok) return;
    setClassStep(result.lessonStepCurrent);
    setLocked(result.lessonStepLocked);
  }

  function onClassAnswer(blankId: number, typed: string) {
    setClassAnswers((current) => {
      const next = { ...current, [blankId]: typed };
      classAnswersRef.current = next;
      return next;
    });
    if (!sessionId) return;
    if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    classSaveTimer.current = window.setTimeout(() => {
      void saveSongClassAnswers(
        sessionId,
        serializeSongClassAnswers(classAnswersRef.current)
      );
    }, 400);
  }

  function flushClassAnswers() {
    if (!sessionId) return;
    if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    classSaveTimer.current = null;
    void saveSongClassAnswers(
      sessionId,
      serializeSongClassAnswers(classAnswersRef.current)
    );
  }

  useEffect(() => {
    return () => {
      if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    };
  }, []);

  // Music ignores &t=/start= on youtube_url on purpose. Karaoke JSON is on the
  // video clock from 0:00 (tap-align). Do not pass youtubeStartSeconds here.
  const youtubeId = youtubeEmbedId(story.youtube_url);
  const lyricBlanks = parseLyricBlanks(story.lyric_blanks);
  const persistBlanks = readerMode === "classroom-live" && Boolean(sessionId) && !isTeacher;
  const teacherPacing = isTeacher && live && Boolean(sessionId);
  const onStepButton = teacherPacing ? goWithClass : goTo;

  return (
    <PlaybackRateProvider>
      <main className="story-page min-h-screen">
        <div className="story-page-header border-b border-paper-line sticky top-0 backdrop-blur-sm z-20">
          <header className="px-4 pt-2 pb-2">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <BackLink href="/dashboard" showLabel />
                <p className="min-w-0 flex-1 text-label-sm text-text-muted">
                  Profe Kyle
                </p>
                <Link
                  href="/progress"
                  className="inline-flex h-11 items-center text-label-md text-text-secondary hover:text-text-accent"
                >
                  Tu progreso
                </Link>
              </div>
              <p className="text-label-sm text-text-muted mt-1">Música</p>
              <h1 className="text-headline-md text-text-primary">
                {story.title}
              </h1>
            </div>
          </header>
          <nav className="step-progress max-w-2xl mx-auto px-2" aria-label="Pasos">
            {steps.map((step, index) => {
              const blocked = studentLive && locked && index > classIndex;
              return (
                <div key={step.id} className="contents">
                  {index > 0 && (
                    <div
                      className={`step-progress-line${
                        index <= safeIndex ? " step-progress-line-filled" : ""
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    className="step-progress-hit"
                    aria-label={
                      blocked
                        ? `${step.label}. El Profe Kyle abre las secciones.`
                        : step.label
                    }
                    aria-current={index === safeIndex ? "step" : undefined}
                    aria-disabled={blocked}
                    onClick={() => goTo(index)}
                  >
                    <span
                      className={`step-progress-dot${
                        index < safeIndex
                          ? " step-progress-dot-done"
                          : index === safeIndex
                            ? " step-progress-dot-active"
                            : ""
                      }${blocked ? " opacity-40" : ""}`}
                    >
                      {index < safeIndex && (
                        <Check size={10} strokeWidth={3} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <article className="max-w-2xl mx-auto px-4 py-6">
          {recordingYoutubeUrl ? (
            <RecordingBanner youtubeUrl={recordingYoutubeUrl} />
          ) : null}
          <div key={active?.id} className="step-panel">
            {active?.id === "bio" && story.artist_bio ? (
              <SongBio bio={story.artist_bio} words={bioWords} />
            ) : null}
            {active?.id === "blind_listen" && youtubeId ? (
              <div>
                <h2 className="text-headline-lg text-text-primary mb-2">
                  Primera escucha
                </h2>
                <p className="mb-4 text-label-md text-text-secondary">
                  Escucha sin leer la letra. ¿Cuánto entiendes? No importa si no
                  entiendes todo.
                </p>
                <ClassroomYoutubePlayer
                  videoId={youtubeId}
                  title={story.title}
                  sessionId={sessionId}
                  isTeacher={isTeacher}
                  live={youtubeLive}
                />
              </div>
            ) : null}
            {active?.id === "blanks" ? (
              <SongBlanksWorksheet
                bodyText={story.body_text}
                blanks={lyricBlanks}
                sessionId={sessionId}
                persist={persistBlanks}
                initialAttempts={persistBlanks ? savedAttempts : []}
                videoId={youtubeId}
                title={story.title}
                isTeacher={isTeacher}
                live={youtubeLive}
                classAnswers={classAnswers}
                onClassAnswer={onClassAnswer}
                onClassBlur={flushClassAnswers}
              />
            ) : null}
            {active?.id === "lyrics_meaning" ? (
              <SongLyricsMeaning
                bodyText={story.body_text}
                words={words}
                expressions={expressions}
                meaning={story.song_meaning ?? null}
                storyId={story.id}
                sessionId={sessionId}
                trackLookups={trackLookups}
                flagging={flagging}
              />
            ) : null}
            {active?.id === "truquitos_karaoke" && youtubeId ? (
              <SongTruquitosKaraoke
                bodyText={story.body_text}
                lyricsIpa={story.lyrics_ipa}
                lineTimestamps={story.line_timestamps}
                videoId={youtubeId}
                title={story.title}
                sessionId={sessionId}
                isTeacher={isTeacher}
                live={youtubeLive}
                showSeekBack={!live}
              />
            ) : null}
          </div>

          <nav
            className={`step-nav${teacherPacing ? " step-nav-paced" : ""}`}
            aria-label="Navegación de pasos"
          >
            {prev ? (
              <button
                type="button"
                className="step-nav-btn"
                onClick={() => onStepButton(safeIndex - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                {prev.label}
              </button>
            ) : teacherPacing ? (
              <span />
            ) : null}
            {teacherPacing ? (
              <button
                type="button"
                className="step-nav-lock"
                onClick={() => void toggleLock()}
              >
                {locked ? "Abrir todas" : "Bloquear pasos"}
              </button>
            ) : null}
            {next ? (
              <button
                type="button"
                className="step-nav-btn step-nav-btn-next"
                onClick={() => onStepButton(safeIndex + 1)}
              >
                {next.label}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : forwardBlocked ? (
              <p className="step-nav-done text-label-md text-text-muted">
                El Profe Kyle abre las secciones.
              </p>
            ) : teacherPacing ? (
              <span />
            ) : (
              <p className="step-nav-done">
                Listo. Has practicado todos los ejercicios.{" "}
                <Link
                  href="/progress"
                  className="text-text-accent underline-offset-2 hover:underline"
                >
                  Tu progreso
                </Link>
              </p>
            )}
          </nav>
          {isTeacher && sessionId && live && !next && !forwardBlocked ? (
            <EndClassButton
              sessionId={sessionId}
              classEndedAt={classEndedAt}
              onEnded={setClassEndedAt}
            />
          ) : null}
        </article>
      </main>
    </PlaybackRateProvider>
  );
}
