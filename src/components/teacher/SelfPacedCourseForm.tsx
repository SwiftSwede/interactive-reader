"use client";

import { useActionState } from "react";
import ActionButton from "@/components/ActionButton";
import {
  EditorField,
  EditorSection,
  fieldClass,
} from "@/components/teacher/content/editor-ui";
import {
  createSelfPacedCourseAction,
  type CourseActionResult,
} from "@/app/teacher/content/courses/actions";

const LEVELS = [
  { id: "beginner", label: "Principiante" },
  { id: "pre-intermediate", label: "Pre-intermedio" },
  { id: "intermediate", label: "Intermedio" },
] as const;

export default function SelfPacedCourseForm() {
  const [state, formAction, pending] = useActionState(
    createSelfPacedCourseAction,
    null as CourseActionResult | null
  );

  return (
    <EditorSection title="Curso autoguiado">
      <form action={formAction} className="flex flex-col gap-4">
        <EditorField label="Nombre">
          <input
            name="name"
            required
            maxLength={120}
            className={fieldClass}
            autoComplete="off"
          />
        </EditorField>
        <EditorField label="Nivel">
          <select name="level" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Elige un nivel
            </option>
            {LEVELS.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </select>
        </EditorField>
        <EditorField label="Descripción">
          <textarea
            name="description"
            maxLength={2000}
            rows={4}
            className={fieldClass}
          />
        </EditorField>
        <label className="flex min-h-11 items-center gap-3 text-label-md text-text-primary">
          <input type="checkbox" name="isPublished" className="h-4 w-4" />
          Publicado
        </label>
        {state?.ok === false ? (
          <p className="text-label-md text-text-secondary">{state.error}</p>
        ) : null}
        <ActionButton type="submit" pendingLabel="Creando..." disabled={pending}>
          Crear curso
        </ActionButton>
      </form>
    </EditorSection>
  );
}
