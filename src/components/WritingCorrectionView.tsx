import type { ReactNode } from "react";
import type { DiffSegment, InlineNote } from "@/lib/writing";

export default function WritingCorrectionView({
  diff,
  notes,
  goodVocabulary,
}: {
  diff: DiffSegment[];
  notes: InlineNote[] | null;
  goodVocabulary: number[] | null;
}) {
  const good = new Set(goodVocabulary ?? []);
  const noteByIndex = new Map(
    (notes ?? []).map((note) => [note.word_index, note.note])
  );

  let originalIndex = 0;
  const parts: ReactNode[] = [];

  diff.forEach((segment, i) => {
    const tokens = segment.text.split(/(\s+)/);
    tokens.forEach((token, j) => {
      if (!token) return;
      const isSpace = /^\s+$/.test(token);
      if (isSpace) {
        parts.push(<span key={`${i}-${j}`}>{token}</span>);
        return;
      }

      const isOriginal =
        segment.type === "kept" || segment.type === "deleted";
      const index = isOriginal ? originalIndex : null;
      if (isOriginal) originalIndex += 1;

      const isGood = index !== null && good.has(index);
      const note = index !== null ? noteByIndex.get(index) : undefined;

      let className = "rounded-sm px-0.5";
      if (segment.type === "added") {
        className += " bg-emerald-100 font-semibold text-emerald-700";
      } else if (segment.type === "deleted") {
        className += " bg-red-100 text-red-600 line-through";
      }
      if (isGood) {
        className += " bg-sky-100 text-sky-800";
      }

      parts.push(
        <span key={`${i}-${j}`} className={className}>
          {token}
          {note ? (
            <span className="ml-1 align-super text-[10px] font-medium text-indigo-500 no-underline">
              ({note})
            </span>
          ) : null}
        </span>
      );
    });
  });

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3">
      <p className="mb-2 text-xs font-medium text-indigo-400">
        Correccion de Profe Kyle:
      </p>
      <p className="text-sm leading-relaxed text-gray-800">{parts}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
        <span className="text-emerald-700">verde = falta</span>
        <span className="text-red-600">rojo = sobra</span>
        <span className="text-sky-700">azul = buen vocabulario</span>
      </div>
    </div>
  );
}
