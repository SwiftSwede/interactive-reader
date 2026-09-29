"use client";

import { useActionState } from "react";
import ActionButton from "@/components/ActionButton";
import {
  updateDisplayName,
  type UpdateDisplayNameResult,
} from "@/app/profile/actions";

const initialState: UpdateDisplayNameResult | null = null;

export default function EditDisplayNameForm({
  currentName,
}: {
  currentName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateDisplayName,
    initialState
  );

  return (
    <form action={formAction} className="mt-4">
      <label className="block">
        <span className="mb-1.5 block text-label-sm text-text-secondary">
          Cómo te llamas
        </span>
        <input
          type="text"
          name="displayName"
          required
          minLength={2}
          maxLength={50}
          defaultValue={currentName === "Sin nombre" ? "" : currentName}
          autoComplete="nickname"
          className="h-12 w-full rounded-card border border-paper-line bg-surface px-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none"
          placeholder="Sofia"
        />
      </label>
      {state && !state.ok ? (
        <p className="mt-2 text-label-md text-error">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="mt-2 text-label-md text-success">{state.message}</p>
      ) : null}
      <ActionButton
        type="submit"
        variant="secondary"
        className="mt-3 w-full h-12"
        state={isPending ? "pending" : "idle"}
        pendingLabel="Guardando..."
      >
        Guardar nombre
      </ActionButton>
    </form>
  );
}
