"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import BackLink from "@/components/BackLink";
import EndClassButton from "@/components/EndClassButton";
import ClassroomYoutubePlayer from "@/components/ClassroomYoutubePlayer";
import { youtubeEmbedId } from "@/components/MusicBlanks";
import { youtubeStartSeconds } from "@/lib/youtube-sync";
import { createClient } from "@/lib/supabase/client";
import { getSessionPhase } from "@/lib/session-phase";
import {
  adjacentPresentationStep,
  classAnswerForQuestion,
  classAnswerFromResponse,
  encodePresentationStep,
  mapPresentationResponseRow,
  parsePresentationSegments,
  parsePresentationStep,
  presentationAnswerChannelName,
  presentationStepChannelName,
  presentationStepLabel,
  PRESENTATION_ANSWER_EVENT,
  PRESENTATION_STEP_EVENT,
  remotePresentationStep,
  segmentCycleIndex,
  upsertClassAnswer,
  vocabNoteKey,
  type PresentationClassAnswer,
  type PresentationResponseRow,
  type PresentationStep,
} from "@/lib/presentation";
import {
  revealPresentationAnswer,
  savePresentationClassAnswer,
  savePresentationResponse,
  setPresentationStep,
  updatePresentationSpanish,
  upsertPresentationVocabNote,
} from "@/app/presentation/actions";
import type {
  PresentationPrompt,
  PresentationResponse,
  PresentationSegment,
  PresentationVocabItem,
  PresentationVocabNote,
} from "@/types";

const CYCLE_LABELS = ["Vocabulario", "Preguntas", "Video", "Respuestas"];
const SAVE_DEBOUNCE_MS = 600;

export default function PresentationPlayer({
  prompt: initialPrompt,
  sessionId,
  isTeacher,
  sessionStartTime,
  sessionEndTime,
  classEndedAt: initialEndedAt = null,
  allowReveal,
  saveResponses,
  initialStep,
  savedResponses,
  classAnswers: initialClassAnswers = [],
  teacherUserId = null,
  vocabNotes: initialNotes,
}: {
  prompt: PresentationPrompt;
  sessionId: string;
  isTeacher: boolean;
  sessionStartTime: string;
  sessionEndTime: string;
  classEndedAt?: string | null;
  allowReveal: boolean;
  saveResponses: boolean;
  initialStep: string | null;
  savedResponses: PresentationResponse[];
  classAnswers?: PresentationClassAnswer[];
  teacherUserId?: string | null;
  vocabNotes: PresentationVocabNote[];
}) {
  const [now, setNow] = useState(() => Date.now());
  const [prompt, setPrompt] = useState(initialPrompt);
  const [notes, setNotes] = useState(initialNotes);
  const [classAnswers, setClassAnswers] = useState(initialClassAnswers);
  const [step, setStep] = useState<PresentationStep>(() =>
    parsePresentationStep(initialStep, initialPrompt)
  );
  const [classEndedAt, setClassEndedAt] = useState(initialEndedAt);

  const phase = getSessionPhase(
    { sessionStartTime, sessionEndTime, classEndedAt },
    new Date(now)
  );
  const studentLocked = !isTeacher && phase === "before";
  const followTeacher = !isTeacher && phase === "live";
  const showNav = isTeacher || phase === "after";
  const writeStep = isTeacher && phase !== "after";
  const liveVideo = phase === "live";

  const followTeacherRef = useRef(followTeacher);
  const promptRef = useRef(prompt);
  const writeStepRef = useRef(writeStep);
  const stepChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const answerChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  followTeacherRef.current = followTeacher;
  promptRef.current = prompt;
  writeStepRef.current = writeStep;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const applyRemoteStep = useCallback((value: unknown) => {
    if (!followTeacherRef.current) return;
    const next = remotePresentationStep(value, promptRef.current);
    if (!next) return;
    setStep(next);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(presentationStepChannelName(sessionId), {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: PRESENTATION_STEP_EVENT }, (message) => {
        const payload = message.payload as { step?: unknown };
        applyRemoteStep(payload.step);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "course_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            presentation_step?: string | null;
            class_ended_at?: string | null;
          };
          if (row.class_ended_at) setClassEndedAt(row.class_ended_at);
          applyRemoteStep(row.presentation_step);
        }
      )
      .subscribe();
    stepChannelRef.current = channel;

    function pullStep() {
      if (!followTeacherRef.current) return;
      void supabase
        .from("course_sessions")
        .select("presentation_step")
        .eq("id", sessionId)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          applyRemoteStep(
            (data as { presentation_step?: string | null }).presentation_step
          );
        });
    }

    pullStep();
    const poll = window.setInterval(pullStep, 2000);

    return () => {
      stepChannelRef.current = null;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, applyRemoteStep]);

  useEffect(() => {
    const supabase = createClient();

    const promptChannel = supabase
      .channel(`presentation-prompt-${prompt.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "presentation_prompts",
          filter: `id=eq.${prompt.id}`,
        },
        (payload) => {
          const row = payload.new as { segments?: unknown };
          setPrompt((prev) => ({
            ...prev,
            segments: parsePresentationSegments(row.segments),
          }));
        }
      )
      .subscribe();

    const notesChannel = supabase
      .channel(`presentation-notes-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presentation_vocab_notes",
          filter: `course_session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as {
              segment_id?: number;
              vocab_english?: string;
            };
            setNotes((prev) =>
              prev.filter(
                (note) =>
                  !(
                    note.segmentId === oldRow.segment_id &&
                    note.vocabEnglish === oldRow.vocab_english
                  )
              )
            );
            return;
          }
          const row = payload.new as {
            id: string;
            course_session_id: string;
            segment_id: number;
            vocab_english: string;
            note_text: string;
            created_by: string;
            created_at: string;
          };
          setNotes((prev) => {
            const next = prev.filter(
              (note) =>
                !(
                  note.segmentId === row.segment_id &&
                  note.vocabEnglish === row.vocab_english
                )
            );
            next.push({
              id: row.id,
              courseSessionId: row.course_session_id,
              segmentId: row.segment_id,
              vocabEnglish: row.vocab_english,
              noteText: row.note_text,
              createdBy: row.created_by,
              createdAt: row.created_at,
            });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(promptChannel);
      void supabase.removeChannel(notesChannel);
    };
  }, [sessionId, prompt.id]);

  const applyClassAnswer = useCallback((next: PresentationClassAnswer) => {
    setClassAnswers((prev) => upsertClassAnswer(prev, next));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(presentationAnswerChannelName(sessionId), {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: PRESENTATION_ANSWER_EVENT }, (message) => {
        const payload = message.payload as PresentationClassAnswer;
        if (
          typeof payload?.segmentId !== "number" ||
          typeof payload?.questionId !== "number"
        ) {
          return;
        }
        applyClassAnswer({
          segmentId: payload.segmentId,
          questionId: payload.questionId,
          text: typeof payload.text === "string" ? payload.text : "",
          ready: Boolean(payload.ready),
        });
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presentation_responses",
          filter: `course_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id?: string;
            segment_id?: number;
            question_id?: number;
            response_text?: string | null;
            revealed_answer?: boolean;
          } | null;
          if (!row?.user_id || !teacherUserId || row.user_id !== teacherUserId) {
            return;
          }
          const segmentId = Number(row.segment_id);
          const questionId = Number(row.question_id);
          if (!Number.isInteger(segmentId) || !Number.isInteger(questionId)) {
            return;
          }
          applyClassAnswer({
            segmentId,
            questionId,
            text: row.response_text ?? "",
            ready: Boolean(row.revealed_answer),
          });
        }
      )
      .subscribe();
    answerChannelRef.current = channel;

    function pullClassAnswers() {
      if (!teacherUserId) return;
      void supabase
        .from("presentation_responses")
        .select(
          "id, presentation_prompt_id, user_id, course_session_id, segment_id, question_id, response_text, revealed_answer, revealed_at, submitted_at"
        )
        .eq("course_session_id", sessionId)
        .eq("user_id", teacherUserId)
        .then(({ data }) => {
          if (!data) return;
          setClassAnswers(
            (data as PresentationResponseRow[]).map((row) =>
              classAnswerFromResponse(mapPresentationResponseRow(row))
            )
          );
        });
    }

    if (!isTeacher) {
      pullClassAnswers();
    }
    const poll = isTeacher
      ? null
      : window.setInterval(pullClassAnswers, 2000);

    return () => {
      answerChannelRef.current = null;
      if (poll) window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, teacherUserId, isTeacher, applyClassAnswer]);

  const publishClassAnswer = useCallback((next: PresentationClassAnswer) => {
    applyClassAnswer(next);
    void answerChannelRef.current?.send({
      type: "broadcast",
      event: PRESENTATION_ANSWER_EVENT,
      payload: next,
    });
  }, [applyClassAnswer]);

  const goTo = useCallback(
    (next: PresentationStep) => {
      setStep(next);
      if (!writeStepRef.current) return;
      const encoded = encodePresentationStep(next);
      void stepChannelRef.current?.send({
        type: "broadcast",
        event: PRESENTATION_STEP_EVENT,
        payload: { step: encoded },
      });
      void setPresentationStep({
        sessionId,
        step: encoded,
      });
    },
    [sessionId]
  );

  const prev = adjacentPresentationStep(step, prompt, -1);
  const next = adjacentPresentationStep(step, prompt, 1);
  const segment =
    step.kind === "warmup" || step.kind === "done"
      ? null
      : prompt.segments.find((row) => row.id === step.segmentId) ?? null;
  const cycleIndex = segmentCycleIndex(step);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  if (studentLocked) {
    return (
      <main className="story-page min-h-screen">
        <PresentationHeader title={prompt.title} />
        <article className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-card border border-paper-line bg-surface p-4">
            <p className="font-heading text-story-body text-text-primary">
              {prompt.title}
            </p>
            {prompt.warmupQuestion ? (
              <p className="mt-3 text-body-main text-text-primary">
                {prompt.warmupQuestion}
              </p>
            ) : null}
          </div>
          <p className="mt-4 text-label-md text-text-secondary">
            La clase todavía no empieza. Quédate aquí. El Profe Kyle abre el
            resto cuando sea la hora.
          </p>
        </article>
      </main>
    );
  }

  return (
    <main className="story-page min-h-screen">
      <div className="story-page-header sticky top-0 z-20 border-b border-paper-line backdrop-blur-sm">
        <PresentationHeader title={prompt.title} />
        {step.kind !== "warmup" && step.kind !== "done" && segment ? (
          <div className="mx-auto max-w-2xl px-2 pb-2">
            <nav
              className="flex flex-wrap items-center justify-center px-1"
              aria-label="Videos"
            >
              {prompt.segments.map((row, index) => {
                const current = row.id === segment.id;
                const label = row.title?.trim() || `Video ${index + 1}`;
                const tone = current
                  ? "font-medium text-text-primary"
                  : showNav
                    ? "text-text-secondary"
                    : "text-text-muted";
                const itemClass = `inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-label-md ${tone}`;
                return (
                  <span key={row.id} className="contents">
                    {index > 0 ? (
                      <span
                        className="px-0.5 text-label-md text-text-muted"
                        aria-hidden="true"
                      >
                        |
                      </span>
                    ) : null}
                    {showNav ? (
                      <button
                        type="button"
                        className={`${itemClass} rounded-card hover:text-text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:text-text-accent`}
                        aria-current={current ? "true" : undefined}
                        aria-label={label}
                        onClick={() => {
                          goTo({ kind: step.kind, segmentId: row.id });
                        }}
                      >
                        {label}
                      </button>
                    ) : (
                      <span
                        className={itemClass}
                        aria-current={current ? "true" : undefined}
                      >
                        {label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
            <nav className="step-progress" aria-label="Pasos del video">
              {CYCLE_LABELS.map((label, index) => (
                <div key={label} className="contents">
                  {index > 0 && (
                    <div
                      className={`step-progress-line${
                        index <= cycleIndex ? " step-progress-line-filled" : ""
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    className="step-progress-hit"
                    aria-label={label}
                    aria-current={index === cycleIndex ? "step" : undefined}
                    disabled={!showNav}
                    onClick={() => {
                      if (!showNav || !segment) return;
                      const kinds = [
                        "vocab",
                        "questions",
                        "video",
                        "answers",
                      ] as const;
                      goTo({ kind: kinds[index], segmentId: segment.id });
                    }}
                  >
                    <span
                      className={`step-progress-dot${
                        index < cycleIndex
                          ? " step-progress-dot-done"
                          : index === cycleIndex
                            ? " step-progress-dot-active"
                            : ""
                      }`}
                    >
                      {index < cycleIndex && (
                        <Check size={10} strokeWidth={3} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </div>
              ))}
            </nav>
          </div>
        ) : null}
      </div>

      <article className="mx-auto max-w-2xl px-4 py-6">
        <div key={encodePresentationStep(step)} className="step-panel">
          {step.kind === "warmup" && prompt.warmupQuestion ? (
            <div className="rounded-card border border-paper-line bg-surface p-4">
              <p className="text-label-sm text-text-muted">Para empezar</p>
              <p className="mt-2 font-heading text-story-body text-text-primary">
                {prompt.warmupQuestion}
              </p>
            </div>
          ) : null}

          {step.kind === "vocab" && segment ? (
            <VocabStep
              segment={segment}
              notes={notes}
              isTeacher={isTeacher}
              sessionId={sessionId}
            />
          ) : null}

          {step.kind === "questions" && segment ? (
            <QuestionsPreview segment={segment} />
          ) : null}

          {step.kind === "video" && segment ? (
            <VideoStep
              segment={segment}
              sessionId={sessionId}
              isTeacher={isTeacher}
              live={liveVideo}
            />
          ) : null}

          {step.kind === "answers" && segment ? (
            <AnswersStep
              segment={segment}
              sessionId={sessionId}
              isTeacher={isTeacher}
              reviewMode={phase === "after"}
              allowReveal={allowReveal}
              saveResponses={saveResponses}
              savedResponses={savedResponses}
              classAnswers={classAnswers}
              publishClassAnswer={publishClassAnswer}
              unlockAt={sessionEndTime}
            />
          ) : null}

          {step.kind === "done" ? (
            <p className="text-center text-label-md text-text-secondary">
              Eso es todo. Vuelve a este link después de clase para repasar.
            </p>
          ) : null}
        </div>

        {showNav ? (
          <nav className="step-nav" aria-label="Navegación de pasos">
            {prev ? (
              <button
                type="button"
                className="step-nav-btn"
                onClick={() => goTo(prev)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                {presentationStepLabel(prev)}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                type="button"
                className="step-nav-btn step-nav-btn-next"
                onClick={() => goTo(next)}
              >
                {step.kind === "warmup" ? "Empezar" : presentationStepLabel(next)}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : null}
          </nav>
        ) : (
          <p className="mt-6 text-center text-label-sm text-text-muted">
            El Profe Kyle está guiando la clase.
          </p>
        )}
        {isTeacher && liveVideo && !next ? (
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

function PresentationHeader({ title }: { title: string }) {
  return (
    <header className="px-4 pb-2 pt-2">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2">
          <BackLink href="/dashboard" showLabel />
          <p className="min-w-0 flex-1 text-label-sm text-text-muted">
            Profe Kyle
          </p>
        </div>
        <p className="mt-1 text-label-sm text-text-muted">Presentación</p>
        <h1 className="text-headline-md text-text-primary">{title}</h1>
      </div>
    </header>
  );
}

function VocabStep({
  segment,
  notes,
  isTeacher,
  sessionId,
}: {
  segment: PresentationSegment;
  notes: PresentationVocabNote[];
  isTeacher: boolean;
  sessionId: string;
}) {
  const noteByKey = useMemo(() => {
    const map = new Map<string, PresentationVocabNote>();
    for (const note of notes) {
      map.set(vocabNoteKey(note.segmentId, note.vocabEnglish), note);
    }
    return map;
  }, [notes]);

  return (
    <section className="space-y-3">
      <h2 className="text-headline-md text-text-primary">Vocabulario</h2>
      {segment.vocabulary.map((item) => (
        <VocabCard
          key={item.english}
          item={item}
          note={noteByKey.get(vocabNoteKey(segment.id, item.english)) ?? null}
          isTeacher={isTeacher}
          sessionId={sessionId}
          segmentId={segment.id}
        />
      ))}
    </section>
  );
}

function VocabCard({
  item,
  note,
  isTeacher,
  sessionId,
  segmentId,
}: {
  item: PresentationVocabItem;
  note: PresentationVocabNote | null;
  isTeacher: boolean;
  sessionId: string;
  segmentId: number;
}) {
  const [open, setOpen] = useState(false);
  const [spanish, setSpanish] = useState(item.spanish);
  const [noteText, setNoteText] = useState(note?.noteText ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSpanish(item.spanish);
  }, [item.spanish]);

  useEffect(() => {
    setNoteText(note?.noteText ?? "");
  }, [note?.noteText]);

  return (
    <div className="rounded-card border border-paper-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-story-body text-text-primary">
            {item.english}
          </p>
          <p className="mt-1 text-label-md text-text-secondary">
            {spanish}
          </p>
        </div>
        {isTeacher ? (
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent"
            aria-label={`Editar ${item.english}`}
            onClick={() => setOpen(true)}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {item.exampleSentence ? (
        <p className="mt-2 text-label-sm italic text-text-muted">
          {item.exampleSentence}
        </p>
      ) : null}
      {noteText ? (
        <p className="mt-2 text-label-sm text-text-secondary">{noteText}</p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar vocabulario"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="h-fit w-full max-w-md overflow-hidden rounded-sheet border border-paper-line bg-surface p-4">
            <p className="font-heading text-story-body text-text-primary">
              {item.english}
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-label-sm text-text-secondary">
                Español
              </span>
              <input
                value={spanish}
                onChange={(event) => setSpanish(event.target.value)}
                className="w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-label-sm text-text-secondary">
                Ejemplo para esta clase
              </span>
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              />
            </label>
            {error ? (
              <p className="mt-2 text-sm text-error">{error}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="h-11 flex-1 rounded-card border border-paper-line text-label-md text-text-secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                className="h-11 flex-1 rounded-card bg-accent text-label-md text-white disabled:opacity-60"
                onClick={async () => {
                  setPending(true);
                  setError("");
                  const spanishResult = await updatePresentationSpanish({
                    sessionId,
                    segmentId,
                    english: item.english,
                    spanish,
                  });
                  const noteResult = await upsertPresentationVocabNote({
                    sessionId,
                    segmentId,
                    english: item.english,
                    noteText,
                  });
                  setPending(false);
                  if (!spanishResult.ok) {
                    setError(spanishResult.error ?? "Algo salio mal.");
                    return;
                  }
                  if (!noteResult.ok) {
                    setError(noteResult.error ?? "Algo salio mal.");
                    return;
                  }
                  setOpen(false);
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuestionsPreview({ segment }: { segment: PresentationSegment }) {
  return (
    <section>
      <h2 className="text-headline-md text-text-primary">Preguntas</h2>
      <p className="mt-1 text-label-md text-text-secondary">
        Escucha para estas respuestas. Todavía no escribas.
      </p>
      <ol className="mt-4 space-y-3">
        {segment.comprehensionQuestions.map((question) => (
          <li
            key={question.id}
            className="rounded-card border border-paper-line bg-surface p-4 font-heading text-story-body text-text-primary"
          >
            {question.question}
          </li>
        ))}
      </ol>
    </section>
  );
}

function VideoStep({
  segment,
  sessionId,
  isTeacher,
  live,
}: {
  segment: PresentationSegment;
  sessionId: string;
  isTeacher: boolean;
  live: boolean;
}) {
  const videoId = youtubeEmbedId(segment.youtubeUrl);
  const startSeconds = youtubeStartSeconds(segment.youtubeUrl);
  if (!videoId) {
    return (
      <p className="text-label-md text-text-secondary">
        Este video no cargó. Avísale al Profe Kyle.
      </p>
    );
  }
  return (
    <section>
      <h2 className="sr-only">Video</h2>
      {live && !isTeacher ? (
        <p className="mb-3 text-label-md text-text-secondary">
          El Profe Kyle está controlando el video.
        </p>
      ) : null}
      <ClassroomYoutubePlayer
        key={`${videoId}-${startSeconds}`}
        videoId={videoId}
        title={segment.title ?? "Video"}
        sessionId={sessionId}
        isTeacher={isTeacher}
        live={live}
        startSeconds={startSeconds}
      />
    </section>
  );
}

function AnswersStep({
  segment,
  sessionId,
  isTeacher,
  reviewMode,
  allowReveal,
  saveResponses,
  savedResponses,
  classAnswers,
  publishClassAnswer,
  unlockAt,
}: {
  segment: PresentationSegment;
  sessionId: string;
  isTeacher: boolean;
  reviewMode: boolean;
  allowReveal: boolean;
  saveResponses: boolean;
  savedResponses: PresentationResponse[];
  classAnswers: PresentationClassAnswer[];
  publishClassAnswer: (next: PresentationClassAnswer) => void;
  unlockAt: string;
}) {
  const [canReveal, setCanReveal] = useState(allowReveal);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {};
    for (const row of savedResponses) {
      if (row.segmentId !== segment.id) continue;
      next[row.questionId] = row.responseText;
    }
    for (const row of classAnswers) {
      if (row.segmentId !== segment.id || !row.text) continue;
      if (isTeacher) next[row.questionId] = row.text;
    }
    return next;
  });
  const [revealed, setRevealed] = useState<Set<number>>(() => {
    const next = new Set<number>();
    for (const row of savedResponses) {
      if (row.segmentId !== segment.id || !row.revealedAnswer) continue;
      next.add(row.questionId);
    }
    return next;
  });
  const [readyIds, setReadyIds] = useState<Set<number>>(() => {
    const next = new Set<number>();
    for (const row of classAnswers) {
      if (row.segmentId !== segment.id || !row.ready) continue;
      next.add(row.questionId);
    }
    return next;
  });

  useEffect(() => {
    setReadyIds((prev) => {
      const next = new Set(prev);
      for (const row of classAnswers) {
        if (row.segmentId !== segment.id || !row.ready) continue;
        next.add(row.questionId);
      }
      return next;
    });
    if (isTeacher) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const row of classAnswers) {
        if (row.segmentId !== segment.id || !row.text) continue;
        next[row.questionId] = row.text;
      }
      return next;
    });
  }, [classAnswers, isTeacher, segment.id]);

  useEffect(() => {
    if (allowReveal) {
      setCanReveal(true);
      return;
    }
    const remaining = new Date(unlockAt).getTime() - Date.now();
    if (remaining <= 0) {
      setCanReveal(true);
      return;
    }
    const id = window.setTimeout(() => setCanReveal(true), remaining);
    return () => window.clearTimeout(id);
  }, [allowReveal, unlockAt]);

  const saveTimers = useRef<Record<number, number>>({});

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const id of Object.values(timers)) window.clearTimeout(id);
    };
  }, []);

  function scheduleStudentSave(questionId: number, text: string) {
    if (!saveResponses) return;
    if (saveTimers.current[questionId]) {
      window.clearTimeout(saveTimers.current[questionId]);
    }
    saveTimers.current[questionId] = window.setTimeout(() => {
      void savePresentationResponse({
        sessionId,
        segmentId: segment.id,
        questionId,
        responseText: text,
      });
    }, SAVE_DEBOUNCE_MS);
  }

  function scheduleClassSave(questionId: number, text: string, ready: boolean) {
    if (saveTimers.current[questionId]) {
      window.clearTimeout(saveTimers.current[questionId]);
    }
    saveTimers.current[questionId] = window.setTimeout(() => {
      const next = {
        segmentId: segment.id,
        questionId,
        text,
        ready,
      };
      if (ready) publishClassAnswer(next);
      void savePresentationClassAnswer({
        sessionId,
        segmentId: segment.id,
        questionId,
        responseText: text,
        ready,
      });
    }, SAVE_DEBOUNCE_MS);
  }

  const liveFollow = !isTeacher && !reviewMode;

  return (
    <section>
      <h2 className="text-headline-md text-text-primary">Respuestas</h2>
      <p className="mt-1 mb-4 text-label-md text-text-secondary">
        {isTeacher
          ? "Escribe la respuesta y toca Listo. Sale en el teléfono de ellos."
          : liveFollow
            ? "El Profe Kyle escribe la respuesta. Tú la ves aquí."
            : canReveal
              ? "Escribe tu respuesta y luego verifica si acertaste."
              : "Escribe tu respuesta. El Profe Kyle te dice cuándo puedes verificar."}
      </p>
      {error ? <p className="mb-3 text-sm text-error">{error}</p> : null}
      <div className="space-y-4">
        {segment.comprehensionQuestions.map((question, index) => {
          const isRevealed = revealed.has(question.id);
          const isReady = readyIds.has(question.id);
          const liveText =
            classAnswerForQuestion(classAnswers, segment.id, question.id)?.text ??
            "";
          return (
            <div
              key={question.id}
              className="rounded-card border border-paper-line bg-surface p-4"
            >
              <p className="mb-3 font-heading text-story-body text-text-primary">
                {index + 1}. {question.question}
              </p>
              {liveFollow ? (
                isReady && liveText ? (
                  <p className="rounded-card bg-surface-hover px-3 py-2 text-body-main text-text-primary">
                    {liveText}
                  </p>
                ) : (
                  <p className="text-label-md text-text-muted">
                    El Profe Kyle la escribe en un momento.
                  </p>
                )
              ) : (
                <textarea
                  className="w-full resize-none rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none"
                  placeholder="Escribe tu respuesta en ingles..."
                  rows={2}
                  value={answers[question.id] ?? ""}
                  disabled={!isTeacher && isRevealed}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAnswers((prev) => ({ ...prev, [question.id]: value }));
                    if (isTeacher) {
                      scheduleClassSave(
                        question.id,
                        value,
                        readyIds.has(question.id)
                      );
                    } else {
                      scheduleStudentSave(question.id, value);
                    }
                  }}
                  onBlur={(event) => {
                    const value = event.currentTarget.value;
                    if (isTeacher) {
                      const ready = readyIds.has(question.id);
                      const next = {
                        segmentId: segment.id,
                        questionId: question.id,
                        text: value,
                        ready,
                      };
                      if (ready) publishClassAnswer(next);
                      void savePresentationClassAnswer({
                        sessionId,
                        segmentId: segment.id,
                        questionId: question.id,
                        responseText: value,
                        ready,
                      });
                      return;
                    }
                    if (!saveResponses) return;
                    void savePresentationResponse({
                      sessionId,
                      segmentId: segment.id,
                      questionId: question.id,
                      responseText: value,
                    });
                  }}
                />
              )}
              {isTeacher ? (
                isReady ? (
                  <span
                    className="mt-3 inline-flex h-11 min-w-11 items-center justify-center rounded-card bg-success text-white"
                    aria-label="Listo"
                  >
                    <Check size={18} aria-hidden="true" />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="mt-3 h-11 rounded-card bg-accent px-4 text-label-md text-white"
                    onClick={() => {
                      const text =
                        (answers[question.id] ?? "").trim() || question.answer;
                      setError("");
                      setAnswers((prev) => ({ ...prev, [question.id]: text }));
                      setReadyIds((prev) => new Set(prev).add(question.id));
                      const next = {
                        segmentId: segment.id,
                        questionId: question.id,
                        text,
                        ready: true,
                      };
                      publishClassAnswer(next);
                      void savePresentationClassAnswer({
                        sessionId,
                        segmentId: segment.id,
                        questionId: question.id,
                        responseText: text,
                        ready: true,
                      }).then((result) => {
                        if (!result.ok) {
                          setError(result.error);
                          setReadyIds((prev) => {
                            const copy = new Set(prev);
                            copy.delete(question.id);
                            return copy;
                          });
                        }
                      });
                    }}
                  >
                    Listo
                  </button>
                )
              ) : null}
              {!isTeacher && reviewMode && question.answer && canReveal && !isRevealed ? (
                <button
                  type="button"
                  className="mt-3 h-11 rounded-card bg-accent px-4 text-label-md text-white"
                  onClick={() => {
                    setRevealed((prev) => new Set(prev).add(question.id));
                    if (saveResponses) {
                      void revealPresentationAnswer({
                        sessionId,
                        segmentId: segment.id,
                        questionId: question.id,
                      });
                    }
                  }}
                >
                  Ver respuesta
                </button>
              ) : null}
              {!isTeacher && reviewMode && isRevealed ? (
                <p className="mt-3 rounded-card bg-surface-hover px-3 py-2 text-body-main text-text-primary">
                  {question.answer}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
