import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { CourseOutlineRow } from "@/lib/library-access";

export default function CourseOutline({
  name,
  meter,
  finished,
  pendingLine,
  rows,
}: {
  name: string;
  meter: string;
  finished: boolean;
  pendingLine: string | null;
  rows: CourseOutlineRow[];
}) {
  return (
    <section className="pt-6">
      <h1 className="text-headline-lg text-text-primary">{name}</h1>
      <p className="mt-1 text-label-md text-text-secondary">{meter}</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-body-main text-text-secondary">
          Todavía no hay lecciones en este curso.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.storyId}>
              {row.href ? (
                <Link
                  href={row.href}
                  aria-current={row.status === "current" ? "step" : undefined}
                  className={
                    row.status === "current"
                      ? "flex min-h-12 items-center gap-3 rounded-card border border-accent bg-accent-soft px-4 text-label-md text-text-primary"
                      : "flex min-h-12 items-center gap-3 rounded-card border border-paper-line bg-surface px-4 text-label-md text-text-primary hover:bg-surface-hover active:bg-surface-hover"
                  }
                >
                  {row.status === "done" ? (
                    <Check
                      className="h-5 w-5 shrink-0 text-secondary-accent"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="h-5 w-5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">{row.title}</span>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <p className="flex min-h-12 items-center gap-3 px-4 text-label-md text-text-muted">
                  <span className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {row.title}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {pendingLine ? (
        <p className="mt-6 text-body-main text-text-secondary">{pendingLine}</p>
      ) : null}
      {finished ? (
        <p className="mt-6 text-label-md text-text-secondary">Completaste el curso.</p>
      ) : null}
    </section>
  );
}
