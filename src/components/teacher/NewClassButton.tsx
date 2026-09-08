"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import CreateSessionForm from "@/app/teacher/classes/[id]/CreateSessionForm";
import type { CourseLevel } from "@/types";

type StoryOption = {
  id: string;
  title: string;
  kind?: string | null;
};

type PresentationOption = {
  id: string;
  title: string;
};

type ConversationCopyOption = {
  id: string;
  title: string;
  questions: string[];
};

export default function NewClassButton({
  courseId,
  courseLevel,
  stories,
  presentationPrompts,
  conversationCopyPrompts,
}: {
  courseId: string;
  courseLevel: CourseLevel;
  stories: StoryOption[];
  presentationPrompts: PresentationOption[];
  conversationCopyPrompts: ConversationCopyOption[];
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
        Nueva clase
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-sheet border border-paper-line bg-surface p-6 text-text-primary backdrop:bg-text-primary/20"
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
            Nueva clase
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
          Una clase es un Zoom: una actividad, 90 minutos, un link para el chat.
        </p>
        <div className="mt-6">
          {open ? (
            <CreateSessionForm
              courseId={courseId}
              courseLevel={courseLevel}
              stories={stories}
              presentationPrompts={presentationPrompts}
              conversationCopyPrompts={conversationCopyPrompts}
              onCreated={() => setOpen(false)}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
