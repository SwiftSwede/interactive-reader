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
        <p className="text-sm font-medium text-gray-800">Texto original</p>
        <p className="mt-1 text-xs text-gray-500">
          Toca una palabra para marcar vocabulario o dejar una nota.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setTool("vocab")}
            className={`h-9 rounded-lg border px-3 text-sm ${
              tool === "vocab"
                ? "border-sky-700 bg-sky-700 text-white"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Vocabulario
          </button>
          <button
            type="button"
            onClick={() => setTool("note")}
            className={`h-9 rounded-lg border px-3 text-sm ${
              tool === "note"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Nota
          </button>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-1 gap-y-2 text-base leading-relaxed text-gray-800">
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
                } ${hasNote ? "underline decoration-indigo-400 decoration-dotted" : ""}`}
              >
                {word}
              </button>
            );
          })}
        </p>
        {noteIndex !== null && (
          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3">
            <p className="text-xs font-medium text-indigo-500">
              Nota en &quot;{words[noteIndex]}&quot;
            </p>
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800"
              placeholder="Corta, en español"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveNote}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white"
              >
                Guardar nota
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteIndex(null);
                  setNoteDraft("");
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-800">
          Texto corregido
        </span>
        <textarea
          value={correctedText}
          onChange={(e) => {
            setCorrectedText(e.target.value);
            setSaved(false);
          }}
          rows={12}
          className="mt-2 w-full resize-y rounded-lg border border-gray-200 px-3 py-3 text-base leading-relaxed text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </label>

      <p className="text-xs text-gray-400">
        rojo = sobra, verde = falta, azul = buen vocabulario
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar corrección"}
      </button>

      {saved && (
        <p className="text-sm text-gray-700">
          Listo. El estudiante lo ve en el mismo link de Zoom.{" "}
          <Link
            href={studentLink}
            className="text-indigo-600 underline-offset-2 hover:underline"
          >
            Abrir ese link
          </Link>
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-gray-800">
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
