"use client";

import { useActionState } from "react";
import { createSession, type CreateSessionResult } from "./actions";

const initialState: CreateSessionResult | null = null;
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const MINUTES = ["00", "15", "30", "45"];

type StoryOption = {
  id: string;
  title: string;
};

export default function CreateSessionForm({
  courseId,
  stories,
}: {
  courseId: string;
  stories: StoryOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createSession,
    initialState
  );

  if (stories.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Todavía no hay historias de este nivel.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const data = new FormData(form);
        const date = String(data.get("sessionDate") ?? "").trim();
        const hour = String(data.get("startHour") ?? "").trim();
        const minute = String(data.get("startMinute") ?? "").trim();
        if (!date || !hour || !minute) return;
        const start = new Date(`${date}T${hour}:${minute}:00`);
        const isoInput = form.elements.namedItem(
          "startIso"
        ) as HTMLInputElement;
        isoInput.value = start.toISOString();
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="startIso" defaultValue="" />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Historia
        </span>
        <select
          name="storyId"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="" disabled>
            Elige una historia
          </option>
          {stories.map((story) => (
            <option key={story.id} value={story.id}>
              {story.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Día
        </span>
        <input
          type="date"
          name="sessionDate"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Inicio (90 minutos)
        </span>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="sr-only">Hora</span>
            <select
              name="startHour"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="" disabled>
                Hora
              </option>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Minutos</span>
            <select
              name="startMinute"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="" disabled>
                Min
              </option>
              {MINUTES.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          La hora es la de tu teléfono, en intervalos de 15 minutos.
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Notas (opcional)
        </span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="Lo que quieras recordar de esta clase"
        />
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
        {isPending ? "Creando..." : "Crear clase"}
      </button>
    </form>
  );
}
