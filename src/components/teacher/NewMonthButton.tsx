"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import CreateCourseForm from "@/app/teacher/CreateCourseForm";

export default function NewMonthButton({
  label = "Nuevo mes",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-card bg-accent px-5 py-3 text-label-md font-medium text-white hover:bg-accent-hover active:bg-accent-hover"
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md rounded-sheet border border-paper-line bg-surface p-6 text-text-primary backdrop:bg-text-primary/20"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-headline-md text-text-primary">
            Nuevo mes
          </h2>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-body-main text-text-secondary">
          Crea el grupo. Las 8 clases las armas después, como siempre.
        </p>
        <div className="mt-6">
          <CreateCourseForm />
        </div>
      </dialog>
    </>
  );
}
