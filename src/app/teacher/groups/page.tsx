import Link from "next/link";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import NewMonthButton from "@/components/teacher/NewMonthButton";
import LocalDateTime from "@/components/LocalDateTime";
import GroupTodayBand from "@/components/teacher/GroupTodayBand";
import TeacherPageHeader from "@/components/teacher/TeacherPageHeader";
import { toGroupToday } from "@/components/teacher/group-today";
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
    return [
      {
        courseId: course.id,
        name: course.name,
        today: toGroupToday(course, todaySession),
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
                {course.theme ? (
                  <p className="mt-1 text-label-sm text-text-secondary">
                    {course.theme}
                  </p>
                ) : null}
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
      <TeacherPageHeader
        title="Grupos"
        description="Todos los grupos. Los meses anteriores siguen aquí."
        action={
          <NewMonthButton
            variant={courses.length > 0 ? "secondary" : "primary"}
            courses={courses.map((course) => {
              const list = sessionsByCourse.get(course.id) ?? [];
              return {
                id: course.id,
                name: course.name,
                level: course.level,
                archived: course.archived,
                createdAt: course.created_at,
                sessionStarts: list.map((session) => session.start),
                sessionDates: list.map((session) => session.sessionDate),
              };
            })}
          />
        }
      />

      {courses.length === 0 ? (
        <p className="mt-10 text-body-main text-text-muted">
          Todavía no tienes un grupo. Crea el primero.
        </p>
      ) : (
        <>
          {todayCards.length > 0 ? (
            <div className="mt-8 space-y-3">
              {todayCards.map((card) => (
                <GroupTodayBand
                  key={card.courseId}
                  today={card.today}
                  groupName={card.name}
                  standalone
                />
              ))}
            </div>
          ) : null}
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
