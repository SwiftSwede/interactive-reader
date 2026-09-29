"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useSheetPresence } from "@/hooks/useSheetPresence";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function WordHelpSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { present, exiting } = useSheetPresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!present || exiting) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => !el.hasAttribute("disabled"));
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [present, exiting, onClose]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null || !panelRef.current) return;
    const dy = event.clientY - dragStartY.current;
    if (dy > 0) {
      panelRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null || !panelRef.current) return;
    const dy = event.clientY - dragStartY.current;
    dragStartY.current = null;
    panelRef.current.style.transform = "";
    if (dy > 80) onClose();
  };

  if (!present || typeof document === "undefined") return null;

  const stateClass = exiting ? " word-help-sheet-exit" : "";

  return createPortal(
    <div
      className={`word-help-sheet${stateClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-help-sheet-title"
    >
      <div className="word-help-sheet-overlay" onClick={onClose} />
      <div className="word-help-sheet-panel" ref={panelRef}>
        <div
          className="word-help-sheet-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="word-help-sheet-handle-bar" />
        </div>
        <div className="word-help-sheet-toolbar">
          <h2 id="word-help-sheet-title" className="word-help-sheet-title">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="word-help-sheet-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="word-help-sheet-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
