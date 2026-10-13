"use client";

import { Mail, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { workshopLevels } from "@/lib/workshop/levels";

const avisoCopy: Record<string, string> = {
  datos: "Revisa tu nombre, tu email y tu nivel.",
  espera: "La inscripción no está lista todavía. Intenta de nuevo en un rato.",
  error: "No pude guardar tu cupo. Intenta de nuevo.",
};

export function WorkshopForm({ aviso }: { aviso?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    aviso ? (avisoCopy[aviso] ?? avisoCopy.error) : null,
  );

  useEffect(() => {
    if (!aviso) return;
    document.getElementById("cupo")?.scrollIntoView({ block: "start" });
  }, [aviso]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/workshop/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          level: data.get("level"),
          website: data.get("website") || undefined,
        }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? avisoCopy.error);
        setPending(false);
        return;
      }
      window.location.assign("/workshop/gracias");
    } catch (submitError) {
      console.error(
        "workshop form submit failed",
        submitError instanceof Error ? submitError.message : "unknown",
      );
      setError(avisoCopy.error);
      setPending(false);
    }
  }

  return (
    <form
      id="cupo"
      className="wk-form"
      action="/api/workshop/register"
      method="post"
      onSubmit={onSubmit}
    >
      <label className="wk-field">
        <span>Nombre*</span>
        <span className="wk-input">
          <User aria-hidden />
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
          />
        </span>
      </label>
      <label className="wk-field">
        <span>Email*</span>
        <span className="wk-input">
          <Mail aria-hidden />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
          />
        </span>
      </label>
      <fieldset className="wk-qualify">
        <legend>¿Cuál te describe?</legend>
        {workshopLevels.map((level) => (
          <label key={level.id}>
            <input type="radio" name="level" value={level.id} required />
            {level.label}
          </label>
        ))}
      </fieldset>
      <label className="wk-hp" aria-hidden="true">
        Sitio web
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      {error ? (
        <p className="wk-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="wk-cta" type="submit" disabled={pending}>
        {pending ? "Reservando tu cupo" : "Reservar mi cupo"}
      </button>
      <p className="wk-reassure">
        Gratis. No pedimos tarjeta. El email es para el Zoom y la grabación.
      </p>
    </form>
  );
}
