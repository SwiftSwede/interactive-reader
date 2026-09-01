"use client";

import { useFormStatus } from "react-dom";
import { confirmTokenHash } from "@/app/login/actions";
import type { EmailOtpKind } from "@/lib/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-12 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function ConfirmEmailButton({
  tokenHash,
  type,
  nextPath,
}: {
  tokenHash: string;
  type: EmailOtpKind;
  nextPath: string;
}) {
  return (
    <form action={confirmTokenHash}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={nextPath} />
      <SubmitButton />
    </form>
  );
}
