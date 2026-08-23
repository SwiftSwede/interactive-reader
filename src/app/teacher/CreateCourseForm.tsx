"use client";

import { useActionState } from "react";
import { createCourse, type CreateCourseResult } from "./actions";

const initialState: CreateCourseResult | null = null;

export default function CreateCourseForm() {
  const [state, formAction, isPending] = useActionState(
    createCourse,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Nombre del curso
        </span>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="Inglés Intermedio"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Nivel
        </span>
        <select
          name="level"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="" disabled>
            Elige un nivel
          </option>
          <option value="pre-intermediate">Pre-intermedio</option>
          <option value="intermediate">Intermedio</option>
        </select>
      </label>

      {state && !state.ok && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {state && state.ok && (
        <p className="text-sm text-gray-700">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Creando..." : "Crear curso"}
      </button>
    </form>
  );
}
