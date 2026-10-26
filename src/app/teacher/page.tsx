import { CalendarDays } from "lucide-react";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import {
  isLiveOnlySessionType,
  sessionTypeLabel,
  teacherJoinAppHref,
} from "@/lib/activities";
import { hasSessionContent } from "@/lib/dashboard";
import NewMonthButton from "@/components/teacher/NewMonthButton";
import TeacherPageHeader from "@/components/teacher/TeacherPageHeader";
import ThisMonthBoard, {
  type ThisMonthGroup,
} from "@/components/teacher/ThisMonthBoard";
import { teacherClassHref } from "@/components/teacher/teacher-ui";
import { getClassDayPhase } from "@/lib/session-phase";
import {
  countActiveStudentsByCourse,
  courseLevelLabel,
  currentSessionKindLabel,
  currentYearMonth,
  isCourseInCurrentOrFutureMonth,
  loadSessionsForCourses,
  loadTeacherCourses,
  pickCurrentSession,
  pickTodayTeacherSession,
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
  const allCourseIds = courses.map((course) => course.id);
  const unarchivedIds = unarchived.map((course) => course.id);

  const [studentCountByCourse, sessions] = await Promise.all([
    countActiveStudentsByCourse(supabase, unarchivedIds),
    loadSessionsForCourses(supabase, allCourseIds),
  ]);

  const sessionsByCourse = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const list = sessionsByCourse.get(session.courseId) ?? [];
    list.push(session);
    sessionsByCourse.set(session.courseId, list);
  }

  const groups: ThisMonthGroup[] = unarchived
    .filter((course) =>
      isCourseInCurrentOrFutureMonth(
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
      const upcoming = (sessionsByCourse.get(course.id) ?? []).filter(
        (session) => session.sessionDate >= `${yearMonth}-01`
      );
      const boardSessions = (
        monthSessions.length > 0 ? monthSessions : upcoming
      ).toSorted(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      const current = pickCurrentSession(boardSessions);
      const todaySession = pickTodayTeacherSession(boardSessions);
      const groupHref = `/teacher/classes/${course.id}`;

      return {
        id: course.id,
        href: groupHref,
        name: course.name,
        theme: course.theme,
        levelLabel: courseLevelLabel(course.level),
        studentLabel: studentCountLabel(
          studentCountByCourse.get(course.id) ?? 0
        ),
        sessionStarts: boardSessions.map((session) => session.start),
        zoomHref: course.zoom_url,
        classes: boardSessions.map((session, index) => ({
          id: session.id,
          number: index + 1,
          typeLabel: sessionTypeLabel(session.sessionType),
          title: sessionTitle(session),
          start: session.start,
          ready: hasSessionContent(session),
          pending: session.sessionType === "flex",
          href: teacherClassHref(course.id, session.id),
          isToday: session.id === todaySession?.id,
        })),
        next: current
          ? {
              sessionId: current.session.id,
              kindLabel: currentSessionKindLabel(current.kind),
              typeLabel: sessionTypeLabel(current.session.sessionType),
              title: sessionTitle(current.session),
              start: current.session.start,
            }
          : null,
        today: todaySession
          ? {
              sessionId: todaySession.id,
              sessionStartTime: todaySession.start,
              sessionEndTime: todaySession.end,
              classEndedAt: todaySession.classEndedAt,
              typeLabel: sessionTypeLabel(todaySession.sessionType),
              title: sessionTitle(todaySession),
              appHref: isLiveOnlySessionType(todaySession.sessionType)
                ? null
                : teacherJoinAppHref({
                    sessionType: todaySession.sessionType,
                    token: todaySession.token,
                    courseId: course.id,
                    sessionId: todaySession.id,
                    conversationPromptId: todaySession.conversationPromptId,
                  }),
              zoomHref: course.zoom_url,
              classHref: teacherClassHref(course.id, todaySession.id),
              recordingMissing: !todaySession.recordingYoutubeUrl,
              initialPhase: getClassDayPhase({
                sessionStartTime: todaySession.start,
                sessionEndTime: todaySession.end,
                classEndedAt: todaySession.classEndedAt,
              }),
            }
          : null,
      };
    })
    .toSorted((a, b) => Number(Boolean(b.today)) - Number(Boolean(a.today)));

  const wizardCourses = courses.map((course) => {
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
  });

  return (
    <section>
      <TeacherPageHeader
        title="Este mes"
        description="Lo que tienes hoy y lo que falta preparar."
        action={
          groups.length > 0 ? (
            <NewMonthButton courses={wizardCourses} variant="secondary" />
          ) : null
        }
      />

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
            Cuando esté listo el grupo, créalo aquí. Las 8 clases salen solas.
          </p>
          <div className="mt-6">
            <NewMonthButton courses={wizardCourses} />
          </div>
        </div>
      ) : (
        <ThisMonthBoard groups={groups} />
      )}
    </section>
  );
}
