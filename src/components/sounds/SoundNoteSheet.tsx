"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { useSheetPresence } from "@/hooks/useSheetPresence";
import {
  spanishRelationLabel,
  type SpanishNote,
  type SpanishRelation,
} from "@/lib/sound-guide";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const RELATION_TEXT: Record<SpanishRelation, string> = {
  igual: "text-secondary-accent",
  parecido: "text-text-accent",
  unico: "text-text-muted",
};

export default function SoundNoteSheet({
  note,
  slug,
  onClose,
}: {
  note: SpanishNote | null;
  slug: string | null;
  onClose: () => void;
}) {
  const open = note != null && slug != null;
  const { present, exiting } = useSheetPresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!present || exiting) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
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
      document.body.style.overflow = previousOverflow;
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

  if (!present || !note || !slug) return null;

  return createPortal(
    <div
      className={`story-text-sheet${exiting ? " story-text-sheet-exit" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Explicación"
    >
      <div className="story-text-sheet-overlay" onClick={onClose} />
      <div className="story-text-sheet-panel" ref={panelRef}>
        <div
          className="story-text-sheet-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="story-text-sheet-handle-bar" />
        </div>
        <div className="story-text-sheet-toolbar story-text-sheet-toolbar--end">
          <button
            ref={closeRef}
            type="button"
            className="story-text-sheet-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="story-text-sheet-body text-body-main text-text-secondary">
          <p className={`text-label-md ${RELATION_TEXT[note.relation]}`}>
            {spanishRelationLabel(note.relation)}
          </p>
          <p className="mt-3">{note.noteEs}</p>
          {note.mnemonicEs ? (
            <p className="mt-4 rounded-card bg-accent-soft px-3 py-2 text-label-md text-text-primary">
              Truco: {note.mnemonicEs}
            </p>
          ) : null}
          <Link
            href={`/sounds/${slug}`}
            className="mt-6 inline-flex h-11 items-center text-label-md text-text-accent hover:underline"
          >
            Escuchar y practicar
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
