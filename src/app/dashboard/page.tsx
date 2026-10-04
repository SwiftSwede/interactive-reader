import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BookOpen, ChevronRight } from "lucide-react";
import BrowsingShell from "@/components/shell/BrowsingShell";
import ClassDayCard from "@/components/dashboard/ClassDayCard";
import LessonCard from "@/components/dashboard/LessonCard";
import { requireBrowsingStudent, browsingClassroomLevel } from "@/lib/browsing-auth";
import { loadDashboard } from "@/lib/dashboard";
import { sessionTypeLabel } from "@/lib/activities";
import { getClassDayPhase } from "@/lib/session-phase";
import { toDrillLevel } from "@/lib/drills";
import { loadStudentPractice } from "@/lib/student-drills";
import MissionCard from "@/components/dashboard/MissionCard";
import ReviewCard from "@/components/dashboard/ReviewCard";
import WelcomeGate from "@/components/WelcomeGate";

export const metadata = {
  title: "Inicio - Profe Kyle",
};

async function loadInicioPractice(
  supabase: SupabaseClient,
  userId: string,
  level: ReturnType<typeof browsingClassroomLevel>
) {
  if (!level) return null;
  try {
    return await loadStudentPractice(supabase, {
      userId,
      level: toDrillLevel(level),
    });
  } catch (error) {
    console.error(
      "Inicio practice failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export default async function DashboardPage() {
  const { supabase, user, profile, displayName, preview } =
    await requireBrowsingStudent("/dashboard");
  const [data, practice] = await Promise.all([
    loadDashboard(
      supabase,
      user.id,
      browsingClassroomLevel(profile, preview),
      displayName,
      preview ? { previewAsLevel: preview.level } : undefined
    ),
    preview
      ? Promise.resolve(null)
      : loadInicioPractice(
          supabase,
          user.id,
          browsingClassroomLevel(profile, preview)
        ),
  ]);

  const greeting = data.displayName ? `Hola, ${data.displayName}` : "Hola";
  const hasCourse = data.courseDisplayName != null;

  const today = data.todaySession;
  const joinHero =
    today != null &&
    getClassDayPhase({
      sessionStartTime: today.sessionStartTime,
      sessionEndTime: today.sessionEndTime,
      classEndedAt: today.classEndedAt,
    }) === "join";
  const showResume = data.resume != null && !joinHero;
  const progressPercent =
    data.totals.total === 0
      ? 0
      : Math.min(100, Math.round((data.totals.completed / data.totals.total) * 100));

  return (
    <BrowsingShell activeTab="inicio" previewLevel={preview?.level ?? null}>
      <WelcomeGate skip={Boolean(preview)}>
      <section className="pt-6">
        <h1 className="text-headline-lg text-text-primary">{greeting}</h1>

        {today && data.courseDisplayName ? (
          <ClassDayCard
            sessionStartTime={today.sessionStartTime}
            sessionEndTime={today.sessionEndTime}
            classEndedAt={today.classEndedAt}
            sessionDate={today.sessionDate}
            href={today.href}
            zoomHref={data.zoomUrl}
            typeLabel={sessionTypeLabel(today.sessionType)}
            courseName={data.courseDisplayName}
            liveOnly={today.liveOnly}
            initialPhase={getClassDayPhase({
              sessionStartTime: today.sessionStartTime,
              sessionEndTime: today.sessionEndTime,
              classEndedAt: today.classEndedAt,
            })}
          />
        ) : null}

        {showResume && data.resume ? (
          <Link
            href={data.resume.href}
            className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-card border border-paper-line bg-surface px-3 py-3 hover:bg-surface-hover active:bg-accent-soft"
          >
            <span>
              <span className="block text-label-sm text-text-muted">
                Seguir la lección
              </span>
              <span className="mt-1 block text-headline-md text-text-primary">
                {data.resume.title}
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
          </Link>
        ) : null}

        {practice?.intro ? (
          <MissionCard
            displayName={practice.intro.displayName}
            dismissedUntil={practice.intro.dismissedUntil}
          />
        ) : null}

        {practice && practice.reviewCount > 0 ? <ReviewCard /> : null}

        {hasCourse ? (
          <Link
            href="/progress"
            className="mt-6 block rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover"
          >
            <p className="text-label-md text-text-primary">
              {data.courseDisplayName}
            </p>
            {data.courseTheme ? (
              <p className="mt-1 text-label-sm text-text-secondary">
                {data.courseTheme}
              </p>
            ) : null}
            <p className="mt-1 text-label-md text-text-secondary">
              Clases completadas: {data.totals.completed} de {data.totals.total}
            </p>
            <div
              className="mt-3 h-1 overflow-hidden rounded-full bg-paper-line"
              aria-hidden="true"
            >
              <div
                className="h-full bg-accent"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </Link>
        ) : null}

        {!hasCourse ? (
          <div className="mt-16 flex flex-col items-center px-4 text-center">
            <BookOpen
              className="h-12 w-12 text-text-muted"
              aria-hidden="true"
            />
            <p className="mt-4 text-body-main text-text-secondary">
              Aún no estás en un grupo. Tu profe te enviará un enlace.
            </p>
          </div>
        ) : data.lessons.length === 0 ? (
          <div className="mt-16 flex flex-col items-center px-4 text-center">
            <BookOpen
              className="h-12 w-12 text-text-muted"
              aria-hidden="true"
            />
            <p className="mt-4 text-body-main text-text-secondary">
              Tu profe todavía no ha publicado las clases de este mes.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mt-6 text-headline-md text-text-primary">Este mes</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {data.lessons.map((lesson) => (
                <li key={lesson.sessionId}>
                  <LessonCard
                    sessionType={lesson.sessionType}
                    title={lesson.title}
                    lifecycle={lesson.lifecycle}
                    completed={lesson.completed}
                    hasRecording={lesson.hasRecording}
                    sessionDate={lesson.sessionDate}
                    href={lesson.href}
                    liveOnly={lesson.liveOnly}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

      </section>
      </WelcomeGate>
    </BrowsingShell>
  );
}
