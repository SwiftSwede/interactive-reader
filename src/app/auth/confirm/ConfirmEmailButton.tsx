"use client";

import { useFormStatus } from "react-dom";
import ActionButton from "@/components/ActionButton";
import { confirmTokenHash } from "@/app/login/actions";
import type { EmailOtpKind } from "@/lib/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton
      type="submit"
      className="w-full h-12"
      state={pending ? "pending" : "idle"}
      pendingLabel="Entrando..."
    >
      Entrar
    </ActionButton>
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
