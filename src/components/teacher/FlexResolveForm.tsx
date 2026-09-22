"use client";

import { useActionState, useEffect, useState } from "react";
import {
  resolveFlexSession,
  type FlexActionResult,
} from "@/app/teacher/flex-actions";
import type { CourseLevel } from "@/types";
import type { SessionType } from "@/lib/activities";

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary focus:border-2 focus:border-accent focus:outline-none";

type CatalogOption = { id: string; title: string; kind?: string | null };

export default function FlexResolveForm({
  courseId,
  sessionId,
  courseLevel,
  stories,
  presentationPrompts,
  onDone,
}: {
  courseId: string;
  sessionId: string;
  courseLevel: CourseLevel;
  stories: CatalogOption[];
  presentationPrompts: CatalogOption[];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    resolveFlexSession,
    null as FlexActionResult | null
  );
  const intDefault: SessionType = "presentation";
  const [resolvedType, setResolvedType] = useState<SessionType>(
    courseLevel === "pre-intermediate" ? "video_summary" : intDefault
  );
  const [tab, setTab] = useState<"existing" | "new">("existing");

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state?.ok, onDone]);

  const videoOptions = stories.filter((row) => row.kind === "video_summary");
  const movieTalkOptions = stories.filter((row) => row.kind === "movie_talk");
  const existing =
    resolvedType === "presentation"
      ? presentationPrompts
      : resolvedType === "movie_talk"
        ? movieTalkOptions
        : videoOptions;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="resolvedType" value={resolvedType} />

      {courseLevel === "pre-intermediate" ? (
        <p className="text-body-main text-text-secondary">
          Resumen de video. Elige una traducción existente.
        </p>
      ) : (
        <fieldset>
          <legend className="mb-1.5 block text-label-md text-text-secondary">
            Tipo
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setResolvedType("presentation");
                setTab("existing");
              }}
              className={`min-h-11 rounded-card border text-label-sm font-medium ${
                resolvedType === "presentation"
                  ? "border-accent bg-accent text-white"
                  : "border-paper-line text-text-primary"
              }`}
            >
              Presentación
            </button>
            <button
              type="button"
              onClick={() => {
                setResolvedType("movie_talk");
                setTab("existing");
              }}
              className={`min-h-11 rounded-card border text-label-sm font-medium ${
                resolvedType === "movie_talk"
                  ? "border-accent bg-accent text-white"
                  : "border-paper-line text-text-primary"
              }`}
            >
              Movie Talk
            </button>
          </div>
        </fieldset>
      )}

      {resolvedType === "presentation" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("existing")}
            className={`min-h-11 rounded-card border text-label-sm font-medium ${
              tab === "existing"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Existente
          </button>
          <button
            type="button"
            onClick={() => setTab("new")}
            className={`min-h-11 rounded-card border text-label-sm font-medium ${
              tab === "new"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Nueva
          </button>
        </div>
      ) : null}

      {resolvedType === "presentation" && tab === "new" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-label-md text-text-secondary">
              Título
            </span>
            <input
              name="newTitle"
              required
              maxLength={120}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-label-md text-text-secondary">
              Tema (opcional)
            </span>
            <input name="newTheme" maxLength={80} className={fieldClass} />
          </label>
        </>
      ) : resolvedType === "movie_talk" ? (
        <>
          {existing.length === 0 ? (
            <p className="text-label-sm text-text-muted">
              Todavía no hay un Movie Talk de este nivel.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-label-md text-text-secondary">
                Movie Talk
              </span>
              <select name="contentId" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Elige un Movie Talk
                </option>
                {existing.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-label-sm text-text-muted">
            Los movie talks se crean por el pipeline de importación (por ahora).
          </p>
        </>
      ) : resolvedType === "video_summary" ? (
        <>
          {existing.length === 0 ? (
            <p className="text-label-sm text-text-muted">
              Todavía no hay una traducción de este nivel.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-label-md text-text-secondary">
                Traducción
              </span>
              <select name="contentId" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Elige una traducción
                </option>
                {existing.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-label-sm text-text-muted">
            Las traducciones se crean por el pipeline de importación (por ahora).
          </p>
        </>
      ) : existing.length === 0 ? (
        <p className="text-label-sm text-text-muted">
          Todavía no hay presentaciones. Crea una con Nueva.
        </p>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-label-md text-text-secondary">
            Presentación
          </span>
          <select name="contentId" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Elige una presentación
            </option>
            {existing.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {state && !state.ok ? (
        <p className="text-label-sm text-error">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-label-sm text-text-secondary">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-5 py-3 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
