"use client";

import { useActionState } from "react";
import {
  createConversationAction,
  createExamAction,
  createPresentationAction,
  createWritingAction,
  type CatalogMutateResult,
} from "@/app/teacher/content/actions";
import {
  EditorField,
  EditorSection,
  fieldClass,
} from "@/components/teacher/content/editor-ui";

const initial: CatalogMutateResult | null = null;

const LEVELS = [
  { id: "pre-intermediate", label: "Pre-intermedio" },
  { id: "intermediate", label: "Intermedio" },
] as const;

export default function CreateCatalogForm({
  kind,
}: {
  kind: "writing" | "exam" | "presentation" | "conversation";
}) {
  const action =
    kind === "writing"
      ? createWritingAction
      : kind === "exam"
        ? createExamAction
        : kind === "presentation"
          ? createPresentationAction
          : createConversationAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const heading =
    kind === "writing"
      ? "Nueva escritura"
      : kind === "exam"
        ? "Nuevo examen"
        : kind === "presentation"
          ? "Nueva presentación"
          : "Nueva conversación";

  return (
    <EditorSection title={heading}>
      <form action={formAction} className="flex flex-col gap-4">
        <EditorField label="Título">
          <input
            name="title"
            required
            maxLength={120}
            className={fieldClass}
            autoComplete="off"
          />
        </EditorField>
        {kind === "presentation" ? (
          <EditorField label="Nivel" hint="Las presentaciones son intermedio.">
            <input
              className={fieldClass}
              value="Intermedio"
              readOnly
              tabIndex={-1}
            />
          </EditorField>
        ) : (
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
        )}
        {kind === "presentation" || kind === "conversation" ? (
          <EditorField label="Tema (opcional)">
            <input name="theme" maxLength={200} className={fieldClass} />
          </EditorField>
        ) : null}
        {state && !state.ok ? (
          <p className="text-sm text-error">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-card bg-accent px-5 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear y editar"}
        </button>
      </form>
    </EditorSection>
  );
}
