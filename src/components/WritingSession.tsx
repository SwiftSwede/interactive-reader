"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  activeWritingTimer,
  canStartAfterClassWriting,
  countWords,
  decodeWritingStep,
  formatCountdown,
  hasWritingText,
  remainingMs,
  wordsPerMinute,
  writingStepIndex,
  writingStepList,
  WRITING_STEP_TITLES,
  type DiffSegment,
  type InlineNote,
} from "@/lib/writing";
import {
  saveWritingDraft,
  startAfterClassWriting,
  submitWriting,
} from "@/app/writing/actions";
import {
  initWritingLessonPacing,
  setWritingLessonStep,
  toggleWritingStepLock,
} from "@/app/teacher/writing-pacing-actions";
import WritingCorrectionView from "@/components/WritingCorrectionView";
import EndClassButton from "@/components/EndClassButton";
import RecordingBanner from "@/components/lesson/RecordingBanner";
import LessonHeader from "@/components/lesson/LessonHeader";
import LessonTimer from "@/components/lesson/LessonTimer";
import { getSessionPhase } from "@/lib/session-phase";
import type { CourseLevel } from "@/types";
import type { LessonViewToggle } from "@/lib/student-preview";

type Prompt = {
  id: string;
  title: string;
  promptText: string;
  writingTimeMinutes: number;
  level: CourseLevel;
  structureLesson: string | null;
  rubricText: string | null;
  exampleParagraph: string | null;
};

export default function WritingSession({
  sessionId,
  prompt,
  notes,
  timerStartedAt: initialTimerStartedAt,
  isTeacher,
  previewLevel = null,
  viewToggle = null,
  saveResponses = true,
  submission,
  correction,
  recordingYoutubeUrl = null,
  classEndedAt: initialEndedAt = null,
  sessionStartTime = null,
  sessionEndTime = null,
  lessonStepCurrent: initialStep = null,
  lessonStepLocked: initialLocked = false,
}: {
  sessionId: string;
  prompt: Prompt;
  notes: string | null;
  timerStartedAt: string | null;
  isTeacher: boolean;
  previewLevel?: CourseLevel | null;
  viewToggle?: LessonViewToggle | null;
  saveResponses?: boolean;
  submission: {
    text: string;
    status: "draft" | "submitted" | "corrected";
    wordCount: number;
    wpm: number | null;
    startedAt: string | null;
  } | null;
  correction: {
    diff: DiffSegment[];
    notes: InlineNote[] | null;
    goodVocabulary: number[] | null;
  } | null;
  recordingYoutubeUrl?: string | null;
  classEndedAt?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  lessonStepCurrent?: string | null;
  lessonStepLocked?: boolean;
}) {
  const steps = useMemo(() => writingStepList(prompt), [prompt]);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!initialStep) return 0;
    return writingStepIndex(decodeWritingStep(initialStep, prompt), prompt);
  });
  const [sessionTimerStartedAt, setSessionTimerStartedAt] = useState(
    initialTimerStartedAt
  );
  const [personalStartedAt, setPersonalStartedAt] = useState(
    submission?.startedAt ?? null
  );
  const [classEndedAt, setClassEndedAt] = useState(initialEndedAt);
  const [classStep, setClassStep] = useState<string | null>(initialStep);
  const [stepLocked, setStepLocked] = useState(initialLocked);
  const [text, setText] = useState(submission?.text ?? "");
  const [status, setStatus] = useState(submission?.status ?? "draft");
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const autoSubmitted = useRef(false);
  const textRef = useRef(submission?.text ?? "");
  const initRef = useRef(false);
  const phase =
    sessionStartTime && sessionEndTime
      ? getSessionPhase(
          {
            sessionStartTime,
            sessionEndTime,
            classEndedAt,
          },
          new Date(now)
        )
      : "before";
  const live = phase === "live";
  const studentLive = live && !isTeacher;

  const isPreInt = prompt.level === "pre-intermediate";
  const timerInput = {
    phase,
    sessionTimerStartedAt,
    personalStartedAt,
    status,
    text,
    minutes: prompt.writingTimeMinutes,
    now,
  };
  const clock = activeWritingTimer(timerInput);
  const canStartMakeup = canStartAfterClassWriting(timerInput);
  const remaining = clock
    ? remainingMs(clock, prompt.writingTimeMinutes, now)
    : null;
  const timedOut = remaining !== null && remaining <= 0;
  const inputLocked =
    isTeacher ||
    !saveResponses ||
    status === "corrected" ||
    (status === "submitted" && hasWritingText(text)) ||
    !clock ||
    timedOut;
  const showFiveMinute =
    remaining !== null &&
    remaining > 0 &&
    remaining <= 5 * 60 * 1000 &&
    status === "draft";
  const showEntregar =
    !isTeacher &&
    status === "draft" &&
    (clock != null || hasWritingText(text));

  const wordCount = countWords(text);
  const elapsedSeconds =
    clock && status === "draft"
      ? Math.max(1, Math.round((now - new Date(clock).getTime()) / 1000))
      : null;
  const liveWpm =
    isPreInt && elapsedSeconds
      ? wordsPerMinute(wordCount, elapsedSeconds)
      : null;

  const classIndex = useMemo(() => {
    if (!classStep) return 0;
    return writingStepIndex(decodeWritingStep(classStep, prompt), prompt);
  }, [classStep, prompt]);

  const safeIndex = Math.max(
    0,
    Math.min(
      studentLive && stepLocked
        ? Math.min(activeIndex, classIndex)
        : activeIndex,
      Math.max(0, steps.length - 1)
    )
  );
  const active = steps[safeIndex];
  const prev = safeIndex > 0 ? steps[safeIndex - 1] : null;
  const canForward = !(
    studentLive &&
    stepLocked &&
    safeIndex >= classIndex
  );
  const next =
    canForward && safeIndex < steps.length - 1 ? steps[safeIndex + 1] : null;
  const forwardBlocked =
    studentLive &&
    stepLocked &&
    safeIndex >= classIndex &&
    safeIndex < steps.length - 1;
  const teacherPacing = isTeacher && live;

  const handleSubmit = useCallback(
    async (fromTimer = false) => {
      if (isTeacher || !saveResponses || status !== "draft") return;
      const startedAt = clock ?? personalStartedAt ?? sessionTimerStartedAt;
      if (!startedAt && !hasWritingText(textRef.current)) return;
      if (autoSubmitted.current && fromTimer) return;
      if (fromTimer) autoSubmitted.current = true;
      setSaving(true);
      setError("");
      const result = await submitWriting({
        sessionId,
        promptId: prompt.id,
        text: textRef.current,
        startedAt: startedAt ?? new Date().toISOString(),
        level: prompt.level,
      });
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        autoSubmitted.current = false;
        return;
      }
      setStatus("submitted");
    },
    [
      isTeacher,
      saveResponses,
      status,
      clock,
      personalStartedAt,
      sessionTimerStartedAt,
      sessionId,
      prompt.id,
      prompt.level,
    ]
  );

  async function handleStartMakeup() {
    if (isTeacher || starting || !saveResponses) return;
    setStarting(true);
    setError("");
    const result = await startAfterClassWriting({
      sessionId,
      promptId: prompt.id,
    });
    setStarting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    autoSubmitted.current = false;
    setPersonalStartedAt(result.startedAt);
    setStatus("draft");
    setNow(Date.now());
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active?.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (
        !isTeacher &&
        isPreInt &&
        clock &&
        remainingMs(clock, prompt.writingTimeMinutes, t) <= 0 &&
        status === "draft"
      ) {
        void handleSubmit(true);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [
    isTeacher,
    isPreInt,
    clock,
    status,
    handleSubmit,
    prompt.writingTimeMinutes,
  ]);

  useEffect(() => {
    const supabase = createClient();
    const apply = (row: {
      timer_started_at?: string | null;
      class_ended_at?: string | null;
      lesson_step_current?: string | null;
      lesson_step_locked?: boolean | null;
    }) => {
      if (row.timer_started_at) {
        setSessionTimerStartedAt(row.timer_started_at);
      }
      if (row.class_ended_at) setClassEndedAt(row.class_ended_at);
      if ("lesson_step_current" in row) {
        setClassStep(row.lesson_step_current ?? null);
      }
      if ("lesson_step_locked" in row) {
        setStepLocked(Boolean(row.lesson_step_locked));
      }
    };
    const channel = supabase
      .channel(`writing-timer-${sessionId}`)
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
      const { data } = await supabase
        .from("course_sessions")
        .select(
          "timer_started_at, class_ended_at, lesson_step_current, lesson_step_locked"
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (data) apply(data);
    }, 3000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!classStep) return;
    if (studentLive && !stepLocked) return;
    if (!studentLive && !(isTeacher && live)) return;
    const index = writingStepIndex(
      decodeWritingStep(classStep, prompt),
      prompt
    );
    setActiveIndex(index);
  }, [studentLive, stepLocked, classStep, prompt, isTeacher, live]);

  useEffect(() => {
    if (!isTeacher || !live || initRef.current) return;
    if (classStep) return;
    initRef.current = true;
    void initWritingLessonPacing(sessionId).then((result) => {
      if (!result.ok) {
        initRef.current = false;
        return;
      }
      setClassStep(result.lessonStepCurrent);
      setStepLocked(result.lessonStepLocked);
    });
  }, [isTeacher, live, sessionId, classStep]);

  useEffect(() => {
    if (isTeacher || !clock || status !== "draft" || inputLocked) return;
    const id = window.setInterval(() => {
      void saveWritingDraft({
        sessionId,
        promptId: prompt.id,
        text: textRef.current,
        startedAt: clock,
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [isTeacher, clock, status, inputLocked, sessionId, prompt.id]);

  const goTo = (index: number) => {
    if (studentLive && stepLocked && index > classIndex) return;
    setActiveIndex(index);
  };

  function goWithClass(index: number) {
    if (index < 0 || index >= steps.length) return;
    setActiveIndex(index);
    if (!isTeacher || !live) return;
    const stepId = steps[index]?.id;
    if (!stepId) return;
    setClassStep(stepId);
    void setWritingLessonStep(sessionId, stepId).then((result) => {
      if (!result.ok) return;
      setClassStep(result.lessonStepCurrent);
      setStepLocked(result.lessonStepLocked);
    });
  }

  async function toggleLock() {
    const result = await toggleWritingStepLock(sessionId, !stepLocked);
    if (!result.ok) return;
    setClassStep(result.lessonStepCurrent);
    setStepLocked(result.lessonStepLocked);
  }

  const onStepButton = teacherPacing ? goWithClass : goTo;
  const hasSubmittedText =
    hasWritingText(text) && (status === "submitted" || status === "corrected");

  return (
    <main className="min-h-screen bg-paper">
      <div
        className="story-page-header sticky top-0 z-20 border-b border-paper-line backdrop-blur-sm"
        data-lesson-sticky
      >
        <LessonHeader
          typeLabel="Escritura"
          title={prompt.title}
          level={prompt.level}
          isTeacher={isTeacher}
          previewLevel={previewLevel}
          viewToggle={viewToggle}
        />
        <nav className="step-progress mx-auto max-w-2xl px-2" aria-label="Pasos">
          {steps.map((step, index) => {
            const blocked = studentLive && stepLocked && index > classIndex;
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

      <article className="mx-auto max-w-2xl px-4 py-6">
        {recordingYoutubeUrl ? (
          <RecordingBanner youtubeUrl={recordingYoutubeUrl} />
        ) : null}
        {clock && status === "draft" && remaining !== null && remaining > 0 ? (
          <LessonTimer
            value={formatCountdown(remaining)}
            tone={showFiveMinute ? "warning" : "default"}
          />
        ) : null}
        {notes ? (
          <p className="mb-4 text-body-main text-text-secondary">{notes}</p>
        ) : null}

        <div hidden={active?.id !== "preguntas"}>
          <h2 className="mb-4 font-heading text-headline-lg text-text-primary">
            {WRITING_STEP_TITLES.preguntas}
          </h2>
          <div className="rounded-card border border-paper-line bg-white px-4 py-4">
            <p className="whitespace-pre-wrap font-heading text-headline-md text-text-primary">
              {prompt.promptText}
            </p>
          </div>
        </div>

        <div hidden={active?.id !== "ejemplo"}>
          <h2 className="mb-4 font-heading text-headline-lg text-text-primary">
            {WRITING_STEP_TITLES.ejemplo}
          </h2>
          {prompt.level === "intermediate" && prompt.structureLesson ? (
            <div className="rounded-card border border-paper-line bg-white px-4 py-4">
              <h2 className="text-label-md text-text-primary">Estructura</h2>
              <p className="mt-1 whitespace-pre-wrap text-body-main text-text-secondary">
                {prompt.structureLesson}
              </p>
            </div>
          ) : null}
          {prompt.level === "intermediate" && prompt.rubricText ? (
            <div className="mt-4 rounded-card border border-paper-line bg-white px-4 py-4">
              <h2 className="text-label-md text-text-primary">
                Rúbrica TOEFL/IELTS
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-body-main text-text-secondary">
                {prompt.rubricText}
              </p>
            </div>
          ) : null}
          {prompt.exampleParagraph ? (
            <div
              className={`${
                prompt.level === "intermediate" &&
                (prompt.structureLesson || prompt.rubricText)
                  ? "mt-4 "
                  : ""
              }rounded-card border border-paper-line bg-white px-4 py-4`}
            >
              <p className="whitespace-pre-wrap text-body-main text-text-secondary">
                {prompt.exampleParagraph}
              </p>
            </div>
          ) : null}
        </div>

        <div hidden={active?.id !== "escribir"}>
          <h2 className="mb-4 font-heading text-headline-lg text-text-primary">
            {WRITING_STEP_TITLES.escribir}
          </h2>
          {isPreInt ? (
            <div className="mb-4 space-y-3 rounded-card border border-paper-line bg-accent-softer px-4 py-4">
              <h2 className="text-label-md text-text-primary">Cómo escribir</h2>
              <p className="text-label-md font-normal text-text-secondary">
                Vas a escribir sobre el tema. Las preguntas de abajo no son un
                cuestionario. Son ideas para arrancar.
              </p>
              <p className="text-label-md font-normal text-text-secondary">
                Elige una o dos. Escribe como si le explicaras tu opinión a
                alguien, con detalle, sin parar. Si contestas todas como una
                encuesta, terminas en dos minutos y no practicas ordenar ideas
                para hablar.
              </p>
              <p className="text-label-md font-normal text-text-secondary">
                Tienes {prompt.writingTimeMinutes} minutos. Si se te olvida una
                palabra, usa Google Translate. No uses una IA: si la máquina
                escribe por ti, tú no mejoras.
              </p>
              <p className="text-label-md font-normal text-text-secondary">
                Cuando se acabe el tiempo, entrega. Después lo vemos en grupo:
                qué hiciste bien y qué puedes mejorar para hablar con más
                fluidez.
              </p>
            </div>
          ) : null}

          <div className="rounded-card border border-paper-line bg-white px-4 py-4">
            <p className="whitespace-pre-wrap font-heading text-headline-md text-text-primary">
              {prompt.promptText}
            </p>
          </div>

          {isTeacher ? (
            <p className="mt-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
              Así lo ven tus estudiantes. Inicia el tiempo desde la página de la
              clase.
            </p>
          ) : null}

          {!isTeacher && canStartMakeup ? (
            <div className="mt-4">
              <p className="rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
                Tienes {prompt.writingTimeMinutes} minutos cuando empieces. El
                recuadro se abre entonces.
              </p>
              <button
                type="button"
                disabled={starting || !saveResponses}
                onClick={() => void handleStartMakeup()}
                className="mt-3 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
              >
                {starting ? "Empezando..." : "Empezar"}
              </button>
            </div>
          ) : null}

          {!isTeacher &&
          !canStartMakeup &&
          !clock &&
          status === "draft" &&
          phase !== "after" ? (
            <p className="mt-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
              Espera a que el Profe Kyle inicie el tiempo.
            </p>
          ) : null}

          {showFiveMinute && status === "draft" && !timedOut ? (
            <p className="mt-4 rounded-card bg-warning-bg px-3 py-3 text-label-md text-warning">
              Quedan 5 minutos.
            </p>
          ) : null}

          <label className="mt-6 block">
            <span className="sr-only">Tu texto</span>
            <textarea
              value={text}
              onChange={(e) => {
                const nextValue = e.target.value;
                textRef.current = nextValue;
                setText(nextValue);
              }}
              disabled={inputLocked || active?.id !== "escribir"}
              rows={12}
              className="min-h-[300px] w-full resize-y rounded-card border border-paper-line bg-white px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none disabled:bg-surface-hover disabled:text-text-muted"
              placeholder={
                clock && !timedOut
                  ? "Write here. Don't stop."
                  : canStartMakeup
                    ? "El recuadro se abre cuando empieces."
                    : "El recuadro se abre cuando empiece el tiempo."
              }
            />
          </label>

          <p className="mt-1 text-right text-[12px] text-text-muted">
            {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
            {isPreInt && liveWpm != null ? ` · ${liveWpm} ppm` : ""}
            {isPreInt && status !== "draft" && submission?.wpm != null
              ? ` · ${submission.wpm} ppm`
              : ""}
          </p>

          {showEntregar ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit(false)}
              className="mt-4 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
            >
              {saving ? "Entregando..." : "Entregar"}
            </button>
          ) : null}

          {status === "submitted" && !canStartMakeup ? (
            <p className="mt-4 rounded-card bg-success-bg px-3 py-3 text-body-main text-success">
              Ya lo entregaste. Cuando Kyle lo corrija, lo ves en Your Text.
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-label-md text-error">{error}</p>
          ) : null}
        </div>

        <div hidden={active?.id !== "revision"}>
          <h2 className="mb-4 font-heading text-headline-lg text-text-primary">
            {WRITING_STEP_TITLES.revision}
          </h2>
          {isTeacher ? (
            <p className="rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
              Los estudiantes ven su propio texto aquí. Tú lo corriges en la
              lista de la clase.
            </p>
          ) : !hasSubmittedText ? (
            <p className="rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
              Todavía no hay entrega.
            </p>
          ) : (
            <>
              <div className="rounded-card border border-paper-line bg-white px-4 py-4">
                <p className="whitespace-pre-wrap text-body-main text-text-primary">
                  {text}
                </p>
              </div>
              {status === "corrected" && correction ? (
                <div className="mt-4">
                  <WritingCorrectionView
                    diff={correction.diff}
                    notes={correction.notes}
                    goodVocabulary={correction.goodVocabulary}
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-card bg-success-bg px-3 py-3 text-body-main text-success">
                  Ya lo entregaste. Cuando Kyle lo corrija, lo vas a ver aquí
                  abajo.
                </p>
              )}
            </>
          )}
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
              {stepLocked ? "Abrir todas" : "Bloquear pasos"}
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
          ) : null}
        </nav>
        {isTeacher && live && !next && !forwardBlocked ? (
          <EndClassButton
            sessionId={sessionId}
            classEndedAt={classEndedAt}
            onEnded={setClassEndedAt}
          />
        ) : null}
      </article>
    </main>
  );
}
