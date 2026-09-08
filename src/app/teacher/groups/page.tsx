import Link from "next/link";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import NewMonthButton from "@/components/teacher/NewMonthButton";
import LocalDateTime from "@/components/LocalDateTime";
import ClassDayCard from "@/components/dashboard/ClassDayCard";
import { TEACHER_APP_LABEL } from "@/components/dashboard/JoinCard";
import {
  isLiveOnlySessionType,
  sessionTypeLabel,
} from "@/lib/activities";
import { getClassDayPhase } from "@/lib/session-phase";
import {
  countActiveStudentsByCourse,
  courseLevelLabel,
  courseMonthKey,
  loadSessionsForCourses,
  loadTeacherCourses,
  monthLabelFromYearMonth,
  pickCurrentSession,
  pickTodayTeacherSession,
  studentCountLabel,
} from "@/lib/teacher";

export const metadata = {
  title: "Grupos - Profe Kyle",
};

export default async function TeacherGroupsPage() {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const courses = await loadTeacherCourses(supabase, teacher.id);
  const courseIds = courses.map((course) => course.id);

  const [studentCountByCourse, sessions] = await Promise.all([
    countActiveStudentsByCourse(supabase, courseIds),
    loadSessionsForCourses(supabase, courseIds),
  ]);

  const sessionsByCourse = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const list = sessionsByCourse.get(session.courseId) ?? [];
    list.push(session);
    sessionsByCourse.set(session.courseId, list);
  }

  const current = courses.filter((course) => !course.archived);
  const archived = courses.filter((course) => course.archived);
  const todayCards = courses.flatMap((course) => {
    const todaySession = pickTodayTeacherSession(
      sessionsByCourse.get(course.id) ?? []
    );
    if (!todaySession) return [];
    const liveOnly = isLiveOnlySessionType(todaySession.sessionType);
    return [
      {
        courseId: course.id,
        name: course.name,
        liveOnly,
        sessionStartTime: todaySession.start,
        sessionEndTime: todaySession.end,
        sessionDate: todaySession.sessionDate,
        typeLabel: sessionTypeLabel(todaySession.sessionType),
        appHref: liveOnly
          ? null
          : `/teacher/classes/${course.id}/sessions/${todaySession.id}`,
        zoomHref: course.zoom_url,
      },
    ];
  });

  function CourseList({
    rows,
  }: {
    rows: typeof courses;
  }) {
    if (rows.length === 0) return null;
    return (
      <ul className="overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
        {rows.map((course) => {
          const courseSessions = sessionsByCourse.get(course.id) ?? [];
          const currentSession = pickCurrentSession(courseSessions);
          const month = monthLabelFromYearMonth(
            courseMonthKey(courseSessions, course.created_at)
          );
          return (
            <li key={course.id}>
              <Link
                href={`/teacher/classes/${course.id}`}
                className="block px-4 py-4 hover:bg-surface-hover active:bg-surface-hover"
              >
                <p className="text-label-md text-text-primary">{course.name}</p>
                <p className="mt-1 text-label-sm text-text-secondary">
                  {courseLevelLabel(course.level)} · {month} ·{" "}
                  {studentCountLabel(studentCountByCourse.get(course.id) ?? 0)}
                </p>
                {currentSession ? (
                  <div className="mt-1 text-label-sm text-text-muted">
                    <LocalDateTime iso={currentSession.session.start} />
                  </div>
                ) : (
                  <p className="mt-1 text-label-sm text-text-muted">
                    Todavía no hay clase.
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-text-primary">Grupos</h1>
          <p className="mt-2 text-body-main text-text-secondary">
            Todos los grupos. Los meses anteriores siguen aquí.
          </p>
        </div>
        <NewMonthButton />
      </div>

      {courses.length === 0 ? (
        <p className="mt-10 text-body-main text-text-muted">
          Todavía no tienes un grupo. Crea el primero.
        </p>
      ) : (
        <>
          {todayCards.map((card) => (
            <ClassDayCard
              key={card.courseId}
              sessionStartTime={card.sessionStartTime}
              sessionEndTime={card.sessionEndTime}
              sessionDate={card.sessionDate}
              href={card.appHref}
              zoomHref={card.zoomHref}
              appLabel={TEACHER_APP_LABEL}
              typeLabel={card.typeLabel}
              courseName={card.name}
              liveOnly={card.liveOnly}
              initialPhase={getClassDayPhase({
                sessionStartTime: card.sessionStartTime,
                sessionEndTime: card.sessionEndTime,
              })}
            />
          ))}
          <div className="mt-8">
            <CourseList rows={current} />
          </div>
          {archived.length > 0 ? (
            <div className="mt-10">
              <h2 className="mb-3 text-headline-md text-text-primary">
                Meses anteriores
              </h2>
              <CourseList rows={archived} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
