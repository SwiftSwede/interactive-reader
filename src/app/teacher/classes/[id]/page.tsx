import Link from "next/link";
import { areAnswersUnlocked } from "@/lib/sessions";
import type { CourseLevel } from "@/types";
import CreateSessionForm from "./CreateSessionForm";
import CopySessionLink from "./CopySessionLink";
import DeleteSessionButton from "./DeleteSessionButton";
import UnlockAnswersButton from "./UnlockAnswersButton";
import LocalDateTime from "@/components/LocalDateTime";
import CourseRoster from "./CourseRoster";
import {
  courseLevelLabel,
  getOwnedCourse,
  loadCourseRoster,
  loadCourseSessions,
  sessionTitle,
} from "@/lib/teacher";
import { studentSessionPath } from "@/lib/activities";

export const metadata = {
  title: "Clases - Profe Kyle",
};

type StoryOption = {
  id: string;
  title: string;
};

function attendanceLabel(names: string[]): string {
  if (names.length === 0) return "Nadie ha entrado todavía.";
  return `Asistieron: ${names.length}`;
}

export default async function CourseClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, supabase } = await getOwnedCourse(id);

  const { data: storyRows } = await supabase
    .from("stories")
    .select("id, title")
    .eq("level", course.level)
    .order("title");

  const stories = (storyRows ?? []) as StoryOption[];
  const sessions = await loadCourseSessions(supabase, course.id);
  const { students: roster, displayNames } = await loadCourseRoster(
    supabase,
    course.id,
    sessions
  );
  const sessionIds = sessions.map((session) => session.id);

  const { data: attendanceRows } =
    sessionIds.length > 0
      ? await supabase
          .from("session_attendance")
          .select("course_session_id, student_id, attended")
          .in("course_session_id", sessionIds)
          .eq("attended", true)
      : { data: [] };

  const nameByStudentId = new Map(Object.entries(displayNames));

  const attendedNamesBySession = new Map<string, string[]>();
  for (const row of (attendanceRows ?? []) as {
    course_session_id: string;
    student_id: string;
    attended: boolean;
  }[]) {
    const names = attendedNamesBySession.get(row.course_session_id) ?? [];
    names.push(nameByStudentId.get(row.student_id) ?? "Sin nombre");
    attendedNamesBySession.set(row.course_session_id, names);
  }

  for (const names of attendedNamesBySession.values()) {
    names.sort((a, b) => a.localeCompare(b, "es"));
  }

  return (
    <section className="mx-auto max-w-md px-4 py-10 md:max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {courseLevelLabel(course.level as CourseLevel)}
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Una clase es un Zoom: una actividad, 90 minutos, un link para el chat.
      </p>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Estudiantes
        </h2>
        <p className="mb-3 text-sm text-gray-600">
          Solo quienes siguen pagando. Si pausaron en ThriveCart, no salen
          aquí. Moverlos de grupo no cambia lo que pagan.
        </p>
        <CourseRoster
          courseId={course.id}
          courseLevel={course.level as CourseLevel}
          students={roster}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Nueva clase
        </h2>
        <CreateSessionForm
          courseId={course.id}
          courseLevel={course.level as CourseLevel}
          stories={stories}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Clases</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay clases. Crea la primera.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {sessions.map((session) => {
              const attendedNames = attendedNamesBySession.get(session.id) ?? [];
              const unlocked = areAnswersUnlocked({
                answersRevealed: session.answersRevealed,
                sessionEndTime: session.end,
              });
              return (
                <li key={session.id} className="px-3 py-3">
                  <Link
                    href={`/teacher/classes/${course.id}/sessions/${session.id}`}
                    className="block"
                  >
                    <p className="font-medium text-gray-900 hover:underline">
                      {sessionTitle(session)}
                    </p>
                    <LocalDateTime iso={session.start} />
                  </Link>
                  {session.notes && (
                    <p className="mt-1 text-sm text-gray-600">{session.notes}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {attendanceLabel(attendedNames)}
                  </p>
                  {attendedNames.length > 0 && (
                    <p className="mt-0.5 break-words text-sm text-gray-500">
                      {attendedNames.join(", ")}
                    </p>
                  )}
                  {session.sessionType === "story" ? (
                    unlocked ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Respuestas desbloqueadas.
                      </p>
                    ) : (
                      <div className="mt-2">
                        <UnlockAnswersButton
                          courseId={course.id}
                          sessionId={session.id}
                        />
                      </div>
                    )
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 items-stretch gap-2">
                    <CopySessionLink
                      href={studentSessionPath({
                        sessionType: session.sessionType,
                        token: session.token,
                        storySlug: session.story?.slug,
                      })}
                    />
                    <DeleteSessionButton
                      courseId={course.id}
                      sessionId={session.id}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
