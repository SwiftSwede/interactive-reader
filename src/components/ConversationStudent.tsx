"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackLink from "@/components/BackLink";
import EndClassButton from "@/components/EndClassButton";
import { createClient } from "@/lib/supabase/client";
import { getSessionPhase } from "@/lib/session-phase";
import {
  CONVERSATION_ROUND_EVENT,
  conversationChannelName,
  conversationPlanLabels,
  formatRoundClock,
  isRoundsComplete,
  parseConversationRoundSync,
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
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const applySync = useCallback((value: unknown) => {
    const next = parseConversationRoundSync(value);
    if (!next) return;
    setPlan(next.conversationPlan);
    setCurrent(next.roundCurrent);
    setState(next.roundState);
    setStartedAt(next.roundStartedAt);
    if (next.classEndedAt !== undefined) {
      setEndedAt(next.classEndedAt);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(conversationChannelName(sessionId), {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: CONVERSATION_ROUND_EVENT }, (message) => {
        applySync(message.payload);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "course_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => applySync(payload.new)
      )
      .subscribe();
    channelRef.current = channel;

    function pullRound() {
      void supabase
        .from("course_sessions")
        .select(
          "conversation_plan, round_current, round_state, round_started_at, class_ended_at"
        )
        .eq("id", sessionId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) applySync(data);
        });
    }

    if (!isTeacher) {
      pullRound();
    }
    const poll = isTeacher
      ? null
      : window.setInterval(pullRound, 2000);

    return () => {
      channelRef.current = null;
      if (poll) window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, applySync, isTeacher]);

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

  async function runAction(action: () => Promise<ConversationActionResult>) {
    setPending(true);
    setError("");
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applySync(result);
    void channelRef.current?.send({
      type: "broadcast",
      event: CONVERSATION_ROUND_EVENT,
      payload: result,
    });
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
              <span className="w-6 shrink-0 font-heading text-story-body text-text-primary">
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
