"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  VideoSummaryNoteSide,
  VideoSummaryNoteType,
  VideoSummaryTeachingNote,
} from "@/types";
import ActionButton from "@/components/ActionButton";
import { addVideoSummaryNote, deleteVideoSummaryNote } from "@/app/lesson/[slug]/video-summary-actions";
import { markFirstMatch } from "@/lib/video-summary-notes";

const NOTE_TYPES: { id: VideoSummaryNoteType; label: string }[] = [
  { id: "vocabulary", label: "Vocabulario" },
  { id: "grammar", label: "Gramática" },
  { id: "pronunciation", label: "Pronunciación" },
  { id: "cultural", label: "Cultura" },
];

export function noteTypeLabel(noteType: VideoSummaryNoteType): string {
  return NOTE_TYPES.find((row) => row.id === noteType)?.label ?? "Nota";
}

export { markFirstMatch };

export function HighlightedText({
  text,
  notes,
  className,
  onOpenNote,
}: {
  text: string;
  notes: VideoSummaryTeachingNote[];
  className?: string;
  onOpenNote?: (note: VideoSummaryTeachingNote) => void;
}) {
  const pieces: Array<{ text: string; note?: VideoSummaryTeachingNote }> = [
    { text },
  ];
  for (const note of notes) {
    const next: typeof pieces = [];
    let used = false;
    for (const piece of pieces) {
      if (piece.note || used) {
        next.push(piece);
        continue;
      }
      const parts = markFirstMatch(piece.text, note.selectedText);
      if (parts.length === 1) {
        next.push(piece);
        continue;
      }
      used = true;
      if (parts[0]) next.push({ text: parts[0] });
      next.push({ text: parts[1], note });
      if (parts[2]) next.push({ text: parts[2] });
    }
    pieces.splice(0, pieces.length, ...next);
  }

  return (
    <div className={className}>
      {pieces.map((piece, index) =>
        piece.note ? (
          <button
            key={`${piece.note.id}-${index}`}
            type="button"
            className="teaching-note-mark"
            aria-haspopup="dialog"
            aria-label={`Nota: ${piece.text}`}
            onClick={() => onOpenNote?.(piece.note as VideoSummaryTeachingNote)}
          >
            {piece.text}
          </button>
        ) : (
          <span key={`t-${index}`}>{piece.text}</span>
        )
      )}
    </div>
  );
}

function useNoteDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    const y = window.scrollY;
    const restore = () => {
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    };
    dialog.showModal();
    restore();
    const frame = requestAnimationFrame(restore);
    const handleClose = () => {
      restore();
      requestAnimationFrame(restore);
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener("close", handleClose);
      restore();
      if (dialog.open) dialog.close();
      restore();
    };
  }, []);

  return dialogRef;
}

export function TeachingNoteLightbox({
  note,
  isTeacher,
  onClose,
  onDeleted,
}: {
  note: VideoSummaryTeachingNote;
  isTeacher: boolean;
  onClose: () => void;
  onDeleted: (noteId: string) => void;
}) {
  const dialogRef = useNoteDialog(onClose);
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="teaching-note-modal"
      aria-labelledby={titleId}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
    >
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p id={titleId} className="font-heading text-story-body text-text-primary">
              &ldquo;{note.selectedText}&rdquo;
            </p>
            <p className="mt-1 text-label-sm text-text-muted">
              {noteTypeLabel(note.noteType)}
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-card text-label-md text-text-accent"
            onClick={(event) => {
              event.stopPropagation();
              dialogRef.current?.close();
            }}
          >
            Cerrar
          </button>
        </div>
        <p className="mt-3 text-body-main text-text-primary">{note.note}</p>
        {error ? (
          <p className="mt-2 text-label-sm text-error">{error}</p>
        ) : null}
        {isTeacher ? (
          <ActionButton
            className="mt-4 w-full text-error"
            variant="secondary"
            state={pending ? "pending" : "idle"}
            pendingLabel="Borrando..."
            onClick={async () => {
              setPending(true);
              setError("");
              const result = await deleteVideoSummaryNote(note.id);
              setPending(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onDeleted(note.id);
            }}
          >
            Borrar
          </ActionButton>
        ) : null}
      </div>
    </dialog>,
    document.body
  );
}

export type TeachingNoteAnchor = {
  top: number;
  bottom: number;
  center: number;
};

function menuPlacement(rect: TeachingNoteAnchor, open: boolean) {
  const needed = open ? 300 : 60;
  const above = rect.top >= needed;
  const center = Math.min(window.innerWidth - 16, Math.max(16, rect.center));
  return {
    top: above ? rect.top - 8 : rect.bottom + 8,
    left: center,
    transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
  };
}

export function TeachingNoteMenu({
  rect,
  sessionId,
  storyId,
  paragraphPosition,
  selectedText,
  textSide,
  onClose,
  onSaved,
}: {
  rect: TeachingNoteAnchor;
  sessionId: string;
  storyId: string;
  paragraphPosition: number;
  selectedText: string;
  textSide: VideoSummaryNoteSide;
  onClose: () => void;
  onSaved: (note: VideoSummaryTeachingNote) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<VideoSummaryNoteType>("vocabulary");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const place = menuPlacement(rect, open);

  useEffect(() => {
    if (!open) return;
    noteRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="selection-flag-menu"
      style={{ top: place.top, left: place.left, transform: place.transform }}
      role="toolbar"
      aria-label="Nota"
      onMouseDown={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("textarea")) return;
        event.preventDefault();
      }}
    >
      <div className="selection-flag-menu-row">
        <button
          type="button"
          className={`selection-flag-menu-action${open ? " selection-flag-menu-action-on" : ""}`}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Nota
        </button>
      </div>
      {open ? (
        <div className="selection-flag-menu-note">
          <div className="selection-flag-menu-row" role="group" aria-label="Tipo">
            {NOTE_TYPES.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`selection-flag-menu-action${noteType === row.id ? " selection-flag-menu-action-on" : ""}`}
                aria-pressed={noteType === row.id}
                onClick={() => setNoteType(row.id)}
              >
                {row.label}
              </button>
            ))}
          </div>
          <label className="mt-2 block text-label-sm text-text-secondary" htmlFor="note-text">
            Nota
          </label>
          <textarea
            ref={noteRef}
            id="note-text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-1 min-h-20 w-full rounded-card border border-paper-line bg-surface p-2 text-label-md text-text-primary focus:border-accent focus:outline-none"
          />
          {error ? <p className="mt-1 text-label-sm text-error">{error}</p> : null}
          <ActionButton
            className="mt-2 w-full"
            state={pending ? "pending" : "idle"}
            pendingLabel="Guardando..."
            onClick={async () => {
              setPending(true);
              setError("");
              const result = await addVideoSummaryNote({
                sessionId,
                storyId,
                paragraphPosition,
                selectedText,
                note,
                noteType,
                textSide,
              });
              setPending(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onSaved({
                id: result.id,
                storyId,
                courseSessionId: sessionId,
                paragraphPosition,
                selectedText,
                note,
                noteType,
                textSide,
                createdBy: "",
                createdAt: new Date().toISOString(),
              });
              onClose();
            }}
          >
            Guardar
          </ActionButton>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

export default function VideoSummaryTeachingNote() {
  return null;
}
