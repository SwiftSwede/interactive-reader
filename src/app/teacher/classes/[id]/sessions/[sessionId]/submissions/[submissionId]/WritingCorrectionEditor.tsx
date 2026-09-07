"use client";

import { useState } from "react";
import Link from "next/link";
import { saveWritingCorrection } from "../../../../actions";
import { tokenizeWords, wordDiff } from "@/lib/writing";
import WritingCorrectionView from "@/components/WritingCorrectionView";

export default function WritingCorrectionEditor({
  courseId,
  sessionId,
  submissionId,
  originalText,
  initialCorrectedText,
  initialNotes,
  initialGoodVocabulary,
  initialDiff,
  studentLink,
}: {
  courseId: string;
  sessionId: string;
  submissionId: string;
  originalText: string;
  initialCorrectedText: string;
  initialNotes: Array<{ word_index: number; note: string }>;
  initialGoodVocabulary: number[];
  initialDiff: Array<{
    text: string;
    type: "kept" | "added" | "deleted";
  }> | null;
  studentLink: string;
}) {
  const words = tokenizeWords(originalText);
  const [correctedText, setCorrectedText] = useState(initialCorrectedText);
  const [tool, setTool] = useState<"vocab" | "note">("vocab");
  const [goodVocabulary, setGoodVocabulary] = useState<number[]>(
    initialGoodVocabulary
  );
  const [notes, setNotes] = useState(initialNotes);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteIndex, setNoteIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(Boolean(initialDiff));

  const goodSet = new Set(goodVocabulary);
  const previewDiff = wordDiff(originalText, correctedText);

  const handleWordClick = (index: number) => {
    if (tool === "vocab") {
      setGoodVocabulary((prev) =>
        prev.includes(index)
          ? prev.filter((item) => item !== index)
          : [...prev, index]
      );
      setSaved(false);
      return;
    }
    setNoteIndex(index);
    setNoteDraft(notes.find((note) => note.word_index === index)?.note ?? "");
  };

  const saveNote = () => {
    if (noteIndex === null) return;
    const trimmed = noteDraft.trim();
    setNotes((prev) => {
      const without = prev.filter((note) => note.word_index !== noteIndex);
      if (!trimmed) return without;
      return [...without, { word_index: noteIndex, note: trimmed }];
    });
    setNoteIndex(null);
    setNoteDraft("");
    setSaved(false);
  };

  return (
    <form
      className="mt-8 space-y-6"
      action={async (formData) => {
        setPending(true);
        setError("");
        setSaved(false);
        const result = await saveWritingCorrection(formData);
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="originalText" value={originalText} />
      <input type="hidden" name="correctedText" value={correctedText} />
      <input type="hidden" name="inlineNotes" value={JSON.stringify(notes)} />
      <input
        type="hidden"
        name="goodVocabulary"
        value={JSON.stringify(goodVocabulary)}
      />

      <div>
        <p className="text-sm font-medium text-text-primary">Texto original</p>
        <p className="mt-1 text-xs text-text-muted">
          Toca una palabra para marcar vocabulario o dejar una nota.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setTool("vocab")}
            className={`h-9 rounded-card border px-3 text-sm ${
              tool === "vocab"
                ? "border-sky-700 bg-sky-700 text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Vocabulario
          </button>
          <button
            type="button"
            onClick={() => setTool("note")}
            className={`h-9 rounded-card border px-3 text-sm ${
              tool === "note"
                ? "border-accent bg-accent text-white"
                : "border-paper-line text-text-primary"
            }`}
          >
            Nota
          </button>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-1 gap-y-2 text-base leading-relaxed text-text-primary">
          {words.map((word, index) => {
            const hasNote = notes.some((note) => note.word_index === index);
            const isGood = goodSet.has(index);
            return (
              <button
                key={`${word}-${index}`}
                type="button"
                onClick={() => handleWordClick(index)}
                className={`rounded-sm px-0.5 ${
                  isGood ? "bg-sky-100 text-sky-800" : ""
                } ${hasNote ? "underline decoration-accent decoration-dotted" : ""}`}
              >
                {word}
              </button>
            );
          })}
        </p>
        {noteIndex !== null && (
          <div className="mt-3 rounded-card border border-paper-line bg-accent-softer px-3 py-3">
            <p className="text-xs font-medium text-text-accent">
              Nota en &quot;{words[noteIndex]}&quot;
            </p>
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              className="mt-2 w-full rounded-card border border-paper-line px-3 py-2 text-sm text-text-primary"
              placeholder="Corta, en español"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveNote}
                className="rounded-card bg-accent px-3 py-1.5 text-sm text-white"
              >
                Guardar nota
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteIndex(null);
                  setNoteDraft("");
                }}
                className="rounded-card px-3 py-1.5 text-sm text-text-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-text-primary">
          Texto corregido
        </span>
        <textarea
          value={correctedText}
          onChange={(e) => {
            setCorrectedText(e.target.value);
            setSaved(false);
          }}
          rows={12}
          className="mt-2 w-full resize-y rounded-card border border-paper-line px-3 py-3 text-base leading-relaxed text-text-primary focus:border-2 focus:border-accent focus:outline-none"
        />
      </label>

      <p className="text-xs text-text-muted">
        rojo = sobra, verde = falta, azul = buen vocabulario
      </p>

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-card bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar corrección"}
      </button>

      {saved && (
        <p className="text-sm text-text-secondary">
          Listo. El estudiante lo ve en el mismo link de Zoom.{" "}
          <Link
            href={studentLink}
            className="text-text-accent underline-offset-2 hover:underline"
          >
            Abrir ese link
          </Link>
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">
          Así lo ve el estudiante
        </p>
        <WritingCorrectionView
          diff={previewDiff}
          notes={notes}
          goodVocabulary={goodVocabulary}
        />
      </div>
    </form>
  );
}
