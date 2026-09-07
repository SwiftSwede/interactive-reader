"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_NEXT_COOKIE, authConfirmRedirectTo, safeNextPath } from "@/lib/auth";
import { verifyEmailOtp, type VerifyOtpResult } from "./actions";

const fieldClass =
  "h-12 w-full rounded-card border border-paper-line bg-surface px-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

const primaryButtonClass =
  "flex h-12 w-full items-center justify-center rounded-card bg-accent text-label-md font-semibold text-white hover:bg-accent-hover active:bg-accent-hover disabled:opacity-60";

const otpInitial: VerifyOtpResult | null = null;

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [otpState, otpAction, otpPending] = useActionState(
    verifyEmailOtp,
    otpInitial
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const next = safeNextPath(nextPath);
      document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=3600; SameSite=Lax`;

      const supabase = createClient();
      const redirectTo = authConfirmRedirectTo(window.location.origin, next);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setStatus("error");
        const rateLimited =
          error.status === 429 ||
          error.message.toLowerCase().includes("rate") ||
          error.message.toLowerCase().includes("seconds");
        setErrorMessage(
          rateLimited
            ? "Espera un minuto y pide otro código. El anterior a veces todavía sirve."
            : "No pude mandar el código. Revisa el email e inténtalo de nuevo."
        );
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMessage("Algo salió mal. Inténtalo de nuevo en un momento.");
    }
  };

  if (status === "sent") {
    return (
      <form action={otpAction} className="space-y-4">
        <input type="hidden" name="email" value={email.trim().toLowerCase()} />
        <input type="hidden" name="next" value={safeNextPath(nextPath)} />
        <div className="rounded-card border border-paper-line bg-accent-softer p-3">
          <p className="text-label-md text-text-primary">Revisa tu email</p>
          <p className="mt-2 text-body-main text-text-secondary">
            Te mandé un código de 8 números a{" "}
            <span className="font-semibold text-text-primary">{email}</span>.
            Escríbelo aquí. No hace falta abrir el link en otro navegador. Si no
            lo ves, mira en spam.
          </p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-label-sm text-text-secondary">
            Código
          </span>
          <input
            type="text"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            required
            autoFocus
            className={`${fieldClass} tracking-[0.3em]`}
            placeholder="00000000"
          />
        </label>
        {(otpState && !otpState.ok) || errorMessage ? (
          <p className="text-label-md text-error">
            {otpState && !otpState.ok ? otpState.error : errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={otpPending}
          className={primaryButtonClass}
        >
          {otpPending ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
          }}
          className="flex h-11 w-full items-center justify-center rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft active:bg-surface-hover"
        >
          Usar otro email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-label-sm text-text-secondary">
          Tu email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="tu@email.com"
        />
      </label>

      {status === "error" && (
        <p className="text-label-md text-error">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className={primaryButtonClass}
      >
        {status === "sending" ? "Mandando..." : "Mándame el código"}
      </button>
    </form>
  );
}
