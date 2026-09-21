"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CONTENT_KIND_FILTERS,
  CONTENT_LEVEL_FILTERS,
  contentKindLabel,
  contentLevelLabel,
  filterContentItems,
  type ContentIndexItem,
  type ContentKind,
} from "@/lib/content-editor";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-label-md ${
        active
          ? "border-accent bg-accent-soft text-text-accent"
          : "border-paper-line bg-surface text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

export default function ContentIndex({ items }: { items: ContentIndexItem[] }) {
  const [kind, setKind] = useState<ContentKind | "all">("all");
  const [level, setLevel] = useState<string>("all");
  const filtered = useMemo(
    () => filterContentItems(items, kind, level),
    [items, kind, level]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CONTENT_KIND_FILTERS.map((item) => (
          <Chip
            key={item.id}
            active={kind === item.id}
            onClick={() => setKind(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONTENT_LEVEL_FILTERS.map((item) => (
          <Chip
            key={item.id}
            active={level === item.id}
            onClick={() => setLevel(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-body-main text-text-secondary">
          No hay contenido con ese filtro.
        </p>
      ) : (
        <ul className="mt-8 overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
          {filtered.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex min-h-14 flex-col gap-1 px-4 py-3 hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-body-main text-text-primary">
                  {item.title}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-label-sm text-text-muted">
                  <span className="rounded-full bg-accent-softer px-2 py-0.5 text-text-accent">
                    {contentKindLabel(item.kind)}
                  </span>
                  <span>{contentLevelLabel(item.level)}</span>
                  {item.wordCount != null ? (
                    <span>{item.wordCount} palabras</span>
                  ) : null}
                  {item.theme ? <span>{item.theme}</span> : null}
                  {item.questionCount != null ? (
                    <span>{item.questionCount} preguntas</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
