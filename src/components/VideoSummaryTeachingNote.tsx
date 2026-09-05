"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  VideoSummaryNoteType,
  VideoSummaryTeachingNote,
} from "@/types";
import { addVideoSummaryNote, deleteVideoSummaryNote } from "@/app/lesson/[slug]/video-summary-actions";

const NOTE_TYPES: { id: VideoSummaryNoteType; label: string }[] = [
  { id: "vocabulary", label: "Vocabulario" },
  { id: "grammar", label: "Gramática" },
  { id: "pronunciation", label: "Pronunciación" },
  { id: "cultural", label: "Cultura" },
];

export function noteTypeLabel(noteType: VideoSummaryNoteType): string {
  return NOTE_TYPES.find((row) => row.id === noteType)?.label ?? "Nota";
}

export function markFirstMatch(text: string, needle: string): string[] {
  if (!needle) return [text];
  const index = text.indexOf(needle);
  if (index < 0) return [text];
  return [text.slice(0, index), needle, text.slice(index + needle.length)];
}

export function HighlightedText({
  text,
  notes,
  className,
  onSelect,
  onOpenNote,
}: {
  text: string;
  notes: VideoSummaryTeachingNote[];
  className?: string;
  onSelect?: () => void;
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
    <div
      className={className}
      onMouseUp={(event) => {
        if ((event.target as HTMLElement).closest(".teaching-note-mark")) {
          return;
        }
        onSelect?.();
      }}
    >
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

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

  return (
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
          <button
            type="button"
            disabled={pending}
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
            className="mt-4 h-11 w-full rounded-card border border-paper-line text-label-md text-error disabled:opacity-60"
          >
            Borrar
          </button>
        ) : null}
      </div>
    </dialog>
  );
}

export function TeachingNotePopup({
  sessionId,
  storyId,
  paragraphPosition,
  selectedText,
  onClose,
  onSaved,
}: {
  sessionId: string;
  storyId: string;
  paragraphPosition: number;
  selectedText: string;
  onClose: () => void;
  onSaved: (note: VideoSummaryTeachingNote) => void;
}) {
  const dialogRef = useNoteDialog(onClose);
  const titleId = useId();
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<VideoSummaryNoteType>("vocabulary");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
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
        <p id={titleId} className="text-label-sm text-text-muted">
          &ldquo;{selectedText}&rdquo;
        </p>
        <label
          className="mt-2 block text-label-sm text-text-secondary"
          htmlFor="note-type"
        >
          Tipo
        </label>
        <select
          id="note-type"
          value={noteType}
          onChange={(event) =>
            setNoteType(event.target.value as VideoSummaryNoteType)
          }
          className="mt-1 min-h-11 w-full rounded-card border border-paper-line px-3 text-label-md"
        >
          {NOTE_TYPES.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
        <label
          className="mt-2 block text-label-sm text-text-secondary"
          htmlFor="note-text"
        >
          Nota
        </label>
        <textarea
          id="note-text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-card border border-paper-line px-3 py-2 text-body-main"
        />
        {error ? (
          <p className="mt-1 text-label-sm text-error">{error}</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
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
                createdBy: "",
                createdAt: new Date().toISOString(),
              });
              dialogRef.current?.close();
            }}
            className="h-11 flex-1 rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-11 flex-1 rounded-card border border-paper-line text-label-md"
          >
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function VideoSummaryTeachingNote() {
  return null;
}
