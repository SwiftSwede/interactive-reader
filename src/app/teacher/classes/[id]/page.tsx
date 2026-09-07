import type { CourseLevel } from "@/types";
import CourseRoster from "./CourseRoster";
import TeacherSessionRow from "@/components/teacher/TeacherSessionRow";
import DeleteCourseButton from "./DeleteCourseButton";
import CourseWorkspace from "@/components/teacher/CourseWorkspace";
import NewClassButton from "@/components/teacher/NewClassButton";
import {
  courseLevelLabel,
  getOwnedCourse,
  loadCourseRoster,
  loadCourseSessions,
} from "@/lib/teacher";

export const metadata = {
  title: "Clases - Profe Kyle",
};

type StoryOption = {
  id: string;
  title: string;
  kind?: string | null;
};

export default async function CourseClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, supabase } = await getOwnedCourse(id);

  const { data: storyRows } = await supabase
    .from("stories")
    .select("id, title, kind")
    .eq("level", course.level)
    .order("title");

  const stories = (storyRows ?? []) as StoryOption[];

  const { data: presentationRows } =
    course.level === "intermediate"
      ? await supabase
          .from("presentation_prompts")
          .select("id, title")
          .eq("level", "intermediate")
          .order("title")
      : { data: [] };

  const presentationPrompts = (presentationRows ?? []) as {
    id: string;
    title: string;
  }[];
  const sessions = await loadCourseSessions(supabase, course.id);
  const orderedSessions = [...sessions].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
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
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-text-primary">{course.name}</h1>
          <p className="mt-1 text-label-sm text-text-muted">
            {courseLevelLabel(course.level as CourseLevel)}
          </p>
          <p className="mt-2 text-body-main text-text-secondary">
            Una clase es un Zoom: una actividad, 90 minutos, un link para el
            chat.
          </p>
        </div>
        <DeleteCourseButton courseId={course.id} courseName={course.name} />
      </div>

      <CourseWorkspace
        classes={
          <>
            <div className="mb-4 flex justify-end">
              <NewClassButton
                courseId={course.id}
                courseLevel={course.level as CourseLevel}
                stories={stories}
                presentationPrompts={presentationPrompts}
              />
            </div>
            {orderedSessions.length === 0 ? (
              <p className="text-body-main text-text-muted">
                Todavía no hay clases. Crea la primera.
              </p>
            ) : (
              <ul className="overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
                {orderedSessions.map((session) => (
                  <TeacherSessionRow
                    key={session.id}
                    courseId={course.id}
                    session={session}
                    attendedNames={attendedNamesBySession.get(session.id) ?? []}
                  />
                ))}
              </ul>
            )}
          </>
        }
        students={
          <>
            <p className="mb-3 text-body-main text-text-secondary">
              Solo quienes siguen pagando. Si pausaron en ThriveCart, no salen
              aquí. Moverlos de grupo no cambia lo que pagan.
            </p>
            <CourseRoster
              courseId={course.id}
              courseLevel={course.level as CourseLevel}
              students={roster}
            />
          </>
        }
      />
    </section>
  );
}
