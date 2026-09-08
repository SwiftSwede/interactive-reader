"use client";

import { useEffect, useMemo, useState } from "react";
import BackLink from "@/components/BackLink";
import EndClassButton from "@/components/EndClassButton";
import { createClient } from "@/lib/supabase/client";
import { getSessionPhase } from "@/lib/session-phase";
import {
  conversationPlanLabels,
  formatRoundClock,
  isConversationPlan,
  isConversationRoundState,
  isRoundsComplete,
  roundLengthSeconds,
  roundTotal,
  secondsLeft,
} from "@/lib/conversation";
import {
  nextConversationRound,
  pauseConversationRound,
  resetConversationRound,
  resumeConversationRound,
  setConversationPlan,
  type ConversationActionResult,
  type ConversationRoundSnapshot,
} from "@/app/teacher/conversation-actions";
import type {
  ConversationPlan,
  ConversationPrompt,
  ConversationRoundState,
  CourseLevel,
} from "@/types";

export default function ConversationStudent({
  prompt,
  courseLevel,
  courseId,
  sessionId,
  isTeacher,
  sessionStartTime,
  sessionEndTime,
  classEndedAt,
  conversationPlan,
  roundCurrent,
  roundState,
  roundStartedAt,
}: {
  prompt: ConversationPrompt;
  courseLevel: CourseLevel;
  courseId: string;
  sessionId: string;
  isTeacher: boolean;
  sessionStartTime: string;
  sessionEndTime: string;
  classEndedAt: string | null;
  conversationPlan: ConversationPlan;
  roundCurrent: number;
  roundState: ConversationRoundState;
  roundStartedAt: string | null;
}) {
  const [plan, setPlan] = useState(conversationPlan);
  const [current, setCurrent] = useState(roundCurrent);
  const [state, setState] = useState(roundState);
  const [startedAt, setStartedAt] = useState(roundStartedAt);
  const [endedAt, setEndedAt] = useState(classEndedAt);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [frozenLeft, setFrozenLeft] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-session-${sessionId}`)
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
            conversation_plan?: string | null;
            round_current?: number | string | null;
            round_state?: string | null;
            round_started_at?: string | null;
            class_ended_at?: string | null;
          };
          if (isConversationPlan(row.conversation_plan)) {
            setPlan(row.conversation_plan);
          }
          const nextCurrent = Number(row.round_current);
          if (Number.isFinite(nextCurrent)) {
            setCurrent(nextCurrent);
          }
          if (isConversationRoundState(row.round_state)) {
            setState(row.round_state);
          }
          setStartedAt(row.round_started_at ?? null);
          if (row.class_ended_at !== undefined) {
            setEndedAt(row.class_ended_at ?? null);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const length = roundLengthSeconds(plan, courseLevel);
  const total = roundTotal(plan);
  const afterClass =
    Boolean(endedAt) ||
    getSessionPhase(
      {
        sessionStartTime,
        sessionEndTime,
        classEndedAt: endedAt,
      },
      new Date(nowMs)
    ) === "after";
  const showRounds = plan !== "open" && !afterClass;
  const done = isRoundsComplete(current, plan);
  const waiting = current === 0;
  const running = showRounds && state === "running" && !waiting && !done;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (state === "stopped" && showRounds && !waiting && !done) {
      setFrozenLeft(
        secondsLeft({
          roundLengthSeconds: length,
          roundStartedAt: startedAt,
          now: new Date(),
        })
      );
      return;
    }
    setFrozenLeft(null);
  }, [state, startedAt, length, showRounds, waiting, done]);

  const remaining = useMemo(() => {
    if (frozenLeft !== null) return frozenLeft;
    return secondsLeft({
      roundLengthSeconds: length,
      roundStartedAt: startedAt,
      now: new Date(nowMs),
    });
  }, [frozenLeft, length, startedAt, nowMs]);

  const elapsedSeconds = Math.max(0, length - remaining);
  const lastThirty = remaining > 0 && remaining <= 30;
  const timedOut = running && remaining === 0;
  const canAdvance = isTeacher && showRounds && !done;
  const canPauseReset = isTeacher && showRounds && !waiting && !done;
  const nextLabel = current === total && !waiting ? "Terminar" : "Siguiente";

  function applySnapshot(snap: ConversationRoundSnapshot) {
    setPlan(snap.conversationPlan);
    setCurrent(snap.roundCurrent);
    setState(snap.roundState);
    setStartedAt(snap.roundStartedAt);
  }

  async function runAction(action: () => Promise<ConversationActionResult>) {
    setPending(true);
    setError("");
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applySnapshot(result);
  }

  return (
    <main className="story-page min-h-screen">
      <header className="px-4 pb-2 pt-2">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <BackLink
              href={isTeacher ? `/teacher/classes/${courseId}` : "/dashboard"}
              showLabel
            />
            <p className="min-w-0 flex-1 text-label-sm text-text-muted">
              Profe Kyle
            </p>
          </div>
          <p className="mt-1 text-label-sm text-text-muted">Conversación</p>
          <h1 className="text-headline-md text-text-primary">{prompt.title}</h1>
          {prompt.theme ? (
            <p className="mt-1 text-label-sm text-text-secondary">
              {prompt.theme}
            </p>
          ) : null}
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-6">
        {isTeacher && !afterClass && current === 0 ? (
          <fieldset className="mb-6">
            <legend className="mb-2 text-label-md font-medium text-text-secondary">
              Plan de rondas
            </legend>
            <div className="grid gap-2">
              {conversationPlanLabels(courseLevel).map((option) => (
                <label
                  key={option.plan}
                  className={`flex min-h-11 items-center gap-3 rounded-card border px-3 ${
                    plan === option.plan
                      ? "border-accent bg-accent-soft"
                      : "border-paper-line bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="conversation-plan"
                    className="h-5 w-5 accent-[var(--accent)]"
                    checked={plan === option.plan}
                    disabled={pending}
                    onChange={() => {
                      setPlan(option.plan);
                      void runAction(() =>
                        setConversationPlan({
                          sessionId,
                          plan: option.plan,
                        })
                      );
                    }}
                  />
                  <span className="text-label-md text-text-primary">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {showRounds ? (
          <div className="mb-6 rounded-card border border-paper-line bg-surface p-4">
            {waiting ? (
              <p className="font-heading text-story-body text-text-primary">
                Esperando al profe
              </p>
            ) : done ? (
              <p className="font-heading text-story-body text-text-primary">
                Eso es todo
              </p>
            ) : (
              <>
                <p className="text-label-sm text-text-muted">
                  Ronda {current} de {total}
                </p>
                {state === "stopped" ? (
                  <p className="mt-2 font-heading text-headline-md text-text-primary">
                    Pausado
                  </p>
                ) : timedOut ? (
                  <p className="mt-2 font-heading text-headline-md text-accent">
                    Tiempo
                  </p>
                ) : (
                  <p
                    className={`mt-2 font-heading text-headline-lg tabular-nums ${
                      lastThirty ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {formatRoundClock(remaining)}
                  </p>
                )}
              </>
            )}

            {isTeacher && showRounds ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={pending || !canAdvance}
                  onClick={() =>
                    void runAction(() =>
                      nextConversationRound({ sessionId })
                    )
                  }
                  className="h-11 rounded-card bg-accent px-4 text-label-md font-medium text-white disabled:opacity-60"
                >
                  {nextLabel}
                </button>
                <button
                  type="button"
                  disabled={pending || !canPauseReset}
                  onClick={() =>
                    void runAction(() =>
                      resetConversationRound({ sessionId })
                    )
                  }
                  className="h-11 rounded-card border border-paper-line text-label-md disabled:opacity-60"
                >
                  Reiniciar
                </button>
                <button
                  type="button"
                  disabled={pending || !canPauseReset}
                  onClick={() =>
                    void runAction(() =>
                      state === "stopped"
                        ? resumeConversationRound({
                            sessionId,
                            elapsedSeconds,
                          })
                        : pauseConversationRound({ sessionId })
                    )
                  }
                  className="col-span-2 h-11 rounded-card border border-paper-line text-label-md disabled:opacity-60"
                >
                  {state === "stopped" ? "Reanudar" : "Pausar"}
                </button>
              </div>
            ) : null}
            {error ? (
              <p className="mt-2 text-label-sm text-error">{error}</p>
            ) : null}
          </div>
        ) : null}

        <ol className="space-y-4">
          {prompt.questions.map((question, index) => (
            <li key={question.id} className="flex gap-3">
              <span className="mt-1 w-6 shrink-0 text-label-md text-text-muted">
                {index + 1}.
              </span>
              <p className="font-heading text-story-body text-text-primary">
                {question.question}
              </p>
            </li>
          ))}
        </ol>

        {isTeacher ? (
          <EndClassButton
            sessionId={sessionId}
            classEndedAt={endedAt}
            onEnded={setEndedAt}
          />
        ) : null}
      </article>
    </main>
  );
}
