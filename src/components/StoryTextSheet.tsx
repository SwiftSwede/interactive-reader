"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import InteractiveStory, { type WordTimestamp } from "./InteractiveStory";
import type { WordData, ExpressionData } from "./WordTooltip";

type StoryTextSheetProps = {
  open: boolean;
  onClose: () => void;
  bodyText: string;
  words: WordData[];
  expressions: ExpressionData[];
  audioUrl: string;
  timestamps: WordTimestamp[];
  storyId?: string;
  sessionId?: string;
  trackLookups?: boolean;
};

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function StoryTextSheet({
  open,
  onClose,
  bodyText,
  words,
  expressions,
  audioUrl,
  timestamps,
  storyId,
  sessionId,
  trackLookups,
}: StoryTextSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

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
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="story-text-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-text-sheet-title"
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
          <h2 id="story-text-sheet-title" className="story-text-sheet-title">
            El cuento
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="story-text-sheet-close"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="story-text-sheet-body">
          <InteractiveStory
            bodyText={bodyText}
            words={words}
            expressions={expressions}
            audioUrl={audioUrl}
            timestamps={timestamps}
            storyId={storyId}
            sessionId={sessionId}
            trackLookups={trackLookups}
            hideAudio
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
