"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateCourseTheme,
  type UpdateCourseThemeResult,
} from "@/app/teacher/actions";

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

export default function CourseThemeForm({
  courseId,
  theme,
}: {
  courseId: string;
  theme: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCourseTheme,
    null as UpdateCourseThemeResult | null
  );
  const [value, setValue] = useState(theme ?? "");

  useEffect(() => {
    setValue(theme ?? "");
  }, [theme]);

  useEffect(() => {
    if (state?.ok) setValue(state.theme ?? "");
  }, [state]);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Tema (opcional)
        </span>
        <input
          name="theme"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={80}
          className={fieldClass}
          placeholder="Viajes, comida, trabajo..."
        />
      </label>
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
        {isPending ? "Guardando..." : "Guardar tema"}
      </button>
    </form>
  );
}
