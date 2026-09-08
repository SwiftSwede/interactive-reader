"use client";

import { useActionState, useEffect, useState } from "react";
import { createSession, type CreateSessionResult } from "./actions";
import {
  defaultWritingMinutes,
  defaultExamTask2Type,
  type SessionType,
} from "@/lib/activities";
import { appendNumberedQuestions } from "@/lib/conversation";
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

type PresentationOption = {
  id: string;
  title: string;
};

type ConversationCopyOption = {
  id: string;
  title: string;
  questions: string[];
};

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-base text-text-primary focus:border-2 focus:border-accent focus:outline-none";

export default function CreateSessionForm({
  courseId,
  courseLevel,
  stories,
  presentationPrompts,
  conversationCopyPrompts,
  onCreated,
}: {
  courseId: string;
  courseLevel: CourseLevel;
  stories: StoryOption[];
  presentationPrompts: PresentationOption[];
  conversationCopyPrompts: ConversationCopyOption[];
  onCreated?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createSession,
    initialState
  );
  const [sessionType, setSessionType] = useState<SessionType>("story");
  const [promptText, setPromptText] = useState("");
  const [copyPromptId, setCopyPromptId] = useState("");
  const [conversationQuestions, setConversationQuestions] = useState([
    "",
    "",
    "",
    "",
  ]);

  useEffect(() => {
    if (state?.ok) onCreated?.();
  }, [state?.ok, onCreated]);
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
        <legend className="mb-1.5 block text-sm font-medium text-text-secondary">
          Tipo de clase
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSessionType("story")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "story"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Historia
          </button>
          <button
            type="button"
            onClick={() => setSessionType("writing")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "writing"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Escritura
          </button>
          <button
            type="button"
            onClick={() => setSessionType("exam")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "exam"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Examen
          </button>
          <button
            type="button"
            onClick={() => setSessionType("video_summary")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "video_summary"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Traducción
          </button>
          {courseLevel === "intermediate" ? (
            <button
              type="button"
              onClick={() => setSessionType("presentation")}
              className={`h-11 rounded-card border text-sm font-medium ${
                sessionType === "presentation"
                  ? "border-accent bg-accent text-white"
                  : "border-paper-line text-text-primary"
              }`}
            >
              Presentación
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSessionType("conversation")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "conversation"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Conversación
          </button>
        </div>
      </fieldset>

      {sessionType === "story" ? (
        storyOptions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay historias de este nivel.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
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
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Pregunta
            </span>
            <textarea
              name="promptText"
              required
              rows={4}
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              className="w-full resize-y rounded-card border border-paper-line px-3 py-3 text-base text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              placeholder="What would you do if..."
            />
          </label>
          {courseLevel === "pre-intermediate" &&
          conversationCopyPrompts.length > 0 ? (
            <div className="rounded-card border border-paper-line bg-surface p-3">
              <p className="mb-2 text-sm font-medium text-text-secondary">
                Copiar preguntas de Clase 4
              </p>
              <select
                value={copyPromptId}
                onChange={(event) => setCopyPromptId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Elige un set</option>
                {conversationCopyPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!copyPromptId}
                onClick={() => {
                  const prompt = conversationCopyPrompts.find(
                    (row) => row.id === copyPromptId
                  );
                  if (!prompt) return;
                  setPromptText(
                    appendNumberedQuestions(promptText, prompt.questions)
                  );
                }}
                className="mt-2 h-11 w-full rounded-card border border-paper-line text-sm font-medium disabled:opacity-60"
              >
                Copiar preguntas
              </button>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
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
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Estructura (opcional)
                </span>
                <textarea
                  name="structureLesson"
                  rows={3}
                  className="w-full resize-y rounded-card border border-paper-line px-3 py-2 text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
                  placeholder="Intro, thesis, supports, conclusion"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Rúbrica (opcional, sin puntaje)
                </span>
                <textarea
                  name="rubricText"
                  rows={3}
                  className="w-full resize-y rounded-card border border-paper-line px-3 py-2 text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
                  placeholder="Lo que vas a comentar en clase"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Ejemplo (opcional)
                </span>
                <textarea
                  name="exampleParagraph"
                  rows={4}
                  className="w-full resize-y rounded-card border border-paper-line px-3 py-2 text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
                  placeholder="Tu párrafo de ejemplo, misma pregunta"
                />
              </label>
            </>
          )}
        </>
      ) : sessionType === "exam" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
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
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Tema (opcional)
            </span>
            <input name="examTheme" className={fieldClass} placeholder="Travel" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Vocabulario
            </span>
            <textarea
              name="examVocab"
              required
              rows={6}
              className="w-full resize-y rounded-card border border-paper-line px-3 py-2 font-mono text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              placeholder={"go | ir\nwent | fue"}
            />
            <span className="mt-1 block text-xs text-text-muted">
              Una por línea: english | spanish
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Tarea 1: fill-in
            </span>
            <textarea
              name="examTask1"
              required
              rows={6}
              className="w-full resize-y rounded-card border border-paper-line px-3 py-2 font-mono text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              placeholder="The {niño|boy} {fue|went} home."
            />
            <span className="mt-1 block text-xs text-text-muted">
              Huecos: {"{español|english}"} o {"{español|english|var1,var2}"}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
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
              className="w-full resize-y rounded-card border border-paper-line px-3 py-2 font-mono text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              placeholder={
                defaultTask2 === "paragraph_restructuring"
                  ? "A | First sentence of the paragraph.\nB | Second sentence."
                  : "ok | She is here.\nfix | She are here. | She is here."
              }
            />
            <span className="mt-1 block text-xs text-text-muted">
              {defaultTask2 === "paragraph_restructuring"
                ? "Letra correcta | oración (el orden de las líneas es el revuelto)."
                : "ok | sentence   o   fix | mal | bien"}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Tarea 3: traducción
            </span>
            <textarea
              name="examTask3"
              required
              rows={8}
              className="w-full resize-y rounded-card border border-paper-line px-3 py-2 font-mono text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              placeholder="Si yo fuera rico, viajaria. | If I were rich, I would travel."
            />
            <span className="mt-1 block text-xs text-text-muted">
              español | english | variación. Las 9 y 10 son condicionales.
            </span>
          </label>
          <input type="hidden" name="examTimeMinutes" value="35" />
        </>
      ) : sessionType === "presentation" ? (
        presentationPrompts.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay una presentación. Avisa cuando esté lista.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Presentación
            </span>
            <select
              name="presentationPromptId"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Elige una presentación
              </option>
              {presentationPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title}
                </option>
              ))}
            </select>
          </label>
        )
      ) : sessionType === "conversation" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Título
            </span>
            <input
              name="conversationTitle"
              required
              maxLength={120}
              className={fieldClass}
              placeholder="Gabo"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Tema (opcional)
            </span>
            <input
              name="conversationTheme"
              maxLength={200}
              className={fieldClass}
              placeholder="Gabriel García Márquez"
            />
          </label>
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-secondary">
              Preguntas (3 a 6)
            </p>
            <div className="space-y-2">
              {conversationQuestions.map((question, index) => (
                <input
                  key={index}
                  name="conversationQuestion"
                  value={question}
                  required={index < 3}
                  maxLength={500}
                  onChange={(event) => {
                    const next = [...conversationQuestions];
                    next[index] = event.target.value;
                    setConversationQuestions(next);
                  }}
                  className={fieldClass}
                  placeholder={`Pregunta ${index + 1}`}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {conversationQuestions.length < 6 ? (
                <button
                  type="button"
                  onClick={() =>
                    setConversationQuestions([...conversationQuestions, ""])
                  }
                  className="h-11 flex-1 rounded-card border border-paper-line text-sm"
                >
                  Agregar
                </button>
              ) : null}
              {conversationQuestions.length > 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    setConversationQuestions(conversationQuestions.slice(0, -1))
                  }
                  className="h-11 flex-1 rounded-card border border-paper-line text-sm"
                >
                  Quitar
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : videoOptions.length === 0 ? (
        <p className="text-sm text-text-muted">
          Todavía no hay una traducción de este nivel.
        </p>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-secondary">
            Traducción
          </span>
          <select
            name="storyId"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Elige una traducción
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
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          Día
        </span>
        <input type="date" name="sessionDate" required className={fieldClass} />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
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
        <p className="mt-1.5 text-xs text-text-muted">
          La hora es la de tu teléfono, en intervalos de 15 minutos.
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          Notas (opcional)
        </span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          className="w-full resize-none rounded-card border border-paper-line px-3 py-2 text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
          placeholder="Lo que quieras recordar de esta clase"
        />
      </label>

      {state && !state.ok && (
        <p className="text-sm text-error">{state.error}</p>
      )}

      {state && state.ok && (
        <p className="text-sm text-text-secondary">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={
          isPending ||
          (sessionType === "story" && storyOptions.length === 0) ||
          (sessionType === "video_summary" && videoOptions.length === 0) ||
          (sessionType === "presentation" && presentationPrompts.length === 0) ||
          (sessionType === "conversation" &&
            conversationQuestions.filter((row) => row.trim()).length < 3)
        }
        className="w-full rounded-card bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Creando..." : "Crear clase"}
      </button>
    </form>
  );
}
