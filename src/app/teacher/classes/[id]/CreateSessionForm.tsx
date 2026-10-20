"use client";

import { useActionState, useEffect, useState } from "react";
import ActionButton from "@/components/ActionButton";
import { createSession, type CreateSessionResult } from "./actions";
import {
  defaultWritingMinutes,
  defaultExamTask2Type,
  type SessionType,
} from "@/lib/activities";
import {
  appendNumberedQuestions,
  parsePastedQuestionList,
  questionsFromClipboard,
} from "@/lib/conversation";
import {
  joinWritingQuestions,
  MAX_INTERMEDIATE_WRITING_QUESTIONS,
} from "@/lib/writing";
import {
  AddButton,
  ReorderControls,
  moveItem,
} from "@/components/teacher/content/editor-ui";
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

type CatalogPromptOption = {
  id: string;
  title: string;
};

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-base text-text-primary focus:border-2 focus:border-accent focus:outline-none";

export default function CreateSessionForm({
  courseId,
  courseLevel,
  stories,
  presentationPrompts,
  conversationCopyPrompts,
  writingPrompts,
  examPrompts,
  conversationPrompts,
  onCreated,
  lockedType,
  assignToSessionId,
}: {
  courseId: string;
  courseLevel: CourseLevel;
  stories: StoryOption[];
  presentationPrompts: PresentationOption[];
  conversationCopyPrompts: ConversationCopyOption[];
  writingPrompts: CatalogPromptOption[];
  examPrompts: CatalogPromptOption[];
  conversationPrompts: CatalogPromptOption[];
  onCreated?: () => void;
  lockedType?: SessionType;
  assignToSessionId?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createSession,
    initialState
  );
  const [sessionType, setSessionType] = useState<SessionType>(
    lockedType ?? "story"
  );
  const [promptText, setPromptText] = useState("");
  const [writingQuestions, setWritingQuestions] = useState<string[]>([""]);
  const [copyPromptId, setCopyPromptId] = useState("");
  const [promptMode, setPromptMode] = useState<"new" | "copy">("new");
  const [previousPromptId, setPreviousPromptId] = useState("");
  const [conversationListText, setConversationListText] = useState("");
  const conversationQuestions = parsePastedQuestionList(conversationListText);
  const conversationPreview = conversationQuestions.slice(0, 6);
  const conversationOverflow = conversationQuestions.length > 6;

  useEffect(() => {
    if (state?.ok) onCreated?.();
  }, [state?.ok, onCreated]);
  useEffect(() => {
    setPromptMode("new");
    setPreviousPromptId("");
  }, [sessionType]);
  const defaultMinutes = defaultWritingMinutes(courseLevel);
  const defaultTask2 = defaultExamTask2Type(courseLevel);
  const storyOptions = stories.filter(
    (row) =>
      row.kind !== "video_summary" &&
      row.kind !== "dialogue" &&
      row.kind !== "movie_talk" &&
      row.kind !== "song" &&
      row.kind !== "audio_course"
  );
  const videoOptions = stories.filter((row) => row.kind === "video_summary");
  const dialogueOptions = stories.filter((row) => row.kind === "dialogue");
  const movieTalkOptions = stories.filter((row) => row.kind === "movie_talk");
  const songOptions = stories.filter((row) => row.kind === "song");
  const previousPrompts =
    sessionType === "writing"
      ? writingPrompts
      : sessionType === "exam"
        ? examPrompts
        : conversationPrompts;

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
      {assignToSessionId ? (
        <input type="hidden" name="assignToSessionId" value={assignToSessionId} />
      ) : null}

      {lockedType ? null : (
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
            onClick={() => setSessionType("pronunciation")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "pronunciation"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Pronunciación
          </button>
          <button
            type="button"
            onClick={() => setSessionType("dialogue")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "dialogue"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Diálogo
          </button>
          <button
            type="button"
            onClick={() => setSessionType("movie_talk")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "movie_talk"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Movie Talk
          </button>
          <button
            type="button"
            onClick={() => setSessionType("song")}
            className={`h-11 rounded-card border text-sm font-medium ${
              sessionType === "song"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Música
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
      )}

      {sessionType === "writing" ||
      sessionType === "exam" ||
      sessionType === "conversation" ? (
        <>
          <input type="hidden" name="catalogSource" value={promptMode} />
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-text-secondary">
              Contenido
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPromptMode("new")}
                className={`h-11 rounded-card border text-sm font-medium ${
                  promptMode === "new"
                    ? "border-accent bg-accent text-white"
                    : "border-paper-line text-text-primary"
                }`}
              >
                Nueva lección
              </button>
              <button
                type="button"
                onClick={() => setPromptMode("copy")}
                className={`h-11 rounded-card border text-sm font-medium ${
                  promptMode === "copy"
                    ? "border-accent bg-accent text-white"
                    : "border-paper-line text-text-primary"
                }`}
              >
                Usar una anterior
              </button>
            </div>
          </fieldset>
        </>
      ) : null}

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
        promptMode === "copy" ? (
          previousPrompts.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía no hay una escritura de este nivel. Créala en Contenido.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Escritura anterior
              </span>
              <select
                name="copyPromptId"
                required
                value={previousPromptId}
                onChange={(event) => setPreviousPromptId(event.target.value)}
                className={fieldClass}
              >
                <option value="" disabled>
                  Elige una escritura
                </option>
                {previousPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Título
            </span>
            <input
              name="writingTitle"
              required
              maxLength={120}
              className={fieldClass}
              placeholder="If I were..."
            />
          </label>
          {courseLevel === "intermediate" ? (
            <div className="flex flex-col gap-3">
              <input
                type="hidden"
                name="promptText"
                value={joinWritingQuestions(writingQuestions)}
              />
              {writingQuestions.map((question, index) => (
                <label key={index} className="block">
                  <span className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-secondary">
                      Pregunta {index + 1}
                    </span>
                    {writingQuestions.length > 1 ? (
                      <ReorderControls
                        index={index}
                        total={writingQuestions.length}
                        onMove={(direction) =>
                          setWritingQuestions(
                            moveItem(writingQuestions, index, direction)
                          )
                        }
                        onDelete={() =>
                          setWritingQuestions(
                            writingQuestions.filter((_, item) => item !== index)
                          )
                        }
                        deleteLabel="Quitar pregunta"
                      />
                    ) : null}
                  </span>
                  <textarea
                    required={index === 0}
                    rows={3}
                    value={question}
                    onChange={(event) => {
                      const next = [...writingQuestions];
                      next[index] = event.target.value;
                      setWritingQuestions(next);
                    }}
                    className="w-full resize-y rounded-card border border-paper-line px-3 py-3 text-base text-text-primary focus:border-2 focus:border-accent focus:outline-none"
                    placeholder="What would you do if..."
                  />
                </label>
              ))}
              {writingQuestions.length < MAX_INTERMEDIATE_WRITING_QUESTIONS ? (
                <AddButton
                  label="+ Agregar pregunta"
                  onClick={() =>
                    setWritingQuestions([...writingQuestions, ""])
                  }
                />
              ) : null}
              <p className="text-xs text-text-muted">
                Hasta {MAX_INTERMEDIATE_WRITING_QUESTIONS}. Los estudiantes las
                ven numeradas.
              </p>
            </div>
          ) : (
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
          )}
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
          {courseLevel === "intermediate" ? (
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
                  Rúbrica TOEFL/IELTS (opcional, sin puntaje)
                </span>
                <textarea
                  name="rubricText"
                  rows={3}
                  className="w-full resize-y rounded-card border border-paper-line px-3 py-2 text-sm text-text-primary focus:border-2 focus:border-accent focus:outline-none"
                  placeholder="Task response, coherence, vocabulary, grammar"
                />
              </label>
            </>
          ) : null}
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
        )
      ) : sessionType === "exam" ? (
        promptMode === "copy" ? (
          previousPrompts.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía no hay un examen de este nivel. Créalo en Contenido.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Examen anterior
              </span>
              <select
                name="copyPromptId"
                required
                value={previousPromptId}
                onChange={(event) => setPreviousPromptId(event.target.value)}
                className={fieldClass}
              >
                <option value="" disabled>
                  Elige un examen
                </option>
                {previousPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : (
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
              placeholder={"Deadline\nBrake\nGo off"}
            />
            <span className="mt-1 block text-xs text-text-muted">
              english o english | spanish
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
              placeholder="I had until 5:00 p.m., the (fecha límite), to pay."
            />
            <span className="mt-1 block text-xs text-text-muted">
              Oraciones con (español) en paréntesis
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
                  ? "Nowadays, most people view old superstitions as childish.\nAnd while they may not be backed by science, I believe superstitions should still be followed."
                  : "I need a car to move in the city.\nShe are here."
              }
            />
            <span className="mt-1 block text-xs text-text-muted">
              {defaultTask2 === "paragraph_restructuring"
                ? "Oraciones en orden correcto, una por línea"
                : "Una oración por línea. Marca ok/fix después en clase."}
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
              placeholder="Tengo la boca hinchada debido a una infección."
            />
            <span className="mt-1 block text-xs text-text-muted">
              Español, una por línea. Respuestas después de clase.
            </span>
          </label>
          <input type="hidden" name="examTimeMinutes" value="35" />
        </>
        )
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
        promptMode === "copy" ? (
          previousPrompts.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía no hay una conversación de este nivel. Créala en
              Contenido.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Conversación anterior
              </span>
              <select
                name="copyPromptId"
                required
                value={previousPromptId}
                onChange={(event) => setPreviousPromptId(event.target.value)}
                className={fieldClass}
              >
                <option value="" disabled>
                  Elige una conversación
                </option>
                {previousPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : (
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
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Preguntas (3 a 6)
              </span>
              <textarea
                rows={8}
                value={conversationListText}
                onChange={(event) =>
                  setConversationListText(event.target.value)
                }
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text/plain");
                  const html = event.clipboardData.getData("text/html");
                  const pasted = questionsFromClipboard({ html, text });
                  const empty = conversationListText.trim() === "";
                  if (pasted.length >= 2 || (empty && pasted.length === 1)) {
                    event.preventDefault();
                    setConversationListText(pasted.join("\n"));
                  }
                }}
                className="w-full resize-y rounded-card border border-paper-line bg-surface px-3 py-3 text-base text-text-primary focus:border-2 focus:border-accent focus:outline-none"
                placeholder={
                  "Have you read Gabo?\nWhat stayed with you?\nWould you visit Aracataca?"
                }
              />
              <span className="mt-1.5 block text-xs text-text-muted">
                Pega la lista del Doc. Una pregunta por renglón. Los
                estudiantes las ven numeradas.
              </span>
            </label>
            {conversationPreview.map((question, index) => (
              <input
                key={`q-${index}`}
                type="hidden"
                name="conversationQuestion"
                value={question}
              />
            ))}
            {conversationPreview.length > 0 ? (
              <ol className="mt-3 list-decimal space-y-1 pl-6 text-body-main text-text-primary">
                {conversationPreview.map((question, index) => (
                  <li key={`preview-${index}`}>{question}</li>
                ))}
              </ol>
            ) : null}
            {conversationOverflow ? (
              <p className="mt-2 text-xs text-text-muted">
                Solo se guardan las primeras 6.
              </p>
            ) : null}
          </div>
        </>
        )
      ) : sessionType === "dialogue" ? (
        dialogueOptions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay diálogos de este nivel.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Diálogo
            </span>
            <select
              name="storyId"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Elige un diálogo
              </option>
              {dialogueOptions.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </label>
        )
      ) : sessionType === "movie_talk" ? (
        movieTalkOptions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay un Movie Talk de este nivel.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Movie Talk
            </span>
            <select
              name="storyId"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Elige un Movie Talk
              </option>
              {movieTalkOptions.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </label>
        )
      ) : sessionType === "song" ? (
        songOptions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay canciones de este nivel.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Canción
            </span>
            <select
              name="storyId"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Elige una canción
              </option>
              {songOptions.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </label>
        )
      ) : sessionType === "pronunciation" ? (
        <p className="text-sm text-text-secondary">
          Esta clase es por Zoom. Dictado, coral y pronunciación ya están en
          la historia de la Clase 1.
        </p>
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

      {assignToSessionId ? null : (
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          Día
        </span>
        <input type="date" name="sessionDate" required className={fieldClass} />
      </label>
      )}

      {assignToSessionId ? null : (
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
      )}

      {assignToSessionId ? null : (
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
      )}

      {state && !state.ok && (
        <p className="text-sm text-error">{state.error}</p>
      )}

      {state && state.ok && (
        <p className="text-sm text-text-secondary">{state.message}</p>
      )}

      <ActionButton
        type="submit"
        className="w-full"
        state={isPending ? "pending" : "idle"}
        pendingLabel="Guardando..."
        disabled={
          (sessionType === "story" && storyOptions.length === 0) ||
          (sessionType === "dialogue" && dialogueOptions.length === 0) ||
          (sessionType === "movie_talk" && movieTalkOptions.length === 0) ||
          (sessionType === "song" && songOptions.length === 0) ||
          (sessionType === "video_summary" && videoOptions.length === 0) ||
          (sessionType === "presentation" && presentationPrompts.length === 0) ||
          (sessionType === "writing" &&
            promptMode === "copy" &&
            (writingPrompts.length === 0 || !previousPromptId)) ||
          (sessionType === "writing" &&
            promptMode === "new" &&
            courseLevel === "intermediate" &&
            joinWritingQuestions(writingQuestions) === "") ||
          (sessionType === "exam" &&
            promptMode === "copy" &&
            (examPrompts.length === 0 || !previousPromptId)) ||
          (sessionType === "conversation" &&
            promptMode === "copy" &&
            (conversationPrompts.length === 0 || !previousPromptId)) ||
          (sessionType === "conversation" &&
            promptMode === "new" &&
            conversationPreview.filter((row) => row.trim()).length < 3)
        }
      >
        {assignToSessionId ? "Guardar" : "Crear clase"}
      </ActionButton>
    </form>
  );
}
