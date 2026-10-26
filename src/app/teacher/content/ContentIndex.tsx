"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CONTENT_KIND_FILTERS,
  CONTENT_LEVEL_FILTERS,
  contentKindLabel,
  contentLevelLabel,
  filterContentItems,
  sortContentItems,
  type ContentIndexItem,
  type ContentKind,
  type ContentSort,
} from "@/lib/content-editor";
import type { CatalogKind } from "@/lib/catalog-crud";
import DeleteContentButton from "@/components/teacher/content/DeleteContentButton";
import { TEACHER_BUTTON_SECONDARY } from "@/components/teacher/teacher-ui";

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
      className={`inline-flex min-h-11 items-center rounded-card border px-4 text-label-md ${
        active
          ? "border-accent bg-accent-soft text-text-accent"
          : "border-paper-line bg-surface text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

function catalogKindOf(item: ContentIndexItem): CatalogKind {
  if (
    item.kind === "writing" ||
    item.kind === "exam" ||
    item.kind === "presentation" ||
    item.kind === "conversation"
  ) {
    return item.kind;
  }
  return "story";
}

function catalogIdOf(item: ContentIndexItem): string {
  return item.key.split(":")[1] ?? "";
}

function lessonCountLabel(count: number): string {
  if (count === 0) return "0 lecciones";
  if (count === 1) return "1 lección";
  return `${count} lecciones`;
}

const SORT_OPTIONS: { id: ContentSort; label: string }[] = [
  { id: "recent", label: "Recientes" },
  { id: "title", label: "Nombre" },
  { id: "kind", label: "Tipo" },
  { id: "level", label: "Nivel" },
];

const CREATE_LINKS = [
  { href: "/teacher/content/writing/new", label: "Nueva escritura" },
  { href: "/teacher/content/exam/new", label: "Nuevo examen" },
  { href: "/teacher/content/presentation/new", label: "Nueva presentación" },
  { href: "/teacher/content/conversation/new", label: "Nueva conversación" },
] as const;

export default function ContentIndex({
  items,
  canDelete,
}: {
  items: ContentIndexItem[];
  canDelete: boolean;
}) {
  const [kind, setKind] = useState<ContentKind | "all">("all");
  const [level, setLevel] = useState<string>("all");
  const [sort, setSort] = useState<ContentSort>("recent");
  const visible = useMemo(
    () => sortContentItems(filterContentItems(items, kind, level), sort),
    [items, kind, level, sort]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CREATE_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={TEACHER_BUTTON_SECONDARY}>
            {link.label}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-label-sm text-text-muted">
        Los cuentos se crean por el pipeline de importación.{" "}
        <Link
          href="/teacher/content/courses"
          className="text-text-accent underline-offset-4 hover:underline"
        >
          Cursos autoguiados
        </Link>
        {" · "}
        <Link
          href="/teacher/products"
          className="text-text-accent underline-offset-4 hover:underline"
        >
          Productos
        </Link>
      </p>

      <div className="mt-8 flex flex-col gap-5">
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
        <div className="flex flex-wrap gap-2">
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
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-body-main text-text-secondary">
          No hay contenido con ese filtro.
        </p>
      ) : (
        <div className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-label-sm text-text-muted">
              {lessonCountLabel(visible.length)}
            </p>
            <label className="flex items-center gap-2">
              <span className="text-label-sm text-text-secondary">Ordenar</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ContentSort)}
                className="min-h-11 min-w-[10rem] rounded-card border border-paper-line bg-surface px-3 text-label-md text-text-primary focus:border-2 focus:border-accent focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
            {visible.map((item) => (
              <li key={item.key} className="flex items-stretch">
                <Link
                  href={item.href}
                  className="flex min-h-14 min-w-0 flex-1 flex-col gap-1 px-4 py-3 hover:bg-surface-hover sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span className="min-w-0">
                    <span className="block text-label-sm text-text-muted">
                      {contentKindLabel(item.kind)} · {contentLevelLabel(item.level)}
                    </span>
                    <span className="mt-0.5 block text-label-md text-text-primary">
                      {item.title}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-text-muted sm:justify-end">
                    {item.wordCount != null && item.wordCount > 0 ? (
                      <span>{item.wordCount} palabras</span>
                    ) : null}
                    {item.theme ? <span>{item.theme}</span> : null}
                    {item.questionCount != null ? (
                      <span>
                        {item.questionCount}{" "}
                        {item.questionCount === 1 ? "pregunta" : "preguntas"}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {canDelete ? (
                  <DeleteContentButton
                    kind={catalogKindOf(item)}
                    id={catalogIdOf(item)}
                    title={item.title}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
