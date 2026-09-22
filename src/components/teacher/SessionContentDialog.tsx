"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import CreateSessionForm from "@/app/teacher/classes/[id]/CreateSessionForm";
import FlexResolveForm from "./FlexResolveForm";
import type { SessionType } from "@/lib/activities";
import type { CourseLevel } from "@/types";

type StoryOption = { id: string; title: string; kind?: string | null };
type CatalogOption = { id: string; title: string };
type ConversationCopyOption = {
  id: string;
  title: string;
  questions: string[];
};

export default function SessionContentDialog({
  courseId,
  courseLevel,
  sessionId,
  sessionType,
  mode,
  stories,
  presentationPrompts,
  conversationCopyPrompts,
  writingPrompts,
  examPrompts,
  conversationPrompts,
  triggerLabel,
}: {
  courseId: string;
  courseLevel: CourseLevel;
  sessionId: string;
  sessionType: SessionType;
  mode: "assign" | "flex";
  stories: StoryOption[];
  presentationPrompts: CatalogOption[];
  conversationCopyPrompts: ConversationCopyOption[];
  writingPrompts: CatalogOption[];
  examPrompts: CatalogOption[];
  conversationPrompts: CatalogOption[];
  triggerLabel: string;
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
        className={`inline-flex min-h-11 w-full items-center justify-center rounded-card px-4 text-label-sm font-medium ${
          mode === "flex"
            ? "border border-accent text-text-accent hover:bg-accent-soft"
            : "border border-paper-line text-text-primary hover:bg-surface-hover"
        }`}
      >
        {triggerLabel}
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
            {mode === "flex" ? "Elegir tipo" : "Elegir contenido"}
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
        <div className="mt-6">
          {open && mode === "flex" ? (
            <FlexResolveForm
              courseId={courseId}
              sessionId={sessionId}
              courseLevel={courseLevel}
              stories={stories}
              presentationPrompts={presentationPrompts}
              onDone={() => setOpen(false)}
            />
          ) : null}
          {open && mode === "assign" ? (
            <CreateSessionForm
              courseId={courseId}
              courseLevel={courseLevel}
              stories={stories}
              presentationPrompts={presentationPrompts}
              conversationCopyPrompts={conversationCopyPrompts}
              writingPrompts={writingPrompts}
              examPrompts={examPrompts}
              conversationPrompts={conversationPrompts}
              lockedType={sessionType}
              assignToSessionId={sessionId}
              onCreated={() => setOpen(false)}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
