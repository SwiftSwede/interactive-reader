"use client";

import { useState } from "react";
import type {
  VideoSummaryNoteType,
  VideoSummaryTeachingNote,
} from "@/types";
import { addVideoSummaryNote } from "@/app/lesson/[slug]/video-summary-actions";

const NOTE_TYPES: { id: VideoSummaryNoteType; label: string }[] = [
  { id: "vocabulary", label: "Vocabulario" },
  { id: "grammar", label: "Gramática" },
  { id: "pronunciation", label: "Pronunciación" },
  { id: "cultural", label: "Cultura" },
];

export function markFirstMatch(text: string, needle: string): string[] {
  if (!needle) return [text];
  const index = text.indexOf(needle);
  if (index < 0) return [text];
  return [
    text.slice(0, index),
    needle,
    text.slice(index + needle.length),
  ];
}

export function HighlightedText({
  text,
  notes,
  className,
  onSelect,
}: {
  text: string;
  notes: VideoSummaryTeachingNote[];
  className?: string;
  onSelect?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

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
    <div className={className} onMouseUp={onSelect}>
      {pieces.map((piece, index) =>
        piece.note ? (
          <button
            key={`${piece.note.id}-${index}`}
            type="button"
            className="teaching-note-mark rounded-sm px-0.5 text-left"
            onClick={() =>
              setOpenId((current) =>
                current === piece.note?.id ? null : piece.note?.id ?? null
              )
            }
          >
            {piece.text}
            {openId === piece.note.id && (
              <span className="mt-1 block rounded-card border border-paper-line bg-white px-2 py-2 text-label-sm text-text-secondary">
                {piece.note.note}
              </span>
            )}
          </button>
        ) : (
          <span key={`t-${index}`}>{piece.text}</span>
        )
      )}
    </div>
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
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<VideoSummaryNoteType>("vocabulary");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="mt-2 rounded-card border border-paper-line bg-white px-3 py-3">
      <p className="text-label-sm text-text-muted">&ldquo;{selectedText}&rdquo;</p>
      <label className="mt-2 block text-label-sm text-text-secondary" htmlFor="note-type">
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
      <label className="mt-2 block text-label-sm text-text-secondary" htmlFor="note-text">
        Nota
      </label>
      <textarea
        id="note-text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        className="mt-1 w-full rounded-card border border-paper-line px-3 py-2 text-body-main"
      />
      {error && <p className="mt-1 text-label-sm text-error">{error}</p>}
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
              id: crypto.randomUUID(),
              storyId,
              courseSessionId: sessionId,
              paragraphPosition,
              selectedText,
              note,
              noteType,
              createdBy: "",
              createdAt: new Date().toISOString(),
            });
            onClose();
          }}
          className="h-11 flex-1 rounded-card bg-accent text-label-md font-medium text-white disabled:opacity-60"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-card border border-paper-line text-label-md"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function VideoSummaryTeachingNote() {
  return null;
}
