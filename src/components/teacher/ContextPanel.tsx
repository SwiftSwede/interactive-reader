"use client";

import { X } from "lucide-react";
import { useTeacherPanel } from "./TeacherPanelContext";

export default function ContextPanel() {
  const { content, setPanel } = useTeacherPanel();
  if (!content) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-text-primary/20 xl:hidden"
        aria-label="Cerrar panel"
        onClick={() => setPanel(null)}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col overflow-y-auto border-l border-paper-line bg-surface p-6 xl:static xl:z-auto xl:h-full xl:w-[360px] xl:max-w-none xl:shrink-0"
        aria-label="Detalle de la clase"
      >
        <button
          type="button"
          onClick={() => setPanel(null)}
          className="mb-4 inline-flex h-11 w-11 items-center justify-center self-end rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover xl:hidden"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {content}
      </aside>
    </>
  );
}
