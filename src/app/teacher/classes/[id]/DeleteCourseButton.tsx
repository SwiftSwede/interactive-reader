"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { deleteCourse } from "@/app/teacher/actions";

export default function DeleteCourseButton({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (pending) return;
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-card border border-paper-line px-4 text-label-md font-medium text-text-primary hover:bg-surface-hover"
      >
        Borrar mes
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md rounded-sheet border border-paper-line bg-surface p-6 text-text-primary backdrop:bg-text-primary/20"
        aria-labelledby={titleId}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-headline-md text-text-primary">
            Borrar mes
          </h2>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent disabled:opacity-60"
            aria-label="Cerrar"
            disabled={pending}
            onClick={close}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-body-main text-text-secondary">
          ¿Borro {courseName}? Se van las clases de este grupo. Los estudiantes
          siguen en la app.
        </p>
        <form
          className="mt-6"
          action={async (formData) => {
            setPending(true);
            setError("");
            const result = await deleteCourse(formData);
            if (result && !result.ok) {
              setPending(false);
              setError(result.error);
            }
          }}
        >
          <input type="hidden" name="courseId" value={courseId} />
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-3 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Borrando..." : "Sí, borrar"}
          </button>
        </form>
        <button
          type="button"
          disabled={pending}
          onClick={close}
          className="mt-2 min-h-11 w-full text-label-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline disabled:opacity-60"
        >
          No, déjalo
        </button>
        {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
      </dialog>
    </>
  );
}
