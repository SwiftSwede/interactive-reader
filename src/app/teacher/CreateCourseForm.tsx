"use client";

import { useActionState } from "react";
import { createCourse, type CreateCourseResult } from "./actions";

const initialState: CreateCourseResult | null = null;

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

export default function CreateCourseForm() {
  const [state, formAction, isPending] = useActionState(
    createCourse,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Nombre del curso
        </span>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          className={fieldClass}
          placeholder="Inglés Intermedio"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Nivel
        </span>
        <select name="level" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Elige un nivel
          </option>
          <option value="pre-intermediate">Pre-intermedio</option>
          <option value="intermediate">Intermedio</option>
        </select>
      </label>

      {state && !state.ok && (
        <p className="text-label-sm text-error">{state.error}</p>
      )}

      {state && state.ok && (
        <p className="text-label-sm text-text-secondary">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-5 py-3 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "Creando..." : "Crear curso"}
      </button>
    </form>
  );
}
