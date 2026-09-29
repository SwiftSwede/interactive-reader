import type { ReactNode } from "react";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isSoundBankCandidate,
  loadCourseAnalytics,
  type AnalyticsSound,
  type CourseAnalytics,
} from "@/lib/analytics";
import {
  loadSessionsForCourses,
  loadTeacherCourses,
  type TeacherCourseRow,
} from "@/lib/teacher";

export const metadata = {
  title: "Analíticas - Profe Kyle",
};

export default async function TeacherAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const teacher = await requireTeacher("/teacher");
  const { course: requestedCourseId } = await searchParams;
  const supabase = await createClient();
  const courses = await loadTeacherCourses(supabase, teacher.id);
  const sessions = await loadSessionsForCourses(
    supabase,
    courses.map((course) => course.id)
  );
  const defaultCourseId = sessions[0]?.courseId ?? courses[0]?.id ?? null;
  const selectedCourseId = courses.some((course) => course.id === requestedCourseId)
    ? requestedCourseId
    : defaultCourseId;

  const analytics =
    selectedCourseId == null
      ? null
      : await loadCourseAnalytics(createAdminClient(), selectedCourseId);

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Analíticas</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Histórico del grupo
      </p>

      {courses.length === 0 || analytics == null || selectedCourseId == null ? (
        <p className="mt-8 text-sm text-text-muted">Todavía no hay grupos.</p>
      ) : (
        <>
          <nav
            className="mt-5 flex flex-wrap gap-2"
            aria-label="Grupos"
          >
            {courses.map((course) => (
              <CourseTab
                key={course.id}
                course={course}
                active={course.id === selectedCourseId}
              />
            ))}
          </nav>

          <AnalyticsBlocks analytics={analytics} />
        </>
      )}
    </section>
  );
}

function CourseTab({
  course,
  active,
}: {
  course: TeacherCourseRow;
  active: boolean;
}) {
  return (
    <Link
      href={`/teacher/analytics?course=${course.id}`}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-label-md ${
        active
          ? "border-accent bg-accent-soft text-text-accent"
          : "border-paper-line bg-surface text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {course.name}
    </Link>
  );
}

function AnalyticsBlocks({ analytics }: { analytics: CourseAnalytics }) {
  return (
    <>
      <CountBlock
        title="Palabras más consultadas"
        empty="Todavía no hay palabras acumuladas."
        headers={["palabra", "estudiantes", "veces"]}
        rows={analytics.words.map((word) => (
          <CountRow
            key={word.flagText}
            label={word.flagText}
            counts={[word.studentCount, word.timesTotal]}
          />
        ))}
      />

      <CountBlock
        title="Errores frecuentes"
        empty="Todavía no hay errores guardados."
        headers={["error", "estudiantes", "señales"]}
        rows={analytics.errors.map((row) => (
          <CountRow
            key={row.tagId}
            label={row.displayName}
            counts={[row.studentCount, row.signalCount]}
          />
        ))}
      />

      <SoundBlock sounds={analytics.sounds} />
    </>
  );
}

function CountBlock({
  title,
  empty,
  headers,
  rows,
}: {
  title: string;
  empty: string;
  headers: [string, string, string];
  rows: ReactNode[];
}) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-headline-md text-text-primary">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">{empty}</p>
      ) : (
        <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line">
          <li className="flex items-baseline justify-between gap-3 px-3 py-2 text-label-sm text-text-muted">
            <span className="min-w-0">{headers[0]}</span>
            <span className="flex shrink-0 gap-4">
              <span className="w-16 text-right">{headers[1]}</span>
              <span className="w-16 text-right">{headers[2]}</span>
            </span>
          </li>
          {rows}
        </ol>
      )}
    </div>
  );
}

function CountRow({
  label,
  counts,
}: {
  label: string;
  counts: [number, number];
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-3 py-2">
      <span className="min-w-0 font-medium text-text-primary">{label}</span>
      <span className="flex shrink-0 gap-4 text-sm text-text-muted">
        <span className="w-16 text-right">{counts[0]}</span>
        <span className="w-16 text-right">{counts[1]}</span>
      </span>
    </li>
  );
}

function SoundBlock({ sounds }: { sounds: AnalyticsSound[] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-headline-md text-text-primary">Sonidos débiles</h2>
      {sounds.length === 0 ? (
        <p className="text-sm text-text-muted">
          Todavía no hay sonidos marcados.
        </p>
      ) : (
        <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line">
          <li className="flex items-baseline justify-between gap-3 px-3 py-2 text-label-sm text-text-muted">
            <span className="min-w-0">sonido</span>
            <span className="w-16 shrink-0 text-right">estudiantes</span>
          </li>
          {sounds.map((sound) => {
            const candidate = isSoundBankCandidate(sound.studentCount);
            return (
              <li
                key={sound.tagId}
                className={`flex items-baseline justify-between gap-3 px-3 py-2 ${
                  candidate ? "bg-surface-hover" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="ipa-text font-medium text-text-primary">
                    {sound.displayName}
                  </span>
                  {candidate ? (
                    <span className="mt-1 block text-xs text-text-muted">
                      candidato para banco de sonidos
                    </span>
                  ) : null}
                </span>
                <span className="w-16 shrink-0 text-right text-sm text-text-muted">
                  {sound.studentCount}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
