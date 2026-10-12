"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WordFlagType } from "@/types";

export type SelectionAnchor = {
  flagText: string;
  occurrenceIndex: number;
};

export type SelectionRect = {
  top: number;
  bottom: number;
  center: number;
};

type SelectionFlagMenuProps = {
  anchors: SelectionAnchor[];
  rect: SelectionRect;
  initialNote: string;
  pressed: { bold: boolean; underline: boolean };
  onToggle: (type: WordFlagType, note: string | null) => void;
  onSaveNote: (note: string) => void;
};

function menuPlacement(rect: SelectionRect, noteOpen: boolean) {
  const needed = noteOpen ? 220 : 60;
  const above = rect.top >= needed;
  const center = Math.min(
    window.innerWidth - 16,
    Math.max(16, rect.center)
  );
  return {
    top: above ? rect.top - 8 : rect.bottom + 8,
    left: center,
    transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
  };
}

export default function SelectionFlagMenu({
  anchors,
  rect,
  initialNote,
  pressed,
  onToggle,
  onSaveNote,
}: SelectionFlagMenuProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState(initialNote);
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const onSaveRef = useRef(onSaveNote);
  draftRef.current = draft;
  onSaveRef.current = onSaveNote;

  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return;
      onSaveRef.current(draftRef.current);
    };
  }, []);

  if (anchors.length === 0 || typeof document === "undefined") return null;

  const place = menuPlacement(rect, noteOpen);

  return createPortal(
    <div
      className="selection-flag-menu"
      style={{ top: place.top, left: place.left, transform: place.transform }}
      role="toolbar"
      aria-label="Marcas"
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest("textarea")) return;
        event.preventDefault();
      }}
    >
      <div className="selection-flag-menu-row">
        <button
          type="button"
          className={`selection-flag-menu-action${pressed.bold ? " selection-flag-menu-action-on" : ""}`}
          aria-pressed={pressed.bold}
          onClick={() => onToggle("bold", dirtyRef.current ? draft : null)}
        >
          Negrita
        </button>
        <button
          type="button"
          className={`selection-flag-menu-action${pressed.underline ? " selection-flag-menu-action-on" : ""}`}
          aria-pressed={pressed.underline}
          onClick={() => onToggle("underline", dirtyRef.current ? draft : null)}
        >
          Subrayar
        </button>
        <button
          type="button"
          className={`selection-flag-menu-action${noteOpen ? " selection-flag-menu-action-on" : ""}`}
          aria-expanded={noteOpen}
          onClick={() => {
            setNoteOpen(true);
          }}
        >
          Nota
        </button>
      </div>
      {noteOpen ? (
        <label className="selection-flag-menu-note">
          <span className="mb-1 block text-label-sm text-text-secondary">
            Nota
          </span>
          <textarea
            className="min-h-20 w-full rounded-card border border-paper-line bg-surface p-2 text-label-md text-text-primary focus:border-accent focus:outline-none"
            value={draft}
            maxLength={1000}
            onChange={(event) => {
              dirtyRef.current = true;
              setDraft(event.target.value);
            }}
          />
        </label>
      ) : null}
    </div>,
    document.body
  );
}
