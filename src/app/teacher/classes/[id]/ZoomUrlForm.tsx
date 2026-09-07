"use client";

import { useActionState } from "react";
import {
  updateCourseZoomUrl,
  type UpdateZoomUrlResult,
} from "@/app/teacher/actions";
import { ZOOM_URL_MAX_LENGTH } from "@/lib/zoom-url";

const initialState: UpdateZoomUrlResult | null = null;

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

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

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Link de Zoom
        </span>
        <input
          type="text"
          name="zoomUrl"
          inputMode="url"
          autoComplete="url"
          defaultValue={zoomUrl ?? ""}
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
  );
}
