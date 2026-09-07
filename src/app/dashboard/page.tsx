import Link from "next/link";
import { BookOpen } from "lucide-react";
import BrowsingShell from "@/components/shell/BrowsingShell";
import ClassDayCard from "@/components/dashboard/ClassDayCard";
import LessonCard from "@/components/dashboard/LessonCard";
import { requireBrowsingStudent } from "@/lib/browsing-auth";
import { loadDashboard } from "@/lib/dashboard";
import { sessionTypeLabel } from "@/lib/activities";
import { getClassDayPhase } from "@/lib/session-phase";

export const metadata = {
  title: "Inicio - Profe Kyle",
};

export default async function DashboardPage() {
  const { supabase, user, profile, displayName } =
    await requireBrowsingStudent("/dashboard");
  const data = await loadDashboard(
    supabase,
    user.id,
    profile?.classroomLevel ?? null,
    displayName
  );

  const greeting = data.displayName ? `Hola, ${data.displayName}` : "Hola";
  const hasCourse = data.courseDisplayName != null;
  const showPractice =
    data.practice.dictationAttempts > 0 ||
    data.practice.wordsLookedUp > 0 ||
    data.practice.pronunciationSessions > 0;

  const today = data.todaySession;
  const progressPercent =
    data.totals.total === 0
      ? 0
      : Math.min(100, Math.round((data.totals.completed / data.totals.total) * 100));

  return (
    <BrowsingShell activeTab="inicio">
      <section className="pt-6">
        <h1 className="text-headline-lg text-text-primary">{greeting}</h1>

        {today && data.courseDisplayName ? (
          <ClassDayCard
            sessionStartTime={today.sessionStartTime}
            sessionEndTime={today.sessionEndTime}
            sessionDate={today.sessionDate}
            href={today.href}
            zoomHref={data.zoomUrl}
            typeLabel={sessionTypeLabel(today.sessionType)}
            courseName={data.courseDisplayName}
            liveOnly={today.liveOnly}
            initialPhase={getClassDayPhase({
              sessionStartTime: today.sessionStartTime,
              sessionEndTime: today.sessionEndTime,
            })}
          />
        ) : null}

        {hasCourse ? (
          <Link
            href="/progress"
            className="mt-6 block rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover"
          >
            <p className="text-label-md text-text-primary">
              {data.courseDisplayName}
            </p>
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
                    recordingYoutubeUrl={lesson.recordingYoutubeUrl}
                    sessionDate={lesson.sessionDate}
                    href={lesson.href}
                    liveOnly={lesson.liveOnly}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {showPractice ? (
          <>
            <h2 className="mt-8 text-headline-md text-text-primary">
              Práctica reciente
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-body-main text-text-secondary">
              <li>
                <span className="font-semibold text-text-primary">Dictado:</span>{" "}
                {data.practice.dictationAttempts}{" "}
                {data.practice.dictationAttempts === 1 ? "intento" : "intentos"}
              </li>
              <li>
                <span className="font-semibold text-text-primary">
                  Palabras:
                </span>{" "}
                {data.practice.wordsLookedUp}
              </li>
              <li>
                <span className="font-semibold text-text-primary">
                  Pronunciación:
                </span>{" "}
                {data.practice.pronunciationSessions}{" "}
                {data.practice.pronunciationSessions === 1
                  ? "sesión"
                  : "sesiones"}
              </li>
            </ul>
          </>
        ) : null}
      </section>
    </BrowsingShell>
  );
}
