"use client";

import { useActionState, useState } from "react";
import { createSession, type CreateSessionResult } from "./actions";
import {
  defaultWritingMinutes,
  defaultExamTask2Type,
  type SessionType,
} from "@/lib/activities";
import type { CourseLevel } from "@/types";

const initialState: CreateSessionResult | null = null;
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const MINUTES = ["00", "15", "30", "45"];

type StoryOption = {
  id: string;
  title: string;
  kind?: string | null;
};

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400";

export default function CreateSessionForm({
  courseId,
  courseLevel,
  stories,
}: {
  courseId: string;
  courseLevel: CourseLevel;
  stories: StoryOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createSession,
    initialState
  );
  const [sessionType, setSessionType] = useState<SessionType>("story");
  const defaultMinutes = defaultWritingMinutes(courseLevel);
  const defaultTask2 = defaultExamTask2Type(courseLevel);
  const storyOptions = stories.filter((row) => row.kind !== "video_summary");
  const videoOptions = stories.filter((row) => row.kind === "video_summary");

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
      <input type="hidden" name="sessionType" value={sessionType} />

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-gray-700">
          Tipo de clase
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSessionType("story")}
            className={`h-11 rounded-lg border text-sm font-medium ${
              sessionType === "story"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Historia
          </button>
          <button
            type="button"
            onClick={() => setSessionType("writing")}
            className={`h-11 rounded-lg border text-sm font-medium ${
              sessionType === "writing"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Escritura
          </button>
          <button
            type="button"
            onClick={() => setSessionType("exam")}
            className={`h-11 rounded-lg border text-sm font-medium ${
              sessionType === "exam"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Examen
          </button>
          <button
            type="button"
            onClick={() => setSessionType("video_summary")}
            className={`h-11 rounded-lg border text-sm font-medium ${
              sessionType === "video_summary"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Video
          </button>
        </div>
      </fieldset>

      {sessionType === "story" ? (
        storyOptions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay historias de este nivel.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Historia
            </span>
            <select
              name="storyId"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Elige una historia
              </option>
              {storyOptions.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </label>
        )
      ) : sessionType === "writing" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Pregunta
            </span>
            <textarea
              name="promptText"
              required
              rows={4}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="What would you do if..."
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Tiempo
            </span>
            <select
              name="writingTimeMinutes"
              defaultValue={String(defaultMinutes)}
              className={fieldClass}
            >
              <option value="10">10 minutos (pre-intermedio)</option>
              <option value="20">20 minutos (intermedio)</option>
            </select>
          </label>
          {courseLevel === "intermediate" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Estructura (opcional)
                </span>
                <textarea
                  name="structureLesson"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Intro, thesis, supports, conclusion"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Rúbrica (opcional, sin puntaje)
                </span>
                <textarea
                  name="rubricText"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Lo que vas a comentar en clase"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ejemplo (opcional)
                </span>
                <textarea
                  name="exampleParagraph"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Tu párrafo de ejemplo, misma pregunta"
                />
              </label>
            </>
          )}
        </>
      ) : sessionType === "exam" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Nombre
            </span>
            <input
              name="examTitle"
              required
              className={fieldClass}
              placeholder="Examen noviembre"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Tema (opcional)
            </span>
            <input name="examTheme" className={fieldClass} placeholder="Travel" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Vocabulario
            </span>
            <textarea
              name="examVocab"
              required
              rows={6}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder={"go | ir\nwent | fue"}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Una por línea: english | spanish
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Tarea 1: fill-in
            </span>
            <textarea
              name="examTask1"
              required
              rows={6}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="The {niño|boy} {fue|went} home."
            />
            <span className="mt-1 block text-xs text-gray-500">
              Huecos: {"{español|english}"} o {"{español|english|var1,var2}"}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Tarea 2
            </span>
            <select
              name="examTask2Type"
              defaultValue={defaultTask2}
              className={fieldClass}
            >
              <option value="paragraph_restructuring">
                Reordenar párrafo (intermedio)
              </option>
              <option value="sentence_correction">
                Corregir oraciones (pre-intermedio)
              </option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Contenido de tarea 2</span>
            <textarea
              name="examTask2"
              required
              rows={8}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder={
                defaultTask2 === "paragraph_restructuring"
                  ? "A | First sentence of the paragraph.\nB | Second sentence."
                  : "ok | She is here.\nfix | She are here. | She is here."
              }
            />
            <span className="mt-1 block text-xs text-gray-500">
              {defaultTask2 === "paragraph_restructuring"
                ? "Letra correcta | oración (el orden de las líneas es el revuelto)."
                : "ok | sentence   o   fix | mal | bien"}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Tarea 3: traducción
            </span>
            <textarea
              name="examTask3"
              required
              rows={8}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Si yo fuera rico, viajaria. | If I were rich, I would travel."
            />
            <span className="mt-1 block text-xs text-gray-500">
              español | english | variación. Las 9 y 10 son condicionales.
            </span>
          </label>
          <input type="hidden" name="examTimeMinutes" value="35" />
        </>
      ) : videoOptions.length === 0 ? (
        <p className="text-sm text-gray-500">
          Todavía no hay un video de este nivel.
        </p>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">
            Video
          </span>
          <select
            name="storyId"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Elige un video
            </option>
            {videoOptions.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Día
        </span>
        <input type="date" name="sessionDate" required className={fieldClass} />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Inicio (90 minutos)
        </span>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="sr-only">Hora</span>
            <select name="startHour" required defaultValue="" className={fieldClass}>
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
              className={fieldClass}
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
        disabled={
          isPending ||
          (sessionType === "story" && storyOptions.length === 0) ||
          (sessionType === "video_summary" && videoOptions.length === 0)
        }
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Creando..." : "Crear clase"}
      </button>
    </form>
  );
}
