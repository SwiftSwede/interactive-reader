"use client";

import { useActionState } from "react";
import { inviteStudent, type InviteStudentResult } from "./invite-actions";

const initialState: InviteStudentResult | null = null;

export default function InviteStudentForm() {
  const [state, formAction, isPending] = useActionState(
    inviteStudent,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Email del estudiante
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="sofia@email.com"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Cómo los llamas
        </span>
        <input
          type="text"
          name="displayName"
          required
          maxLength={80}
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="Sofia G."
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
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Invitando..." : "Invitar"}
      </button>
    </form>
  );
}
