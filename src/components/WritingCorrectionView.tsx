import type { ReactNode } from "react";
import type { DiffSegment, InlineNote } from "@/lib/writing";

const MARK = {
  added: "rounded-[2px] font-semibold text-success bg-success-bg",
  deleted: "rounded-[2px] line-through text-error bg-error-bg",
  good: "rounded-[2px] text-text-accent bg-accent-soft",
} as const;

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

      const className = [
        "px-0.5",
        segment.type === "added"
          ? MARK.added
          : segment.type === "deleted"
            ? MARK.deleted
            : "",
        isGood ? MARK.good : "",
      ]
        .filter(Boolean)
        .join(" ");

      parts.push(
        <span key={`${i}-${j}`} className={className}>
          {token}
          {note ? (
            <span className="ml-1 align-super text-[10px] font-medium text-text-accent no-underline">
              ({note})
            </span>
          ) : null}
        </span>
      );
    });
  });

  return (
    <div className="rounded-card border border-paper-line bg-accent-softer px-3 py-3">
      <p className="mb-2 text-label-sm text-text-accent">
        Correccion de Profe Kyle:
      </p>
      <p className="text-body-main leading-relaxed text-text-primary">{parts}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-label-sm">
        <span className={`${MARK.added} inline-block px-1.5 py-0.5`}>
          falta
        </span>
        <span className={`${MARK.deleted} inline-block px-1.5 py-0.5`}>
          sobra
        </span>
        <span className={`${MARK.good} inline-block px-1.5 py-0.5`}>
          buen vocabulario
        </span>
      </div>
    </div>
  );
}
