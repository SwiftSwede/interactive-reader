"use client";

import { useCallback, useEffect, useState } from "react";
import { evalUiCopy } from "@/lib/evaluacion/copy";
import type { PairVerdict } from "@/lib/evaluacion/pairs";
import type { EvalResult as EvalResultData } from "@/lib/evaluacion/result";
import { track } from "@/lib/evaluacion/track";
import type { Opener } from "@/lib/evaluacion/types";
import type { EvalView } from "@/lib/evaluacion/view";
import { evalApi, EvalRequestError } from "./evalApi";
import { EvalHeader, EvalQuestion } from "./EvalQuestion";
import { EvalResult } from "./EvalResult";
import {
  EvalErrorState,
  EvalLoading,
  EvalOpener,
  EvalSplash,
  EvalTransition,
} from "./EvalScreens";

type QuestionScreen = Extract<EvalView, { screen: "question" }>;

type Phase =
  | { name: "loading" }
  | { name: "error"; message: string }
  | { name: "splash"; resume: QuestionScreen | null }
  | { name: "opener" }
  | { name: "transition"; view: QuestionScreen }
  | { name: "question"; view: QuestionScreen }
  | { name: "result"; result: EvalResultData; listening: PairVerdict[]; emailCaptured: boolean }
  | { name: "redirecting" };

function messageOf(error: unknown): string {
  return error instanceof EvalRequestError ? error.message : evalUiCopy.error;
}

export function EvaluacionFlow() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const show = useCallback((next: Phase) => {
    setInlineError(null);
    setPhase(next);
    window.scrollTo({ top: 0 });
  }, []);

  const applyView = useCallback(
    (view: EvalView, fromAnswer: boolean) => {
      if (view.screen === "redirected") {
        track("beginner_redirect");
        show({ name: "redirecting" });
        window.location.assign(view.url);
        return;
      }
      if (view.screen === "result") {
        track("result_shown", { outcome: view.result.outcome, track: view.result.placedTrack });
        show({
          name: "result",
          result: view.result,
          listening: view.listening,
          emailCaptured: view.emailCaptured,
        });
        return;
      }
      if (view.transition) {
        if (fromAnswer) track("track_complete", { next: view.transition });
        show({ name: "transition", view });
        return;
      }
      setInlineError(null);
      setPhase({ name: "question", view });
    },
    [show],
  );

  const receiveState = useCallback(
    (view: EvalView | null) => {
      if (!view) show({ name: "splash", resume: null });
      else applyView(view, false);
    },
    [applyView, show],
  );

  const load = useCallback(async () => {
    setPhase({ name: "loading" });
    try {
      receiveState((await evalApi.state()).view);
    } catch (error) {
      show({ name: "error", message: messageOf(error) });
    }
  }, [receiveState, show]);

  useEffect(() => {
    let cancelled = false;
    evalApi
      .state()
      .then(({ view }) => {
        if (!cancelled) receiveState(view);
      })
      .catch((error: unknown) => {
        if (!cancelled) show({ name: "error", message: messageOf(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [receiveState, show]);

  async function start(opener: Opener) {
    setBusy(true);
    setInlineError(null);
    try {
      const { view } = await evalApi.start(opener);
      if (view.screen === "question") track("quiz_start", { opener });
      applyView(view, false);
    } catch (error) {
      setInlineError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  async function answer(itemId: string, optionId: string) {
    setBusy(true);
    setInlineError(null);
    try {
      const { view } = await evalApi.answer(itemId, optionId);
      applyView(view, true);
    } catch (error) {
      if (error instanceof EvalRequestError && (error.status === 404 || error.status === 409)) {
        await load();
      } else {
        setInlineError(messageOf(error));
      }
    } finally {
      setBusy(false);
    }
  }

  function quit(view: QuestionScreen) {
    if (window.confirm(evalUiCopy.quitConfirm)) show({ name: "splash", resume: view });
  }

  return (
    <>
      {phase.name === "question" ? (
        <EvalHeader progress={phase.view.progress} onQuit={() => quit(phase.view)} />
      ) : null}
      <main className="ev-main">
        {phase.name === "loading" || phase.name === "redirecting" ? (
          phase.name === "redirecting" ? (
            <div className="ev-column ev-center">
              <p className="ev-body" role="status">
                {evalUiCopy.redirecting}
              </p>
            </div>
          ) : (
            <EvalLoading />
          )
        ) : null}

        {phase.name === "error" ? (
          <EvalErrorState message={phase.message} onRetry={() => void load()} />
        ) : null}

        {phase.name === "splash" ? (
          <EvalSplash
            canResume={Boolean(phase.resume)}
            onStart={() => show({ name: "opener" })}
            onResume={() => phase.resume && show({ name: "question", view: phase.resume })}
          />
        ) : null}

        {phase.name === "opener" ? (
          <EvalOpener busy={busy} error={inlineError} onChoose={(opener) => void start(opener)} />
        ) : null}

        {phase.name === "transition" ? (
          <EvalTransition
            transition={phase.view.transition ?? "confirmation"}
            onContinue={() => show({ name: "question", view: phase.view })}
          />
        ) : null}

        {phase.name === "question" ? (
          <EvalQuestion
            key={phase.view.question.itemId}
            question={phase.view.question}
            busy={busy}
            error={inlineError}
            onSubmit={(optionId) => void answer(phase.view.question.itemId, optionId)}
          />
        ) : null}

        {phase.name === "result" ? (
          <EvalResult
            result={phase.result}
            listening={phase.listening}
            emailCaptured={phase.emailCaptured}
            onRetake={() => show({ name: "opener" })}
          />
        ) : null}
      </main>
    </>
  );
}
