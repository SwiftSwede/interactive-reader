"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import ActionButton from "@/components/ActionButton";
import { parseInlineMarks, type SessionItem } from "@/lib/drill-session";

type Feedback =
  | { kind: "correct" }
  | { kind: "graduated" }
  | { kind: "wrong"; expected: string };

type AttemptResponse = {
  correct: boolean;
  graduated: boolean;
  collectionCount: number;
  expected?: string;
};

const INPUT_CLASS =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary focus:border-2 focus:border-accent focus:outline-none";

function MarkedText({ text }: { text: string }) {
  return parseInlineMarks(text).map((span, spanIndex) => {
    if (span.kind === "strong") {
      return <strong key={spanIndex}>{span.value}</strong>;
    }
    if (span.kind === "em") {
      return <em key={spanIndex}>{span.value}</em>;
    }
    return <span key={spanIndex}>{span.value}</span>;
  });
}

function ClozeSentence({ text }: { text: string }) {
  const parts = text.split("___");
  return (
    <p lang="en" className="text-story-body text-text-primary">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 ? (
            <span
              className="mx-1 inline-block min-w-16 border-b-2 border-text-muted align-baseline"
              aria-label="espacio en blanco"
            >
              &nbsp;
            </span>
          ) : null}
        </span>
      ))}
    </p>
  );
}

function CollectionLine({ count }: { count: number }) {
  return (
    <p className="text-label-md text-text-secondary">Tu colección: {count}</p>
  );
}

function BackToTools() {
  return (
    <div className="mt-6 flex justify-end">
      <Link
        href="/tools"
        className="inline-flex min-h-12 items-center justify-center rounded-card border border-paper-line px-5 text-label-md font-medium text-text-primary hover:bg-surface-hover active:bg-surface-hover"
      >
        Volver a Herramientas
      </Link>
    </div>
  );
}

export default function DrillSession({
  missionName,
  deck,
  initialCollectionCount,
}: {
  missionName: string;
  deck: SessionItem[];
  initialCollectionCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionCount, setCollectionCount] = useState(initialCollectionCount);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  if (deck.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-body-main text-text-secondary">Hoy no hay más.</p>
        <div className="mt-2">
          <CollectionLine count={collectionCount} />
        </div>
        <BackToTools />
      </div>
    );
  }

  if (index >= deck.length) {
    return (
      <div className="mt-8">
        <p className="text-body-main text-text-secondary">
          Eso es todo por hoy.
        </p>
        <div className="mt-2">
          <CollectionLine count={collectionCount} />
        </div>
        <BackToTools />
      </div>
    );
  }

  const item = deck[index]!;
  const header = item.repaso ? "práctica de repaso" : missionName;

  const advance = () => {
    setIndex((current) => current + 1);
    setAnswer("");
    setFeedback(null);
    setError(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (item.format === "teach" || feedback || pending) return;
    if (!answer.trim()) {
      const choosingNow = Boolean(item.options);
      setError(choosingNow ? "Elige una." : "Escribe tu respuesta primero.");
      if (!choosingNow) inputRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/drills/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, answer }),
      });
      const body = (await response.json().catch(() => null)) as
        | AttemptResponse
        | { error?: string }
        | null;
      if (!response.ok || !body || !("correct" in body)) {
        const message =
          body && "error" in body && body.error
            ? body.error
            : "Algo salió mal. Intenta de nuevo.";
        console.error("drill attempt failed:", response.status, message);
        setError(message);
        return;
      }
      setCollectionCount(body.collectionCount);
      if (!body.correct) {
        setFeedback({ kind: "wrong", expected: body.expected ?? "" });
      } else {
        setFeedback({ kind: body.graduated ? "graduated" : "correct" });
      }
    } catch (fetchError) {
      console.error("drill attempt failed:", fetchError);
      setError("Algo salió mal. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-6">
      <p className="text-label-sm text-text-muted">{header}</p>

      {item.format === "teach" ? (
        <>
          <div className="mt-4">
            <p lang="es" className="text-story-body text-text-primary">
              <MarkedText text={item.lead} />
            </p>
            {item.examples.length > 0 ? (
              <ul className="mt-6 flex flex-col gap-3">
                {item.examples.map((example) => (
                  <li
                    key={example}
                    lang="en"
                    className="border-l border-paper-line pl-4 text-story-body italic text-text-primary"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            ) : null}
            {item.closing ? (
              <p lang="es" className="mt-6 text-body-main text-text-muted">
                <MarkedText text={item.closing} />
              </p>
            ) : null}
          </div>
          <div className="mt-8 flex justify-end">
            <ActionButton onClick={advance} className="min-h-12">
              Siguiente
            </ActionButton>
          </div>
        </>
      ) : (
        <form onSubmit={onSubmit} className="mt-4" noValidate>
          {item.format === "cloze" ? (
            <ClozeSentence text={item.text} />
          ) : (
            <p lang="es" className="text-story-body text-text-primary">
              {item.prompt}
            </p>
          )}

          {item.options ? (
            <ul className="mt-6 flex flex-col gap-2" aria-label="Opciones">
              {item.options.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    lang="en"
                    disabled={feedback != null}
                    onClick={() => {
                      setAnswer(option);
                      setError(null);
                    }}
                    aria-pressed={answer === option}
                    className={`min-h-11 w-full rounded-card border px-3 py-2 text-left text-body-main disabled:opacity-100 ${
                      answer === option
                        ? "border-accent bg-accent-softer text-text-primary"
                        : "border-paper-line bg-surface text-text-primary hover:bg-surface-hover"
                    }`}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <label htmlFor={inputId} className="mt-6 mb-1 block text-label-sm text-text-secondary">
                {item.format === "cloze" ? "La palabra que falta" : "En inglés"}
              </label>
              <input
                id={inputId}
                ref={inputRef}
                lang="en"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setError(null);
                }}
                readOnly={feedback != null}
                maxLength={500}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={INPUT_CLASS}
              />
            </>
          )}

          <div className="mt-3 min-h-6" role="status" aria-live="polite">
            {error ? <p className="text-label-md text-error">{error}</p> : null}
            {feedback?.kind === "correct" ? (
              <p className="inline-flex items-center gap-1 text-label-md text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                Esa sí.
              </p>
            ) : null}
            {feedback?.kind === "graduated" ? (
              <p className="inline-flex items-center gap-1 text-label-md text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                Se sumó a tu colección.
              </p>
            ) : null}
            {feedback?.kind === "wrong" ? (
              <p className="text-label-md text-text-secondary">
                Era: <span lang="en">{feedback.expected}</span>
                {/[.?!]$/.test(feedback.expected) ? "" : "."}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex justify-end">
            {feedback ? (
              <ActionButton onClick={advance} className="min-h-12">
                Siguiente
              </ActionButton>
            ) : (
              <ActionButton
                type="submit"
                state={pending ? "pending" : "idle"}
                pendingLabel="Comprobando…"
                className="min-h-12"
              >
                Comprobar
              </ActionButton>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
