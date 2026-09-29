"use client";

import { useActionState } from "react";
import ActionButton from "@/components/ActionButton";
import { inviteStudent, type InviteStudentResult } from "./invite-actions";

const initialState: InviteStudentResult | null = null;

const fieldClass =
  "w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

export default function InviteStudentForm() {
  const [state, formAction, isPending] = useActionState(
    inviteStudent,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Email del estudiante
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          className={fieldClass}
          placeholder="sofia@email.com"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Cómo los llamas
        </span>
        <input
          type="text"
          name="displayName"
          required
          maxLength={80}
          className={fieldClass}
          placeholder="Sofia G."
        />
      </label>

      {state && !state.ok && (
        <p className="text-label-sm text-error">{state.error}</p>
      )}

      {state && state.ok && (
        <p className="text-label-sm text-text-secondary">{state.message}</p>
      )}

      <ActionButton
        type="submit"
        className="w-full"
        state={isPending ? "pending" : "idle"}
        pendingLabel="Invitando..."
      >
        Invitar
      </ActionButton>
    </form>
  );
}
