"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTeacherPanel } from "./TeacherPanelContext";
import { TEACHER_ICON_BUTTON } from "./teacher-ui";

export const TEACHER_CONTEXT_PANEL_ID = "teacher-context-panel";

export default function ContextPanel() {
  const { content, closePanel } = useTeacherPanel();
  const panelRef = useRef<HTMLElement>(null);
  const isOpen = content != null;

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closePanel]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-text-primary/20 xl:hidden"
        aria-label="Cerrar panel"
        tabIndex={-1}
        onClick={closePanel}
      />
      <aside
        ref={panelRef}
        id={TEACHER_CONTEXT_PANEL_ID}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col overflow-y-auto border-l border-paper-line bg-surface px-6 pt-4 pb-6 focus:outline-none xl:static xl:z-auto xl:h-full xl:w-[360px] xl:max-w-none xl:shrink-0"
        aria-label="Detalle"
      >
        <button
          type="button"
          onClick={closePanel}
          className={`${TEACHER_ICON_BUTTON} mb-2 self-end`}
          aria-label="Cerrar panel"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {content}
      </aside>
    </>
  );
}
