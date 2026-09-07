"use client";

import { X } from "lucide-react";
import { useTeacherPanel } from "./TeacherPanelContext";

export default function ContextPanel() {
  const { content, setPanel } = useTeacherPanel();
  if (!content) return null;

  return (
    <>
      <aside className="hidden h-full w-[360px] shrink-0 overflow-y-auto border-l border-paper-line bg-surface p-6 xl:block">
        {content}
      </aside>

      <div className="fixed inset-0 z-40 xl:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-text-primary/20"
          aria-label="Cerrar panel"
          onClick={() => setPanel(null)}
        />
        <aside
          className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col overflow-y-auto border-l border-paper-line bg-surface p-6 motion-safe:animate-[teacher-panel-in_200ms_ease-out]"
          role="dialog"
          aria-label="Detalle de la clase"
        >
          <button
            type="button"
            onClick={() => setPanel(null)}
            className="mb-4 inline-flex h-11 w-11 items-center justify-center self-end rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          {content}
        </aside>
      </div>
    </>
  );
}
