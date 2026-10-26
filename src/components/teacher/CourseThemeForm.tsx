"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import {
  updateCourseTheme,
  type UpdateCourseThemeResult,
} from "@/app/teacher/actions";
import { TEACHER_ICON_BUTTON } from "./teacher-ui";

const fieldClass =
  "min-h-11 w-64 max-w-full rounded-card border border-paper-line bg-surface px-3 py-2 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

type ThemeState = UpdateCourseThemeResult | null;

export default function CourseThemeForm({
  courseId,
  theme,
}: {
  courseId: string;
  theme: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCourseTheme,
    null as ThemeState
  );
  const [openedWith, setOpenedWith] = useState<ThemeState | undefined>(
    undefined
  );
  const savedSinceOpen = state !== openedWith && state?.ok === true;
  const editing = openedWith !== undefined && !savedSinceOpen;
  const saved = state?.ok ? state.theme : theme;

  return (
    <div>
      {editing ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <label
            className="text-label-md text-text-secondary"
            htmlFor={`course-theme-${courseId}`}
          >
            Tema
          </label>
          <input
            id={`course-theme-${courseId}`}
            name="theme"
            defaultValue={saved ?? ""}
            maxLength={80}
            autoFocus
            className={fieldClass}
            placeholder="Viajes, comida, trabajo..."
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setOpenedWith(undefined);
              }
            }}
          />
          <ActionButton
            type="submit"
            state={isPending ? "pending" : "idle"}
            pendingLabel="Guardando..."
          >
            Guardar
          </ActionButton>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setOpenedWith(undefined)}
            className="min-h-11 px-2 text-label-md text-text-muted underline-offset-4 hover:text-text-primary hover:underline disabled:opacity-60"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-label-md text-text-secondary">Tema</span>
          <span
            className={`text-body-main ${saved ? "text-text-primary" : "text-text-muted"}`}
          >
            {saved ?? "Sin tema"}
          </span>
          <button
            type="button"
            onClick={() => setOpenedWith(state)}
            aria-label="Editar el tema"
            className={TEACHER_ICON_BUTTON}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {editing && state && !state.ok ? (
        <p className="text-label-sm text-error">{state.error}</p>
      ) : null}
    </div>
  );
}
