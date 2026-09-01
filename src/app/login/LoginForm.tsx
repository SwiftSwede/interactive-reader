"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_NEXT_COOKIE, authConfirmRedirectTo, safeNextPath } from "@/lib/auth";
import { verifyEmailOtp, type VerifyOtpResult } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400";

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
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
          <p className="font-medium text-gray-900">Revisa tu email</p>
          <p className="mt-2 text-sm text-gray-600">
            Te mandé un código de 6 números a{" "}
            <span className="font-medium">{email}</span>. Escríbelo aquí. No
            hace falta abrir el link en otro navegador. Si no lo ves, mira en
            spam.
          </p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">
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
            placeholder="000000"
          />
        </label>
        {(otpState && !otpState.ok) || errorMessage ? (
          <p className="text-sm text-red-600">
            {otpState && !otpState.ok ? otpState.error : errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={otpPending}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {otpPending ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
          }}
          className="w-full min-h-11 text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
        >
          Usar otro email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
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
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "sending" ? "Mandando..." : "Mándame el código"}
      </button>
    </form>
  );
}
