"use client";

import { useEffect, useRef, useState } from "react";
import ActionButton from "@/components/ActionButton";
import WordHelpSheet from "@/components/WordHelpSheet";
import { createQuestionRequest } from "@/app/ask/actions";
import {
  QUESTION_BODY_MAX,
  type QuestionSurface,
} from "@/lib/question-requests";

export type AskTeacherLayout = "inline" | "quiet-bar" | "header";

export default function AskTeacherButton({
  hidden = false,
  surface,
  storyId = null,
  courseSessionId = null,
  layout = "inline",
}: {
  hidden?: boolean;
  surface: QuestionSurface;
  storyId?: string | null;
  courseSessionId?: string | null;
  layout?: AskTeacherLayout;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  if (hidden) return null;

  function close() {
    setOpen(false);
    setError("");
    setSent(false);
    setPending(false);
    setBody("");
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Escribe tu pregunta en el recuadro.");
      return;
    }
    setPending(true);
    setError("");
    const result = await createQuestionRequest({
      surface,
      body: trimmed,
      storyId,
      courseSessionId,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    closeTimer.current = window.setTimeout(() => {
      close();
    }, 1100);
  }

  const circle = (
    <button
      type="button"
      className={
        layout === "header" ? "ask-teacher-btn ask-teacher-btn-header" : "ask-teacher-btn"
      }
      aria-label="Preguntar al Profe"
      onClick={() => {
        setOpen(true);
        setSent(false);
        setError("");
      }}
    >
      ?
    </button>
  );

  const control =
    layout === "quiet-bar" ? (
      <nav className="step-nav step-nav-ask" aria-label="Preguntar al Profe">
        <span />
        {circle}
        <span />
      </nav>
    ) : (
      circle
    );

  return (
    <>
      {control}
      <WordHelpSheet
        open={open}
        onClose={close}
        title="¿No sabes cómo decirlo?"
      >
        {sent ? (
          <p className="text-body-main text-text-primary">
            Enviado. Pregúntame en el descanso.
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="sr-only">Tu pregunta</span>
              <textarea
                autoFocus
                rows={4}
                maxLength={QUESTION_BODY_MAX}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={pending}
                placeholder="Escríbelo en español, o hazme una pregunta sobre la lección"
                className="min-h-[96px] w-full resize-y rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none disabled:bg-surface-hover"
              />
            </label>
            {error ? (
              <p className="mt-2 text-label-sm text-error">{error}</p>
            ) : null}
            <ActionButton
              type="submit"
              className="mt-4 w-full"
              state={pending ? "pending" : "idle"}
              pendingLabel="Enviando..."
            >
              Enviar
            </ActionButton>
          </form>
        )}
      </WordHelpSheet>
    </>
  );
}
