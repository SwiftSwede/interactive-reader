import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import type { CourseLevel } from "@/types";
import CreateSessionForm from "./CreateSessionForm";
import CopySessionLink from "./CopySessionLink";
import DeleteSessionButton from "./DeleteSessionButton";
import LocalDateTime from "@/components/LocalDateTime";

export const metadata = {
  title: "Clases - Profe Kyle",
};

type StoryOption = {
  id: string;
  title: string;
};

type SessionRow = {
  id: string;
  session_start_time: string;
  session_link_token: string;
  notes: string | null;
  stories: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

type AttendanceRow = {
  course_session_id: string;
  student_id: string;
  attended: boolean;
};

type EnrollmentRow = {
  student_id: string;
  display_name: string;
};

function levelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

function storyFromJoin(
  stories: SessionRow["stories"]
): { title: string; slug: string } | null {
  if (!stories) return null;
  return Array.isArray(stories) ? stories[0] ?? null : stories;
}

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
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, name, level, teacher_id, archived")
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course || course.archived) {
    redirect("/teacher");
  }

  const { data: storyRows } = await supabase
    .from("stories")
    .select("id, title")
    .eq("level", course.level)
    .order("title");

  const stories = (storyRows ?? []) as StoryOption[];

  const { data: sessionRows } = await supabase
    .from("course_sessions")
    .select(
      "id, session_start_time, session_link_token, notes, stories ( title, slug )"
    )
    .eq("course_id", course.id)
    .order("session_start_time", { ascending: false });

  const sessions = (sessionRows ?? []) as SessionRow[];
  const sessionIds = sessions.map((session) => session.id);

  const [{ data: attendanceRows }, { data: enrollmentRows }] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from("session_attendance")
          .select("course_session_id, student_id, attended")
          .in("course_session_id", sessionIds)
          .eq("attended", true)
      : Promise.resolve({ data: [] as AttendanceRow[] }),
    supabase
      .from("course_enrollments")
      .select("student_id, display_name")
      .eq("course_id", course.id),
  ]);

  const nameByStudentId = new Map(
    ((enrollmentRows ?? []) as EnrollmentRow[]).map((row) => [
      row.student_id,
      row.display_name.trim() || "Sin nombre",
    ])
  );

  const attendedNamesBySession = new Map<string, string[]>();
  for (const row of (attendanceRows ?? []) as AttendanceRow[]) {
    const names = attendedNamesBySession.get(row.course_session_id) ?? [];
    names.push(nameByStudentId.get(row.student_id) ?? "Sin nombre");
    attendedNamesBySession.set(row.course_session_id, names);
  }

  for (const names of attendedNamesBySession.values()) {
    names.sort((a, b) => a.localeCompare(b, "es"));
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Profe Kyle</p>
          <div className="flex items-center gap-4">
            <Link
              href="/teacher"
              className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
            >
              Cursos
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {levelLabel(course.level as CourseLevel)}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Una clase es un Zoom: una historia, 90 minutos, un link para el chat.
        </p>

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Nueva clase
          </h2>
          <CreateSessionForm courseId={course.id} stories={stories} />
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
                const story = storyFromJoin(session.stories);
                const attendedNames =
                  attendedNamesBySession.get(session.id) ?? [];
                return (
                  <li key={session.id} className="px-3 py-3">
                    <p className="font-medium text-gray-900">
                      {story?.title ?? "Historia"}
                    </p>
                    <LocalDateTime iso={session.session_start_time} />
                    {session.notes && (
                      <p className="mt-1 text-sm text-gray-600">
                        {session.notes}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-600">
                      {attendanceLabel(attendedNames)}
                    </p>
                    {attendedNames.length > 0 && (
                      <p className="mt-0.5 break-words text-sm text-gray-500">
                        {attendedNames.join(", ")}
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-2 items-stretch gap-2">
                      {story ? (
                        <CopySessionLink
                          slug={story.slug}
                          token={session.session_link_token}
                        />
                      ) : (
                        <span />
                      )}
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
    </main>
  );
}
