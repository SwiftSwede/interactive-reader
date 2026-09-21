"use client";

import { useState } from "react";
import { updateWritingPromptTitle } from "../../actions";

export default function WritingTitleForm({
  courseId,
  sessionId,
  title,
}: {
  courseId: string;
  sessionId: string;
  title: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="mt-3"
      action={async (formData) => {
        setPending(true);
        setError("");
        setSaved(false);
        const result = await updateWritingPromptTitle(formData);
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-text-muted">
          Título
        </span>
        <input
          name="writingTitle"
          required
          maxLength={120}
          defaultValue={title}
          className="w-full rounded-card border border-paper-line bg-white px-3 py-3 text-base text-text-primary focus:border-2 focus:border-accent focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 w-full rounded-card border border-paper-line text-sm font-medium text-text-primary disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar título"}
      </button>
      {saved ? (
        <p className="mt-2 text-sm text-success">Listo. Ya tiene título.</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </form>
  );
}
