"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import LessonHeader from "@/components/lesson/LessonHeader";
import RecordingBanner from "@/components/lesson/RecordingBanner";
import EndClassButton from "@/components/EndClassButton";
import SceneDialogue from "@/components/movietalk/SceneDialogue";
import SceneVideoQuestions from "@/components/movietalk/SceneVideoQuestions";
import { PlaybackRateProvider } from "@/components/PlaybackRateContext";
import { createClient } from "@/lib/supabase/client";
import { getSessionPhase } from "@/lib/session-phase";
import { recordStoryOpened } from "@/app/lesson/[slug]/actions";
import {
  initMovieTalkLessonPacing,
  saveMovieTalkClassAnswers,
  setMovieTalkLessonStep,
  toggleMovieTalkStepLock,
} from "@/app/teacher/movietalk-pacing-actions";
import {
  decodeMovieTalkStep,
  movieTalkSceneQuestions,
  movieTalkStepIndex,
  movieTalkStepList,
  parseMovieTalkClassAnswers,
  parseSceneStep,
  serializeMovieTalkClassAnswers,
  type MovieTalkSceneFields,
} from "@/lib/movietalk";
import type { LoadedStory, MovieTalkSceneRow } from "@/lib/stories";
import type { SavedComprehensionResponse } from "@/components/ComprehensionQuestions";
import type { CourseLevel, WordFlagging } from "@/types";

function toSceneFields(rows: MovieTalkSceneRow[]): MovieTalkSceneFields[] {
  return rows.map((row) => ({
    sceneNumber: row.scene_number,
    youtubeUrl: row.youtube_url,
    startSeconds: row.start_seconds,
    endSeconds: row.end_seconds,
    questionStartPosition: row.question_start_position,
    questionEndPosition: row.question_end_position,
  }));
}

export default function MovieTalkLessonSteps({
  data,
  sessionId,
  trackLookups = false,
  readerMode = "open",
  isTeacher = false,
  previewLevel = null,
  saveResponses = true,
  recordingYoutubeUrl = null,
  sessionStartTime = null,
  sessionEndTime = null,
  classEndedAt: initialEndedAt = null,
  flagging,
  lessonStepCurrent: initialStep = null,
  lessonStepLocked: initialLocked = false,
  movieTalkClassAnswers: initialClassAnswers = {},
  savedResponses,
}: {
  data: LoadedStory;
  sessionId?: string;
  trackLookups?: boolean;
  readerMode?: "classroom-live" | "classroom-review" | "open";
  isTeacher?: boolean;
  previewLevel?: CourseLevel | null;
  saveResponses?: boolean;
  recordingYoutubeUrl?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  classEndedAt?: string | null;
  flagging?: WordFlagging;
  lessonStepCurrent?: string | null;
  lessonStepLocked?: boolean;
  movieTalkClassAnswers?: Record<number, string>;
  savedResponses?: SavedComprehensionResponse[];
}) {
  const { story, movieTalkScenes, comprehensionQuestions } = data;
  const sceneFields = useMemo(
    () => toSceneFields(movieTalkScenes),
    [movieTalkScenes]
  );
  const steps = useMemo(
    () => movieTalkStepList(story, sceneFields),
    [story, sceneFields]
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!initialStep) return 0;
    return movieTalkStepIndex(
      decodeMovieTalkStep(initialStep, story, sceneFields),
      story,
      sceneFields
    );
  });
  const [classEndedAt, setClassEndedAt] = useState(initialEndedAt);
  const [now, setNow] = useState(() => Date.now());
  const [classStep, setClassStep] = useState<string | null>(initialStep);
  const [locked, setLocked] = useState(initialLocked);
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
  const studentLive = live && !isTeacher;

  const classIndex = useMemo(() => {
    if (!classStep) return 0;
    return movieTalkStepIndex(
      decodeMovieTalkStep(classStep, story, sceneFields),
      story,
      sceneFields
    );
  }, [classStep, story, sceneFields]);

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
    studentLive &&
    locked &&
    safeIndex >= classIndex &&
    safeIndex < steps.length - 1;

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
      movie_talk_class_answers?: unknown;
    }) => {
      if (row.class_ended_at) setClassEndedAt(row.class_ended_at);
      if ("lesson_step_current" in row) {
        setClassStep(row.lesson_step_current ?? null);
      }
      if ("lesson_step_locked" in row) {
        setLocked(Boolean(row.lesson_step_locked));
      }
      if (!isTeacher && "movie_talk_class_answers" in row) {
        setClassAnswers(parseMovieTalkClassAnswers(row.movie_talk_class_answers));
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
          "class_ended_at, lesson_step_current, lesson_step_locked, movie_talk_class_answers"
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
    const index = movieTalkStepIndex(
      decodeMovieTalkStep(classStep, story, sceneFields),
      story,
      sceneFields
    );
    setActiveIndex(index);
  }, [studentLive, locked, classStep, story, sceneFields]);

  useEffect(() => {
    if (!isTeacher || !live || !sessionId || initRef.current) return;
    if (classStep) return;
    initRef.current = true;
    void initMovieTalkLessonPacing(sessionId).then((result) => {
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
    void setMovieTalkLessonStep(sessionId, stepId).then((result) => {
      if (!result.ok) return;
      setClassStep(result.lessonStepCurrent);
      setLocked(result.lessonStepLocked);
    });
  }

  async function toggleLock() {
    if (!sessionId) return;
    const result = await toggleMovieTalkStepLock(sessionId, !locked);
    if (!result.ok) return;
    setClassStep(result.lessonStepCurrent);
    setLocked(result.lessonStepLocked);
  }

  function onClassAnswer(position: number, typed: string) {
    setClassAnswers((current) => {
      const next = { ...current, [position]: typed };
      classAnswersRef.current = next;
      return next;
    });
    if (!sessionId) return;
    if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    classSaveTimer.current = window.setTimeout(() => {
      void saveMovieTalkClassAnswers(
        sessionId,
        serializeMovieTalkClassAnswers(classAnswersRef.current)
      );
    }, 400);
  }

  function flushClassAnswers() {
    if (!sessionId) return;
    if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    classSaveTimer.current = null;
    void saveMovieTalkClassAnswers(
      sessionId,
      serializeMovieTalkClassAnswers(classAnswersRef.current)
    );
  }

  useEffect(() => {
    return () => {
      if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    };
  }, []);

  const teacherPacing = isTeacher && live && Boolean(sessionId);
  const onStepButton = teacherPacing ? goWithClass : goTo;
  const parsed = active ? parseSceneStep(active.id) : null;
  const sceneRow = parsed
    ? movieTalkScenes.find((row) => row.scene_number === parsed.sceneNumber)
    : undefined;
  const sceneQuestions = parsed
    ? movieTalkSceneQuestions(comprehensionQuestions, {
        sceneNumber: parsed.sceneNumber,
        questionStartPosition: sceneRow?.question_start_position,
        questionEndPosition: sceneRow?.question_end_position,
      })
    : [];
  const sceneIndex = parsed
    ? Math.max(
        0,
        movieTalkScenes.findIndex(
          (row) => row.scene_number === parsed.sceneNumber
        )
      )
    : 0;

  return (
    <PlaybackRateProvider>
      <main className="story-page min-h-screen">
        <div
          className="story-page-header border-b border-paper-line sticky top-0 backdrop-blur-sm z-20"
          data-lesson-sticky
        >
          <LessonHeader
            typeLabel="Movie Talk"
            title={story.title}
            level={story.level}
            isTeacher={isTeacher}
            previewLevel={previewLevel}
          />
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
            {active?.id === "warmup" ? (
              <div className="rounded-card border border-paper-line bg-surface p-5">
                <h2 className="text-headline-lg text-text-primary mb-3">
                  Warm-up
                </h2>
                <p className="text-body-main text-text-primary">
                  {story.warmup_question}
                </p>
              </div>
            ) : null}
            {active?.id === "synopsis" ? (
              <div className="rounded-card border border-paper-line bg-surface p-5">
                <h2 className="text-headline-lg text-text-primary mb-3">
                  Sinopsis
                </h2>
                {story.synopsis?.trim() ? (
                  <p className="text-body-main text-text-primary">
                    {story.synopsis}
                  </p>
                ) : (
                  <p className="text-body-main text-text-secondary">
                    El Profe Kyle aún no ha compartido la sinopsis.
                  </p>
                )}
              </div>
            ) : null}
            {parsed?.kind === "video" ? (
              <SceneVideoQuestions
                scene={sceneRow}
                questions={sceneQuestions}
                title={story.title}
                sessionId={sessionId}
                isTeacher={isTeacher}
                live={live}
                classAnswers={classAnswers}
                savedResponses={savedResponses}
                saveResponses={saveResponses}
                onClassAnswer={onClassAnswer}
                onClassBlur={flushClassAnswers}
              />
            ) : null}
            {parsed?.kind === "dialogo" ? (
              <SceneDialogue
                data={data}
                sceneIndex={sceneIndex}
                sessionId={sessionId}
                trackLookups={trackLookups}
                flagging={flagging}
              />
            ) : null}
            {active?.id === "end" ? (
              <div className="rounded-card border border-paper-line bg-surface p-5">
                <p className="text-body-main text-text-primary">
                  Eso es todo. Vuelve a este link después de clase para
                  repasar.
                </p>
              </div>
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
