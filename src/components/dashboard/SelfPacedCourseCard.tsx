import Link from "next/link";
import { selfPacedCardCopy } from "@/lib/library-access";

const actionClass =
  "mt-4 inline-flex min-h-12 items-center justify-center rounded-card bg-accent px-4 text-label-md text-white hover:bg-accent-hover active:bg-accent-hover";

export default function SelfPacedCourseCard({
  courseId,
  name,
  completed,
  ready,
  planned,
  nextHref,
}: {
  courseId: string;
  name: string;
  completed: number;
  ready: number;
  planned: number;
  nextHref: string | null;
}) {
  const copy = selfPacedCardCopy(completed, ready, planned);
  const percent =
    ready === 0 ? 0 : Math.min(100, Math.round((completed / ready) * 100));
  const courseHref = `/course/${courseId}`;

  return (
    <article className="mt-4 rounded-sheet border border-paper-line bg-surface p-4">
      <Link
        href={courseHref}
        className="text-label-md text-text-primary hover:text-text-accent"
      >
        {name}
      </Link>
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
        <Link href={nextHref} className={actionClass}>
          Continuar
        </Link>
      ) : copy.showCatalog ? (
        <Link href={courseHref} className={actionClass}>
          Ver lecciones
        </Link>
      ) : null}
    </article>
  );
}
