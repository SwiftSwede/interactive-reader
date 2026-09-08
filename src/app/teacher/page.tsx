import { CalendarDays } from "lucide-react";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { hasSessionContent } from "@/lib/dashboard";
import {
  isLiveOnlySessionType,
  sessionTypeLabel,
  teacherJoinAppHref,
} from "@/lib/activities";
import NewMonthButton from "@/components/teacher/NewMonthButton";
import ThisMonthBoard, {
  type ThisMonthGroup,
} from "@/components/teacher/ThisMonthBoard";
import ClassDayCard from "@/components/dashboard/ClassDayCard";
import { TEACHER_APP_LABEL } from "@/components/dashboard/JoinCard";
import { getClassDayPhase } from "@/lib/session-phase";
import {
  countActiveStudentsByCourse,
  courseLevelLabel,
  currentSessionKindLabel,
  currentYearMonth,
  isCourseInMonth,
  loadSessionsForCourses,
  loadTeacherCourses,
  pickCurrentSession,
  pickTodayTeacherSession,
  readinessLabel,
  sessionTitle,
  sessionsInMonth,
  studentCountLabel,
} from "@/lib/teacher";

export const metadata = {
  title: "Este mes - Profe Kyle",
};

export default async function TeacherHomePage() {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const yearMonth = currentYearMonth();
  const courses = await loadTeacherCourses(supabase, teacher.id);
  const unarchived = courses.filter((course) => !course.archived);
  const courseIds = unarchived.map((course) => course.id);

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

  const groups: ThisMonthGroup[] = unarchived
    .filter((course) =>
      isCourseInMonth(
        sessionsByCourse.get(course.id) ?? [],
        course.created_at,
        yearMonth
      )
    )
    .map((course) => {
      const monthSessions = sessionsInMonth(
        sessionsByCourse.get(course.id) ?? [],
        yearMonth
      );
      const current = pickCurrentSession(monthSessions);
      const todaySession = pickTodayTeacherSession(monthSessions);
      const liveOnly = todaySession
        ? isLiveOnlySessionType(todaySession.sessionType)
        : false;
      return {
        id: course.id,
        name: course.name,
        levelLabel: courseLevelLabel(course.level),
        studentLabel: studentCountLabel(
          studentCountByCourse.get(course.id) ?? 0
        ),
        sessionStarts: monthSessions.map((session) => session.start),
        readiness: readinessLabel(monthSessions),
        next: current
          ? {
              kindLabel: currentSessionKindLabel(current.kind),
              title: sessionTitle(current.session),
              start: current.session.start,
              typeLabel: sessionTypeLabel(current.session.sessionType),
              ready: hasSessionContent(current.session),
            }
          : null,
        today: todaySession
          ? {
              sessionStartTime: todaySession.start,
              sessionEndTime: todaySession.end,
              classEndedAt: todaySession.classEndedAt,
              sessionDate: todaySession.sessionDate,
              typeLabel: sessionTypeLabel(todaySession.sessionType),
              liveOnly,
              appHref: teacherJoinAppHref({
                sessionType: todaySession.sessionType,
                token: todaySession.token,
                courseId: course.id,
                sessionId: todaySession.id,
                conversationPromptId: todaySession.conversationPromptId,
              }),
              zoomHref: course.zoom_url,
            }
          : null,
      };
    });

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-text-primary">Este mes</h1>
          <p className="mt-2 text-body-main text-text-secondary">
            Los grupos de este mes. Toca una tarjeta para ver la próxima clase.
          </p>
        </div>
        {groups.length > 0 ? <NewMonthButton /> : null}
      </div>

      {groups.length === 0 ? (
        <div className="mt-16 flex flex-col items-center px-4 text-center">
          <CalendarDays
            className="h-12 w-12 text-text-muted"
            aria-hidden="true"
          />
          <p className="mt-4 text-headline-md text-text-primary">
            Próximo mes en preparación
          </p>
          <p className="mt-2 max-w-md text-body-main text-text-secondary">
            Cuando esté listo el grupo, créalo aquí. Las 8 clases las armas
            después.
          </p>
          <div className="mt-6">
            <NewMonthButton />
          </div>
        </div>
      ) : (
        <>
          {groups
            .filter((group) => group.today)
            .map((group) => (
              <ClassDayCard
                key={group.id}
                sessionStartTime={group.today!.sessionStartTime}
                sessionEndTime={group.today!.sessionEndTime}
                sessionDate={group.today!.sessionDate}
                href={group.today!.appHref}
                zoomHref={group.today!.zoomHref}
                appLabel={TEACHER_APP_LABEL}
                typeLabel={group.today!.typeLabel}
                courseName={group.name}
                liveOnly={group.today!.liveOnly}
                initialPhase={getClassDayPhase({
                  sessionStartTime: group.today!.sessionStartTime,
                  sessionEndTime: group.today!.sessionEndTime,
                })}
              />
            ))}
          <ThisMonthBoard groups={groups} />
        </>
      )}
    </section>
  );
}
