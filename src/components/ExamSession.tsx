"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import EndClassButton from "@/components/EndClassButton";
import RecordingBanner from "@/components/lesson/RecordingBanner";
import LessonHeader from "@/components/lesson/LessonHeader";
import LessonTimer from "@/components/lesson/LessonTimer";
import ExamFillBlanks from "@/components/exam/ExamFillBlanks";
import ExamItemCheck from "@/components/exam/ExamItemCheck";
import ExamCorrectToggle from "@/components/exam/ExamCorrectToggle";
import WritingCorrectionView from "@/components/WritingCorrectionView";
import { createClient } from "@/lib/supabase/client";
import {
  acceptedForItem,
  allExamItemsChecked,
  assignedOrderPosition,
  decodeExamStep,
  emptyExamClassAnswer,
  examAnswerMatches,
  examRemainingMs,
  examRowLetter,
  examScore,
  examStepIndex,
  flattenFillSlots,
  formatCountdown,
  itemIsRevealed,
  makeupRemainingMs,
  parseExamClassAnswers,
  parseExamTimerMinutes,
  parseExamTimerMode,
  puntajeReachable,
  resolveExamTaskCopy,
  studentAnswerForItem,
  EXAM_MAKEUP_MINUTES,
  EXAM_STEPS,
} from "@/lib/exam";
import {
  freezeExamAnswers,
  submitExamTask,
} from "@/app/exam/actions";
import {
  checkExamItem,
  publishExamScore,
  setExamLessonStep,
  toggleExamStepLock,
} from "@/app/exam/exam-teacher-actions";
import { getSessionPhase } from "@/lib/session-phase";
import { wordDiff } from "@/lib/writing";
import type {
  CourseLevel,
  ExamClassAnswers,
  ExamTask2CorrectionAnswer,
  ExamTask2LetterAnswer,
  ExamTimerMode,
  GroupExamPrompt,
} from "@/types";
import type { LessonViewToggle } from "@/lib/student-preview";

type Task1Answer = { slotIndex: number; answer: string };
type Task3Answer = { sentenceNumber: number; englishTranslation: string };

const inputClass =
  "min-h-11 w-full rounded-card border border-paper-line bg-white px-3 py-2 text-body-main text-text-primary focus:border-accent focus:outline-none";

export default function ExamSession({
  sessionId,
  prompt,
  isTeacher,
  previewLevel = null,
  viewToggle = null,
  attended,
  initialTask1,
  initialTask2,
  initialTask3,
  initialStatus,
  startedAt,
  task1SubmittedAt: initialTask1SubmittedAt,
  task2SubmittedAt: initialTask2SubmittedAt,
  task3SubmittedAt: initialTask3SubmittedAt,
  recordingYoutubeUrl = null,
  classEndedAt: initialEndedAt = null,
  sessionStartTime = null,
  sessionEndTime = null,
  timerStartedAt: initialTimerStartedAt = null,
  examTimerMode: initialTimerMode = "until_end_offset",
  examTimerMinutes: initialTimerMinutes = 20,
  examClassAnswers: initialClassAnswers = {},
  examScorePublishedAt: initialScorePublishedAt = null,
  lessonStepCurrent: initialStep = null,
  lessonStepLocked: initialLocked = false,
}: {
  sessionId: string;
  prompt: GroupExamPrompt;
  isTeacher: boolean;
  previewLevel?: CourseLevel | null;
  viewToggle?: LessonViewToggle | null;
  attended: boolean;
  initialTask1: Task1Answer[];
  initialTask2: ExamTask2LetterAnswer[] | ExamTask2CorrectionAnswer[];
  initialTask3: Task3Answer[];
  initialStatus: "in_progress" | "submitted" | null;
  startedAt: string | null;
  task1SubmittedAt: string | null;
  task2SubmittedAt: string | null;
  task3SubmittedAt: string | null;
  recordingYoutubeUrl?: string | null;
  classEndedAt?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  timerStartedAt?: string | null;
  examTimerMode?: ExamTimerMode;
  examTimerMinutes?: number;
  examClassAnswers?: ExamClassAnswers;
  examScorePublishedAt?: string | null;
  lessonStepCurrent?: string | null;
  lessonStepLocked?: boolean;
}) {
  const copy = resolveExamTaskCopy(prompt);
  const [activeIndex, setActiveIndex] = useState(() =>
    examStepIndex(decodeExamStep(initialStep))
  );
  const [task1, setTask1] = useState<Task1Answer[]>(initialTask1);
  const [task2, setTask2] = useState(initialTask2);
  const [task3, setTask3] = useState<Task3Answer[]>(initialTask3);
  const [status, setStatus] = useState(initialStatus);
  const [vocabOpen, setVocabOpen] = useState(true);
  const [peekOpen, setPeekOpen] = useState(false);
  const [fixingKeys, setFixingKeys] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [classEndedAt, setClassEndedAt] = useState(initialEndedAt);
  const [timerStartedAt, setTimerStartedAt] = useState(initialTimerStartedAt);
  const [timerMode, setTimerMode] = useState(initialTimerMode);
  const [timerMinutes, setTimerMinutes] = useState(initialTimerMinutes);
  const [classAnswers, setClassAnswers] = useState(initialClassAnswers);
  const [scorePublishedAt, setScorePublishedAt] = useState(
    initialScorePublishedAt
  );
  const [classStep, setClassStep] = useState(initialStep);
  const [stepLocked, setStepLocked] = useState(initialLocked);
  const [taskSubmitted, setTaskSubmitted] = useState({
    1: initialTask1SubmittedAt,
    2: initialTask2SubmittedAt,
    3: initialTask3SubmittedAt,
  });
  const [makeupStartedAt, setMakeupStartedAt] = useState(startedAt);
  const frozen = useRef(false);
  const classAnswersRef = useRef(classAnswers);
  classAnswersRef.current = classAnswers;
  const task1Ref = useRef(task1);
  const task2Ref = useRef(task2);
  const task3Ref = useRef(task3);
  task1Ref.current = task1;
  task2Ref.current = task2;
  task3Ref.current = task3;
  const classSaveTimer = useRef<number | null>(null);
  const studentSaveTimer = useRef<number | null>(null);
  const studentSaveBusy = useRef(false);
  const studentSaveDirty = useRef(false);
  const classSaveBusy = useRef(false);
  const classSaveDirty = useRef(false);

  const live =
    Boolean(sessionStartTime && sessionEndTime) &&
    getSessionPhase(
      {
        sessionStartTime: sessionStartTime as string,
        sessionEndTime: sessionEndTime as string,
        classEndedAt,
      },
      new Date(now)
    ) === "live";
  const afterClass = Boolean(classEndedAt) ||
    (Boolean(sessionStartTime && sessionEndTime) &&
      getSessionPhase(
        {
          sessionStartTime: sessionStartTime as string,
          sessionEndTime: sessionEndTime as string,
          classEndedAt,
        },
        new Date(now)
      ) === "after");

  const slots = useMemo(
    () => flattenFillSlots(prompt.fillInTranslation),
    [prompt.fillInTranslation]
  );
  const orderItems = prompt.paragraphRestructuring ?? [];
  const scoreOpen = puntajeReachable(scorePublishedAt) || (afterClass && attended);
  const absenteeScoreOpen =
    afterClass &&
    !attended &&
    Boolean(taskSubmitted[1] && taskSubmitted[2] && taskSubmitted[3]);
  const canOpenPuntaje = isTeacher || scoreOpen || absenteeScoreOpen;

  const steps = EXAM_STEPS;
  const safeIndex = Math.min(activeIndex, steps.length - 1);
  const active = steps[safeIndex];
  const classIndex = examStepIndex(decodeExamStep(classStep));
  const studentLive = !isTeacher && live;
  const teacherPacing = isTeacher && live;
  const workPeriod = live && Boolean(timerStartedAt) && examRemainingMs({
    mode: timerMode,
    minutes: timerMinutes,
    timerStartedAt,
    sessionEndTime,
  }, now) > 0;
  const lockSkip = studentLive && stepLocked && !workPeriod;
  const remaining = live
    ? examRemainingMs(
        {
          mode: timerMode,
          minutes: timerMinutes,
          timerStartedAt,
          sessionEndTime,
        },
        now
      )
    : afterClass && !attended && !isTeacher
      ? makeupRemainingMs(makeupStartedAt, EXAM_MAKEUP_MINUTES, now)
      : 0;
  const clockRunning =
    (live && Boolean(timerStartedAt)) ||
    (afterClass && !attended && !isTeacher);
  const pensDown = live && Boolean(timerStartedAt) && remaining <= 0;
  const studentCanType =
    !isTeacher &&
    ((live && Boolean(timerStartedAt) && remaining > 0) ||
      (afterClass &&
        !attended &&
        remaining > 0));
  const taskReadOnly = (task: 1 | 2 | 3) => {
    if (isTeacher) return true;
    if (!studentCanType) return true;
    if (afterClass && !attended && taskSubmitted[task]) return true;
    if (afterClass && attended) return true;
    return false;
  };

  const payload = useCallback(
    () => ({
      sessionId,
      groupId: null,
      task1: task1Ref.current,
      task2: task2Ref.current,
      task3: task3Ref.current,
    }),
    [sessionId]
  );

  const studentCanTypeRef = useRef(studentCanType);
  studentCanTypeRef.current = studentCanType;

  const flushStudentSave = useCallback(async () => {
    if (!studentCanTypeRef.current) return;
    if (studentSaveBusy.current) {
      studentSaveDirty.current = true;
      return;
    }
    studentSaveDirty.current = false;
    studentSaveBusy.current = true;
    try {
      const response = await fetch("/api/exam/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!result.ok) {
        setError(result.error || "No pude guardar. Inténtalo de nuevo.");
      } else if (afterClass && !attended && !makeupStartedAt) {
        setMakeupStartedAt(new Date().toISOString());
      }
    } catch {
      setError("No pude guardar. Inténtalo de nuevo.");
    } finally {
      studentSaveBusy.current = false;
      if (studentSaveDirty.current) {
        void flushStudentSave();
      }
    }
  }, [afterClass, attended, makeupStartedAt, payload]);

  const scheduleStudentSave = useCallback(() => {
    studentSaveDirty.current = true;
    if (studentSaveTimer.current) window.clearTimeout(studentSaveTimer.current);
    studentSaveTimer.current = window.setTimeout(() => {
      void flushStudentSave();
    }, 2000);
  }, [flushStudentSave]);

  const flushClassSave = useCallback(async () => {
    if (classSaveBusy.current) {
      classSaveDirty.current = true;
      return;
    }
    classSaveDirty.current = false;
    classSaveBusy.current = true;
    try {
      const response = await fetch("/api/exam/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "class",
          sessionId,
          answers: classAnswersRef.current,
        }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!result.ok) {
        setError(result.error || "No pude guardar las respuestas.");
      }
    } catch {
      setError("No pude guardar las respuestas.");
    } finally {
      classSaveBusy.current = false;
      if (classSaveDirty.current) {
        void flushClassSave();
      }
    }
  }, [sessionId]);

  const scheduleClassSave = useCallback(() => {
    classSaveDirty.current = true;
    if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    classSaveTimer.current = window.setTimeout(() => {
      void flushClassSave();
    }, 2000);
  }, [flushClassSave]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (studentSaveTimer.current) {
        window.clearTimeout(studentSaveTimer.current);
        studentSaveTimer.current = null;
      }
      if (classSaveTimer.current) {
        window.clearTimeout(classSaveTimer.current);
        classSaveTimer.current = null;
      }
      if (studentSaveDirty.current) void flushStudentSave();
      if (classSaveDirty.current) void flushClassSave();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushStudentSave, flushClassSave]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pensDown) {
      if (frozen.current) {
        frozen.current = false;
        if (!isTeacher && status === "submitted") {
          setStatus("in_progress");
        }
      }
      return;
    }
    if (isTeacher || frozen.current) return;
    frozen.current = true;
    void freezeExamAnswers(payload()).then((result) => {
      if (result.ok) setStatus("submitted");
    });
  }, [pensDown, isTeacher, payload, status]);

  useEffect(() => {
    const supabase = createClient();
    const apply = (row: {
      timer_started_at?: string | null;
      class_ended_at?: string | null;
      lesson_step_current?: string | null;
      lesson_step_locked?: boolean | null;
      exam_class_answers?: unknown;
      exam_timer_mode?: string | null;
      exam_timer_minutes?: number | null;
      exam_score_published_at?: string | null;
    }) => {
      if ("timer_started_at" in row) {
        setTimerStartedAt(row.timer_started_at ?? null);
      }
      if (row.class_ended_at) setClassEndedAt(row.class_ended_at);
      if ("lesson_step_current" in row) {
        setClassStep(row.lesson_step_current ?? null);
      }
      if ("lesson_step_locked" in row) {
        setStepLocked(Boolean(row.lesson_step_locked));
      }
      if ("exam_class_answers" in row && !isTeacher) {
        setClassAnswers(parseExamClassAnswers(row.exam_class_answers));
      }
      if (row.exam_timer_mode) {
        setTimerMode(parseExamTimerMode(row.exam_timer_mode));
      }
      if (row.exam_timer_minutes != null) {
        setTimerMinutes(parseExamTimerMinutes(row.exam_timer_minutes));
      }
      if ("exam_score_published_at" in row) {
        setScorePublishedAt(row.exam_score_published_at ?? null);
      }
    };
    const channel = supabase
      .channel(`exam-session-${sessionId}`)
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
          "timer_started_at, class_ended_at, lesson_step_current, lesson_step_locked, exam_class_answers, exam_timer_mode, exam_timer_minutes, exam_score_published_at"
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (data) apply(data);
    }, 3000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, isTeacher]);

  useEffect(() => {
    if (!classStep) return;
    if (studentLive && workPeriod) return;
    if (!studentLive && !(isTeacher && live)) return;
    setActiveIndex(examStepIndex(decodeExamStep(classStep)));
  }, [studentLive, workPeriod, classStep, isTeacher, live]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active?.id]);

  const goTo = (index: number) => {
    const step = steps[index];
    if (!step) return;
    if (step.id === "puntaje" && !canOpenPuntaje && !isTeacher) return;
    if (lockSkip && index > classIndex) return;
    setActiveIndex(index);
  };

  function goWithClass(index: number) {
    if (index < 0 || index >= steps.length) return;
    const stepId = steps[index]?.id;
    if (!stepId) return;
    if (stepId === "puntaje" && !canOpenPuntaje && !isTeacher) return;
    setActiveIndex(index);
    if (!isTeacher || !live) return;
    setClassStep(stepId);
    void setExamLessonStep(sessionId, stepId).then((result) => {
      if (!result.ok) return;
      setClassStep(result.lessonStepCurrent);
      setStepLocked(result.lessonStepLocked);
    });
  }

  async function toggleLock() {
    const result = await toggleExamStepLock(sessionId, !stepLocked);
    if (!result.ok) return;
    setClassStep(result.lessonStepCurrent);
    setStepLocked(result.lessonStepLocked);
  }

  const onStepButton = teacherPacing && !workPeriod ? goWithClass : goTo;
  const prev = steps[safeIndex - 1];
  const next = steps[safeIndex + 1];
  const nextBlocked =
    next?.id === "puntaje" && !canOpenPuntaje && !isTeacher
      ? true
      : Boolean(lockSkip && safeIndex + 1 > classIndex);

  function itemRevealed(key: string) {
    return itemIsRevealed({
      key,
      live,
      classEnded: afterClass,
      attended,
      classAnswers,
      taskSubmittedAt: taskSubmitted,
    });
  }

  function itemAccepted(key: string) {
    return acceptedForItem(prompt, key, classAnswers, afterClass);
  }

  function itemTyped(key: string) {
    if (isTeacher) {
      return (classAnswers[key]?.accepted?.[0] ?? "").trim();
    }
    return studentAnswerForItem({
      prompt,
      key,
      task1,
      task2,
      task3,
    });
  }

  function itemMatch(key: string) {
    return examAnswerMatches(itemTyped(key), itemAccepted(key));
  }

  function setAccepted(key: string, accepted: string[], revealed?: boolean) {
    const prevItem = classAnswersRef.current[key] ?? emptyExamClassAnswer();
    const next = {
      ...classAnswersRef.current,
      [key]: {
        accepted,
        revealed: revealed ?? prevItem.revealed,
      },
    };
    classAnswersRef.current = next;
    setClassAnswers(next);
    scheduleClassSave();
  }

  async function onCheck(key: string, acceptedOverride?: string[]) {
    if (classSaveTimer.current) window.clearTimeout(classSaveTimer.current);
    classSaveDirty.current = false;
    const accepted = (
      acceptedOverride ??
      classAnswersRef.current[key]?.accepted ??
      []
    ).filter((value) => value.trim());
    const result = await checkExamItem(
      sessionId,
      key,
      accepted,
      classAnswersRef.current
    );
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setClassAnswers((local) => {
      const next = {
        ...local,
        [key]: result.answers[key] ?? {
          accepted,
          revealed: true,
        },
      };
      classAnswersRef.current = next;
      return next;
    });
    if (result.scorePublishedAt) {
      setScorePublishedAt(result.scorePublishedAt);
      setActiveIndex(examStepIndex("puntaje"));
    }
    return true;
  }

  function teacherEditing(key: string) {
    return fixingKeys[key] === true;
  }

  function redoSentence(key: string) {
    setFixingKeys((current) => ({ ...current, [key]: false }));
    const accepted = classAnswersRef.current[key]?.accepted ?? [""];
    setAccepted(key, accepted, false);
  }

  function markSentenceCorrect(key: string, original: string) {
    setFixingKeys((current) => ({ ...current, [key]: false }));
    const next = {
      ...classAnswersRef.current,
      [key]: { accepted: [original], revealed: false },
    };
    classAnswersRef.current = next;
    setClassAnswers(next);
    void onCheck(key);
  }

  function setTask1Value(slotIndex: number, answer: string) {
    if (isTeacher) {
      const key = `t1-${slotIndex}`;
      const rest = (classAnswers[key]?.accepted ?? []).slice(1);
      setAccepted(key, [answer, ...rest]);
      return;
    }
    setTask1((current) => {
      const next = current.filter((row) => row.slotIndex !== slotIndex);
      next.push({ slotIndex, answer });
      task1Ref.current = next;
      return next;
    });
    scheduleStudentSave();
  }

  async function onSubmitTask(task: 1 | 2 | 3) {
    setError("");
    const result = await submitExamTask({ ...payload(), task });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTaskSubmitted((current) => ({
      ...current,
      [task]: new Date().toISOString(),
    }));
    if (task === 3) {
      setStatus("submitted");
      setActiveIndex(examStepIndex("puntaje"));
    }
  }

  const score = examScore({
    prompt,
    task1,
    task2,
    task3,
    classAnswers,
    useCatalogFallback: afterClass,
  });
  const teacherLive = isTeacher && live;
  const allChecked = allExamItemsChecked(prompt, classAnswers);

  return (
    <main className="min-h-screen bg-paper">
      <div
        className="story-page-header sticky top-0 z-20 border-b border-paper-line backdrop-blur-sm"
        data-lesson-sticky
      >
        <LessonHeader
          typeLabel="Examen"
          title={prompt.title}
          level={prompt.level}
          isTeacher={isTeacher}
          previewLevel={previewLevel}
          viewToggle={viewToggle}
        />
        <nav className="step-progress mx-auto max-w-2xl px-2" aria-label="Pasos">
          {steps.map((step, index) => {
            const blocked =
              (lockSkip && index > classIndex) ||
              (step.id === "puntaje" && !canOpenPuntaje && !isTeacher);
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
                      ? `${step.label}. Todavía no.`
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

      <section className="mx-auto max-w-2xl px-4 py-6">
        {recordingYoutubeUrl ? (
          <RecordingBanner youtubeUrl={recordingYoutubeUrl} />
        ) : null}
        {clockRunning ? (
          <LessonTimer
            value={formatCountdown(remaining)}
            sticky={remaining > 0}
          />
        ) : null}

        {live && !timerStartedAt && !isTeacher ? (
          <p className="mb-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            Espera a que el Profe Kyle inicie el examen.
          </p>
        ) : null}
        {pensDown && !isTeacher ? (
          <p className="mb-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            Tiempo. Deja el lápiz. Vamos a revisar juntos.
          </p>
        ) : null}
        {active?.id === "parte-1" && (
          <div className="space-y-4">
            <h2 className="text-headline-lg text-text-primary">
              {copy.task1Title}
            </h2>
            <p className="text-label-md text-text-secondary">
              {copy.task1Instructions}
            </p>
            <button
              type="button"
              onClick={() => setVocabOpen((value) => !value)}
              className="text-label-md text-text-accent"
            >
              {vocabOpen ? "Ocultar lista" : "Ver lista de vocabulario"}
            </button>
            {vocabOpen && (
              <ul className="rounded-card border border-paper-line bg-white px-3 py-3 text-body-main">
                {prompt.vocabularyList.map((item) => (
                  <li key={item.id} className="py-1">
                    {item.english}
                  </li>
                ))}
              </ul>
            )}
            {teacherLive ? (
              <TeacherPeek
                open={peekOpen}
                onToggle={() => setPeekOpen((value) => !value)}
                lines={slots.map(
                  (slot) =>
                    `${slot.sentenceNumber}. ${slot.slot.spanishWord}: ${[
                      slot.slot.expectedEnglish,
                      ...slot.slot.acceptableVariations,
                    ].join(" / ")}`
                )}
              />
            ) : null}
            <ExamFillBlanks
              sentences={prompt.fillInTranslation}
              slots={slots}
              valueFor={(slotIndex) =>
                isTeacher
                  ? classAnswers[`t1-${slotIndex}`]?.accepted?.[0] ?? ""
                  : task1.find((row) => row.slotIndex === slotIndex)?.answer ??
                    ""
              }
              onChange={setTask1Value}
              readOnly={isTeacher ? false : taskReadOnly(1)}
              revealedFor={(slotIndex) => itemRevealed(`t1-${slotIndex}`)}
              acceptedFor={(slotIndex) => itemAccepted(`t1-${slotIndex}`)}
              matchFor={(slotIndex) => itemMatch(`t1-${slotIndex}`)}
              afterSlot={
                teacherLive
                  ? (slotIndex) => (
                      <ExamItemCheck
                        key={slotIndex}
                        accepted={
                          classAnswers[`t1-${slotIndex}`]?.accepted ?? [""]
                        }
                        revealed={
                          classAnswers[`t1-${slotIndex}`]?.revealed === true
                        }
                        onAcceptedChange={(next) =>
                          setAccepted(`t1-${slotIndex}`, next)
                        }
                        onCheck={() => void onCheck(`t1-${slotIndex}`)}
                      />
                    )
                  : undefined
              }
            />
            {afterClass && !isTeacher && !attended && !taskSubmitted[1] ? (
              <EntregarButton onClick={() => void onSubmitTask(1)} />
            ) : null}
          </div>
        )}

        {active?.id === "parte-2" &&
          prompt.task2Type === "paragraph_restructuring" && (
            <div className="space-y-4">
              <h2 className="text-headline-lg text-text-primary">
                {copy.task2Title}
              </h2>
              <p className="text-label-md text-text-secondary">
                {copy.task2Instructions}
              </p>
              {teacherLive ? (
                <TeacherPeek
                  open={peekOpen}
                  onToggle={() => setPeekOpen((value) => !value)}
                  lines={orderItems.map(
                    (item, index) =>
                      `${examRowLetter(index)} → ${item.correctPosition}`
                  )}
                />
              ) : null}
              <ol className="space-y-3">
                {orderItems.map((sentence, index) => {
                  const key = `t2-${sentence.number}`;
                  const letter = examRowLetter(index);
                  const position = isTeacher
                    ? classAnswers[key]?.accepted?.[0] ?? ""
                    : assignedOrderPosition(
                        task2 as ExamTask2LetterAnswer[],
                        sentence.number
                      );
                  const revealed = itemRevealed(key);
                  const ok = itemMatch(key);
                  return (
                    <li
                      key={sentence.number}
                      className="rounded-card border border-paper-line bg-white px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="pt-2 text-label-md font-medium text-text-secondary">
                          {letter}.
                        </span>
                        <input
                          value={position}
                          disabled={isTeacher ? false : taskReadOnly(2)}
                          maxLength={1}
                          inputMode="numeric"
                          onChange={(event) => {
                            const assignedPosition = event.target.value
                              .replace(/[^1-9]/g, "")
                              .slice(0, 1);
                            if (isTeacher) {
                              const rest = (classAnswers[key]?.accepted ?? []).slice(
                                1
                              );
                              setAccepted(key, [assignedPosition, ...rest]);
                              return;
                            }
                            setTask2((current) => {
                              const next = (
                                current as ExamTask2LetterAnswer[]
                              ).filter(
                                (row) => row.sentenceNumber !== sentence.number
                              );
                              next.push({
                                sentenceNumber: sentence.number,
                                assignedPosition,
                              });
                              task2Ref.current = next;
                              return next;
                            });
                            scheduleStudentSave();
                          }}
                          aria-label={`Posición para ${letter}`}
                          className="h-11 w-11 shrink-0 rounded-small border border-paper-line text-center disabled:bg-surface-hover"
                        />
                        <p className="pt-2 text-body-main text-text-primary">
                          {sentence.sentence}
                        </p>
                      </div>
                      {revealed ? (
                        <p
                          className={`mt-2 text-label-sm ${
                            ok ? "text-success" : "text-error"
                          }`}
                        >
                          {ok
                            ? "Correcto"
                            : `Va en ${itemAccepted(key)[0] ?? sentence.correctPosition}`}
                        </p>
                      ) : null}
                      {teacherLive ? (
                        <ExamItemCheck
                          accepted={classAnswers[key]?.accepted ?? [""]}
                          revealed={classAnswers[key]?.revealed === true}
                          onAcceptedChange={(next) => setAccepted(key, next)}
                          onCheck={() => void onCheck(key)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {afterClass && !isTeacher && !attended && !taskSubmitted[2] ? (
                <EntregarButton onClick={() => void onSubmitTask(2)} />
              ) : null}
            </div>
          )}

        {active?.id === "parte-2" &&
          prompt.task2Type === "sentence_correction" && (
            <div className="space-y-4">
              <h2 className="text-headline-lg text-text-primary">
                {copy.task2Title}
              </h2>
              <p className="text-label-md text-text-secondary">
                {copy.task2Instructions}
              </p>
              {teacherLive ? (
                <TeacherPeek
                  open={peekOpen}
                  onToggle={() => setPeekOpen((value) => !value)}
                  lines={(prompt.sentenceCorrection ?? []).map((item) =>
                    item.isCorrect
                      ? `${item.number}. Estaba bien.`
                      : `${item.number}. ${item.correctedVersion}`
                  )}
                />
              ) : null}
              <ol className="space-y-3">
                {(prompt.sentenceCorrection ?? []).map((sentence) => {
                  const key = `t2-${sentence.number}`;
                  const row = (task2 as ExamTask2CorrectionAnswer[]).find(
                    (item) => item.sentenceNumber === sentence.number
                  );
                  const markedCorrect = row?.isCorrect ?? false;
                  const revealed = itemRevealed(key);
                  const ok = itemMatch(key);
                  const readOnly = isTeacher ? false : taskReadOnly(2);
                  return (
                    <li
                      key={sentence.number}
                      className="rounded-card border border-paper-line bg-white px-3 py-3"
                    >
                      {isTeacher ? (
                        <ExamCorrectToggle
                          sentenceNumber={sentence.number}
                          original={sentence.sentence}
                          accepted={classAnswers[key]?.accepted ?? [""]}
                          revealed={classAnswers[key]?.revealed === true}
                          editing={teacherEditing(key)}
                          onCorrect={() =>
                            markSentenceCorrect(key, sentence.sentence)
                          }
                          onIncorrect={() => {
                            setFixingKeys((current) => ({
                              ...current,
                              [key]: true,
                            }));
                            const typed = (
                              classAnswers[key]?.accepted?.[0] ?? ""
                            ).trim();
                            if (!typed) {
                              setAccepted(key, [sentence.sentence]);
                            }
                          }}
                          onDraftChange={(value) => {
                            const rest = (
                              classAnswersRef.current[key]?.accepted ?? []
                            ).slice(1);
                            setAccepted(key, [value, ...rest]);
                          }}
                          onSubmitFix={(draft) => {
                            const rest = (
                              classAnswersRef.current[key]?.accepted ?? []
                            ).slice(1);
                            const accepted = [draft, ...rest];
                            classAnswersRef.current = {
                              ...classAnswersRef.current,
                              [key]: { accepted, revealed: false },
                            };
                            setClassAnswers(classAnswersRef.current);
                            void onCheck(key, accepted).then((ok) => {
                              if (ok) {
                                setFixingKeys((current) => ({
                                  ...current,
                                  [key]: false,
                                }));
                              }
                            });
                          }}
                          onRedo={() => redoSentence(key)}
                        />
                      ) : (
                        <>
                          <p className="text-body-main text-text-primary">
                            {sentence.number}. {sentence.sentence}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => {
                                setTask2((current) => {
                                  const next = (
                                    current as ExamTask2CorrectionAnswer[]
                                  ).filter(
                                    (item) =>
                                      item.sentenceNumber !== sentence.number
                                  );
                                  next.push({
                                    sentenceNumber: sentence.number,
                                    isCorrect: true,
                                    correctedText: null,
                                  });
                                  task2Ref.current = next;
                                  return next;
                                });
                                scheduleStudentSave();
                              }}
                              className={`h-11 flex-1 rounded-card text-label-md ${
                                markedCorrect
                                  ? "bg-success text-white"
                                  : "border border-paper-line"
                              }`}
                            >
                              Correcta
                            </button>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => {
                                setTask2((current) => {
                                  const next = (
                                    current as ExamTask2CorrectionAnswer[]
                                  ).filter(
                                    (item) =>
                                      item.sentenceNumber !== sentence.number
                                  );
                                  next.push({
                                    sentenceNumber: sentence.number,
                                    isCorrect: false,
                                    correctedText: row?.correctedText || sentence.sentence,
                                  });
                                  task2Ref.current = next;
                                  return next;
                                });
                                scheduleStudentSave();
                              }}
                              className={`h-11 flex-1 rounded-card text-label-md ${
                                row && !row.isCorrect
                                  ? "bg-accent text-white"
                                  : "border border-paper-line"
                              }`}
                            >
                              Corregir
                            </button>
                          </div>
                          {row && !row.isCorrect && (
                            <textarea
                              value={row.correctedText ?? ""}
                              disabled={readOnly}
                              onChange={(event) => {
                                setTask2((current) => {
                                  const next = (
                                    current as ExamTask2CorrectionAnswer[]
                                  ).filter(
                                    (item) =>
                                      item.sentenceNumber !== sentence.number
                                  );
                                  next.push({
                                    sentenceNumber: sentence.number,
                                    isCorrect: false,
                                    correctedText: event.target.value,
                                  });
                                  task2Ref.current = next;
                                  return next;
                                });
                                scheduleStudentSave();
                              }}
                              className={`${inputClass} mt-2`}
                              rows={2}
                            />
                          )}
                        </>
                      )}
                      {!isTeacher && revealed ? (
                        <StudentCorrectionReveal
                          ok={ok}
                          original={sentence.sentence}
                          accepted={itemAccepted(key)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {afterClass && !isTeacher && !attended && !taskSubmitted[2] ? (
                <EntregarButton onClick={() => void onSubmitTask(2)} />
              ) : null}
            </div>
          )}

        {active?.id === "parte-3" && (
          <div className="space-y-4">
            <h2 className="text-headline-lg text-text-primary">
              {copy.task3Title}
            </h2>
            <p className="text-label-md text-text-secondary">
              {copy.task3Instructions}
            </p>
            {teacherLive ? (
              <TeacherPeek
                open={peekOpen}
                onToggle={() => setPeekOpen((value) => !value)}
                lines={prompt.translationSentences.map(
                  (item) =>
                    `${item.number}. ${[
                      ...item.acceptedEnglish,
                      ...item.acceptableVariations,
                    ].join(" / ")}`
                )}
              />
            ) : null}
            <ol className="space-y-3">
              {prompt.translationSentences.map((sentence) => {
                const key = `t3-${sentence.number}`;
                const teacherAccepted = classAnswers[key]?.accepted ?? [""];
                const teacherLocked = isTeacher && classAnswers[key]?.revealed === true;
                const value = isTeacher
                  ? teacherAccepted[0] ?? ""
                  : task3.find((row) => row.sentenceNumber === sentence.number)
                      ?.englishTranslation ?? "";
                const revealed = itemRevealed(key);
                const ok = itemMatch(key);
                const fieldClass = `${inputClass} mt-2${
                  teacherLocked ? " border-success bg-success-bg" : ""
                }`;
                return (
                  <li
                    key={sentence.number}
                    className="rounded-card border border-paper-line bg-white px-3 py-3"
                  >
                    <p className="text-body-main text-text-primary">
                      {sentence.number}. {sentence.spanish}
                    </p>
                    <textarea
                      value={value}
                      disabled={isTeacher ? teacherLocked : taskReadOnly(3)}
                      onChange={(event) => {
                        if (isTeacher) {
                          const rest = teacherAccepted.slice(1);
                          setAccepted(key, [event.target.value, ...rest]);
                          return;
                        }
                        setTask3((current) => {
                          const next = current.filter(
                            (row) => row.sentenceNumber !== sentence.number
                          );
                          next.push({
                            sentenceNumber: sentence.number,
                            englishTranslation: event.target.value,
                          });
                          task3Ref.current = next;
                          return next;
                        });
                        scheduleStudentSave();
                      }}
                      className={fieldClass}
                      rows={2}
                    />
                    {isTeacher
                      ? teacherAccepted.slice(1).map((variant, index) => (
                          <textarea
                            key={`t3-extra-${sentence.number}-${index}`}
                            value={variant}
                            disabled={teacherLocked}
                            onChange={(event) => {
                              const next = [...teacherAccepted];
                              next[index + 1] = event.target.value;
                              setAccepted(key, next);
                            }}
                            placeholder="Otra forma"
                            className={fieldClass}
                            rows={2}
                          />
                        ))
                      : null}
                    {revealed && !isTeacher ? (
                      <p
                        className={`mt-2 text-label-sm ${
                          ok ? "text-success" : "text-error"
                        }`}
                      >
                        {ok ? "Correcto" : itemAccepted(key).join(" / ")}
                      </p>
                    ) : null}
                    {teacherLive ? (
                      <div className="mt-2 flex items-center gap-2">
                        {!teacherLocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              setAccepted(key, [...teacherAccepted, ""])
                            }
                            className="h-11 px-2 text-label-md text-text-accent underline-offset-2 hover:underline"
                          >
                            Añadir otra
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void onCheck(key)}
                          disabled={!value.trim() || teacherLocked}
                          aria-label={teacherLocked ? "Listo" : "Marcar"}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-white transition-colors duration-200 ${
                            teacherLocked
                              ? "bg-success"
                              : "bg-accent hover:bg-accent-hover disabled:opacity-40"
                          }`}
                        >
                          <Check size={20} aria-hidden="true" />
                        </button>
                        {teacherLocked ? (
                          <button
                            type="button"
                            onClick={() => redoSentence(key)}
                            className="flex h-11 items-center gap-2 rounded-card px-2 text-label-md text-text-accent transition-colors duration-200 hover:bg-accent-softer"
                          >
                            <RotateCcw size={16} aria-hidden="true" />
                            Rehacer
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {afterClass && !isTeacher && !attended && !taskSubmitted[3] ? (
              <EntregarButton onClick={() => void onSubmitTask(3)} />
            ) : null}
          </div>
        )}

        {active?.id === "puntaje" && canOpenPuntaje && (
          <div className="space-y-3">
            <h2 className="text-headline-lg text-text-primary">Tu puntaje</h2>
            <p className="text-body-lg text-text-primary">
              {score.correct} / {score.total}
            </p>
            <p className="text-headline-md text-text-primary">{score.percent}%</p>
            <p className="text-label-md text-text-secondary">
              Esto es práctica. No es un puntaje oficial.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-error">{error}</p>}

        {teacherLive && allChecked ? (
          <button
            type="button"
            onClick={() => {
              void publishExamScore(sessionId).then((result) => {
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setScorePublishedAt(result.scorePublishedAt);
                setActiveIndex(examStepIndex("puntaje"));
              });
            }}
            className="mt-6 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white"
          >
            Mostrar puntaje
          </button>
        ) : null}

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
          {next && !nextBlocked ? (
            <button
              type="button"
              className="step-nav-btn step-nav-btn-next"
              onClick={() => onStepButton(safeIndex + 1)}
            >
              {next.label}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : nextBlocked ? (
            <p className="step-nav-done text-label-md text-text-muted">
              El Profe Kyle abre las secciones.
            </p>
          ) : teacherPacing ? (
            <span />
          ) : (
            <p className="step-nav-done text-label-md text-text-muted">
              Listo.
            </p>
          )}
        </nav>
        {isTeacher && live ? (
          <EndClassButton
            sessionId={sessionId}
            classEndedAt={classEndedAt}
            onEnded={setClassEndedAt}
          />
        ) : null}
      </section>
    </main>
  );
}

function TeacherPeek({
  open,
  onToggle,
  lines,
}: {
  open: boolean;
  onToggle: () => void;
  lines: string[];
}) {
  return (
    <div className="rounded-card border border-paper-line bg-white px-3 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="text-label-md text-text-accent"
      >
        {open ? "Ocultar catálogo" : "Ver catálogo"}
      </button>
      {open ? (
        <ul className="mt-2 space-y-1 text-label-sm text-text-secondary">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StudentCorrectionReveal({
  ok,
  original,
  accepted,
}: {
  ok: boolean;
  original: string;
  accepted: string[];
}) {
  const corrected = accepted.find((value) => value.trim()) ?? "";
  const alreadyCorrect = examAnswerMatches(corrected, [original]);
  return (
    <div className="mt-3 space-y-2">
      {ok ? (
        <p className="text-label-sm text-success">Correcto</p>
      ) : alreadyCorrect ? (
        <p className="text-label-sm text-error">Estaba bien.</p>
      ) : null}
      {!alreadyCorrect && corrected ? (
        <WritingCorrectionView
          diff={wordDiff(original, corrected)}
          notes={null}
          goodVocabulary={null}
          showGoodVocabulary={false}
        />
      ) : null}
    </div>
  );
}

function EntregarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white"
    >
      Entregar
    </button>
  );
}
