"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  updateCourseZoomUrl,
  type UpdateZoomUrlResult,
} from "@/app/teacher/actions";
import { ZOOM_URL_MAX_LENGTH } from "@/lib/zoom-url";

const initialState: UpdateZoomUrlResult | null = null;

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

function zoomLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export default function ZoomUrlForm({
  courseId,
  zoomUrl,
}: {
  courseId: string;
  zoomUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCourseZoomUrl,
    initialState
  );
  const [savedUrl, setSavedUrl] = useState(zoomUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedUrl(zoomUrl);
  }, [zoomUrl]);

  useEffect(() => {
    if (state?.ok) setSavedUrl(state.zoomUrl);
  }, [state]);

  useEffect(() => {
    if (!savedUrl && state?.ok) {
      inputRef.current?.focus();
    }
  }, [savedUrl, state]);

  return (
    <section className="mt-6">
      <label
        htmlFor={savedUrl ? undefined : "course-zoom-url"}
        className="mb-1.5 block text-label-md text-text-secondary"
      >
        Link de Zoom
      </label>
      {savedUrl ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="zoomUrl" value="" />
          <div className="flex w-fit max-w-full items-center gap-1">
            <a
              href={savedUrl}
              target="_blank"
              rel="noreferrer"
              title={savedUrl}
              className="min-w-0 break-all text-body-main text-text-accent underline-offset-2 hover:underline"
            >
              {zoomLinkLabel(savedUrl)}
            </a>
            <button
              type="submit"
              disabled={isPending}
              aria-label="Quitar el link de Zoom"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent disabled:opacity-60"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-label-sm text-text-muted">
            El mismo salón todo el mes.
          </p>
          {state?.ok ? (
            <p className="text-label-sm text-text-secondary">{state.message}</p>
          ) : null}
        </form>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <label className="block">
            <input
              ref={inputRef}
              id="course-zoom-url"
              type="text"
              name="zoomUrl"
              inputMode="url"
              autoComplete="url"
              defaultValue=""
              maxLength={ZOOM_URL_MAX_LENGTH}
              placeholder="https://zoom.us/j/..."
              className={fieldClass}
            />
          </label>
          <p className="text-label-sm text-text-muted">
            El mismo salón todo el mes. Vacío está bien.
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
