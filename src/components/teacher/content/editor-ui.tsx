"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export const fieldClass =
  "w-full rounded-card border border-paper-line bg-white px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none";

export const monoFieldClass = `${fieldClass} font-mono text-sm leading-6`;

export function EditorSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sheet border border-paper-line bg-surface p-5">
      <h2 className="text-headline-md text-text-primary">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function EditorField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label-md text-text-secondary">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-label-sm text-text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function SaveBar({
  dirty,
  pending,
  saved,
  error,
  onSave,
}: {
  dirty: boolean;
  pending: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={pending || !dirty}
        className="relative inline-flex min-h-11 items-center justify-center rounded-card bg-accent px-5 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
        {dirty && !pending ? (
          <span
            className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white"
            aria-hidden="true"
          />
        ) : null}
      </button>
      {saved && !dirty ? (
        <p className="text-sm text-success">Listo. Ya quedó guardado.</p>
      ) : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}

export function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-paper-line bg-warning-bg px-4 py-3 text-sm text-warning">
      {children}
    </p>
  );
}

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function ReorderControls({
  index,
  total,
  onMove,
  onDelete,
  deleteLabel,
}: {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent disabled:opacity-40"
        aria-label="Subir"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent disabled:opacity-40"
        aria-label="Bajar"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-card text-error hover:bg-error-bg"
        aria-label={deleteLabel}
        onClick={onDelete}
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-card border border-paper-line px-4 text-label-md text-text-primary hover:bg-surface-hover"
    >
      {label}
    </button>
  );
}
