import Link from "next/link";
import { selfPacedCardCopy } from "@/lib/library-access";

export default function SelfPacedCourseCard({
  name,
  completed,
  total,
  nextHref,
}: {
  name: string;
  completed: number;
  total: number;
  nextHref: string | null;
}) {
  const copy = selfPacedCardCopy(completed, total);
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

  return (
    <article className="mt-4 rounded-sheet border border-paper-line bg-surface p-4">
      <p className="text-label-md text-text-primary">{name}</p>
      <p className="mt-1 text-label-md text-text-secondary">{copy.meter}</p>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-paper-line"
        aria-hidden="true"
      >
        <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      {copy.finished ? (
        <p className="mt-3 text-label-md text-text-secondary">
          Completaste el curso.
        </p>
      ) : nextHref ? (
        <Link
          href={nextHref}
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-card bg-accent px-4 text-label-md text-white hover:bg-accent-hover active:bg-accent-hover"
        >
          Continuar
        </Link>
      ) : null}
    </article>
  );
}
