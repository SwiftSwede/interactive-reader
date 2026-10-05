"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import type { LessonCopyNote, StepInstructionsCopy } from "@/lib/lesson-copy";
import { useSheetPresence } from "@/hooks/useSheetPresence";

function InlineMarks({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function StepInstructions({
  copy,
}: {
  copy: StepInstructionsCopy;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const line = copy.instructions[0] ?? "";
  const more = copy.instructions.slice(1);
  const hasMore = more.length > 0 || Boolean(copy.note);

  return (
    <header className="mb-4" lang="es">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-headline-md text-text-primary min-w-0 pt-2">
          {copy.title}
        </h2>
        {hasMore ? (
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-text-muted hover:bg-accent-soft hover:text-text-accent active:bg-accent-soft"
            aria-label="Cómo"
            onClick={() => setOpen(true)}
          >
            <Info size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {line ? (
        <p className="mt-2 text-label-md text-text-secondary">
          <InlineMarks text={line} />
        </p>
      ) : null}
      {hasMore ? (
        <StepHowSheet
          open={open}
          onClose={close}
          lines={more}
          note={copy.note}
        />
      ) : null}
    </header>
  );
}

function StepHowSheet({
  open,
  onClose,
  lines,
  note,
}: {
  open: boolean;
  onClose: () => void;
  lines: string[];
  note?: LessonCopyNote;
}) {
  const { present, exiting } = useSheetPresence(open);
  const titleId = useId();
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

  if (!present) return null;

  return createPortal(
    <div
      className={`story-text-sheet${exiting ? " story-text-sheet-exit" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
        <div className="story-text-sheet-toolbar">
          <h2 id={titleId} className="story-text-sheet-title">
            Cómo
          </h2>
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
        <div className="story-text-sheet-body space-y-2 text-body-main text-text-secondary">
          {lines.map((line) => (
            <p key={line}>
              <InlineMarks text={line} />
            </p>
          ))}
          {note ? (
            <p>
              <strong className="font-semibold text-text-primary">
                {note.lead}
              </strong>{" "}
              <InlineMarks text={note.body} />
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
