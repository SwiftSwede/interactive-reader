"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import {
  updateCourseName,
  type UpdateCourseNameResult,
} from "@/app/teacher/actions";
import { TEACHER_ICON_BUTTON } from "./teacher-ui";

const fieldClass =
  "min-h-11 w-full max-w-md rounded-card border border-paper-line bg-surface px-3 py-2 text-headline-md text-text-primary focus:border-2 focus:border-accent focus:outline-none";

export default function CourseNameForm({
  courseId,
  name,
}: {
  courseId: string;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCourseName,
    null as UpdateCourseNameResult | null
  );
  const [editing, setEditing] = useState(false);
  const shown = state?.ok ? state.name : name;

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="flex items-start gap-1">
        <h1 className="text-headline-lg text-text-primary">{shown}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Cambiar el nombre del grupo"
          className={TEACHER_ICON_BUTTON}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <label className="sr-only" htmlFor={`course-name-${courseId}`}>
        Nombre del grupo
      </label>
      <input
        id={`course-name-${courseId}`}
        name="name"
        defaultValue={shown}
        required
        maxLength={80}
        autoFocus
        className={fieldClass}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setEditing(false);
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
        onClick={() => setEditing(false)}
        className="min-h-11 px-2 text-label-md text-text-muted underline-offset-4 hover:text-text-primary hover:underline disabled:opacity-60"
      >
        Cancelar
      </button>
      {state && !state.ok ? (
        <p className="w-full text-label-sm text-error">{state.error}</p>
      ) : null}
    </form>
  );
}
