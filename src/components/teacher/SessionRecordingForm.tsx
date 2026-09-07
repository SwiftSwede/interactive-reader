"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  updateSessionRecordingUrl,
  type UpdateRecordingUrlResult,
} from "@/app/teacher/classes/[id]/actions";
import {
  YOUTUBE_URL_MAX_LENGTH,
  youtubeLinkLabel,
} from "@/lib/youtube-url";

const initialState: UpdateRecordingUrlResult | null = null;

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

export default function SessionRecordingForm({
  courseId,
  sessionId,
  recordingUrl,
}: {
  courseId: string;
  sessionId: string;
  recordingUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSessionRecordingUrl,
    initialState
  );
  const [savedUrl, setSavedUrl] = useState(recordingUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedUrl(recordingUrl);
  }, [recordingUrl]);

  useEffect(() => {
    if (state?.ok) setSavedUrl(state.recordingUrl);
  }, [state]);

  useEffect(() => {
    if (!savedUrl && state?.ok) {
      inputRef.current?.focus();
    }
  }, [savedUrl, state]);

  return (
    <section>
      <label
        htmlFor={savedUrl ? undefined : `session-recording-${sessionId}`}
        className="mb-1.5 block text-label-md text-text-secondary"
      >
        Grabación de YouTube
      </label>
      {savedUrl ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="recordingUrl" value="" />
          <div className="flex w-fit max-w-full items-center gap-1">
            <a
              href={savedUrl}
              target="_blank"
              rel="noreferrer"
              title={savedUrl}
              className="min-w-0 break-all text-body-main text-text-accent underline-offset-2 hover:underline"
            >
              {youtubeLinkLabel(savedUrl)}
            </a>
            <button
              type="submit"
              disabled={isPending}
              aria-label="Quitar la grabación"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent disabled:opacity-60"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-label-sm text-text-muted">
            Se ve después de la clase.
          </p>
          {state?.ok ? (
            <p className="text-label-sm text-text-secondary">{state.message}</p>
          ) : null}
        </form>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <label className="block">
            <input
              ref={inputRef}
              id={`session-recording-${sessionId}`}
              type="text"
              name="recordingUrl"
              inputMode="url"
              autoComplete="url"
              defaultValue=""
              maxLength={YOUTUBE_URL_MAX_LENGTH}
              placeholder="https://youtu.be/..."
              className={fieldClass}
            />
          </label>
          <p className="text-label-sm text-text-muted">
            Pega el link después de la clase. Vacío está bien.
          </p>
          {state && !state.ok ? (
            <p className="text-label-sm text-error">{state.error}</p>
          ) : null}
          {state?.ok ? (
            <p className="text-label-sm text-text-secondary">{state.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-card bg-accent px-5 py-3 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}
    </section>
  );
}
