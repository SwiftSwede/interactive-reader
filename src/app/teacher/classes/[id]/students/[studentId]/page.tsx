import Link from "next/link";
import { notFound } from "next/navigation";
import LocalDateTime from "@/components/LocalDateTime";
import {
  getOwnedCourse,
  loadCourseSessions,
  loadSessionStudentStatus,
  loadStudentLookups,
} from "@/lib/teacher";

export const metadata = {
  title: "Estudiante - Profe Kyle",
};

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; studentId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { id, studentId } = await params;
  const { session: focusSessionId } = await searchParams;
  const { course, supabase } = await getOwnedCourse(id);
  const sessions = await loadCourseSessions(supabase, course.id);

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("student_id, display_name")
    .eq("course_id", course.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!enrollment) {
    notFound();
  }

  const displayName = enrollment.display_name.trim() || "Sin nombre";

  const perSession = await Promise.all(
    sessions.map(async (session) => {
      const [students, lookups] = await Promise.all([
        loadSessionStudentStatus(
          supabase,
          course.id,
          session.id,
          session.storyId
        ),
        loadStudentLookups(supabase, session.id, studentId),
      ]);
      const status = students.find((row) => row.studentId === studentId);
      return { session, status, lookups };
    })
  );

  const focusedFirst = [...perSession].sort((a, b) => {
    if (focusSessionId) {
      if (a.session.id === focusSessionId) return -1;
      if (b.session.id === focusSessionId) return 1;
    }
    return 0;
  });

  return (
    <section className="mx-auto max-w-md px-4 py-10 md:max-w-2xl">
      <p className="text-sm text-gray-500">
        <Link
          href={`/teacher/classes/${course.id}`}
          className="underline-offset-2 hover:text-gray-800 hover:underline"
        >
          {course.name}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{displayName}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Lo que hizo en cada clase. Sin juicios, solo lo que se ve.
      </p>

      {focusedFirst.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          Todavía no hay clases en este curso.
        </p>
      ) : (
        <ul className="mt-8 space-y-6">
          {focusedFirst.map(({ session, status, lookups }) => {
            const focused = session.id === focusSessionId;
            return (
              <li
                key={session.id}
                id={`session-${session.id}`}
                className={`rounded-lg border px-3 py-3 ${
                  focused ? "border-indigo-200 bg-indigo-50/40" : "border-gray-100"
                }`}
              >
                <Link
                  href={`/teacher/classes/${course.id}/sessions/${session.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {session.story?.title ?? "Historia"}
                </Link>
                <LocalDateTime iso={session.start} />
                <p className="mt-2 text-sm text-gray-600">
                  {status?.opened
                    ? status.attended
                      ? "Abrió la historia. Llegó a tiempo."
                      : "Abrió la historia. Fuera de la ventana de clase."
                    : "Todavía no abre esta historia."}
                </p>
                {status?.openedAt && (
                  <LocalDateTime iso={status.openedAt} />
                )}

                <h3 className="mt-4 text-sm font-semibold text-gray-800">
                  Comprensión
                </h3>
                {!status || status.answers.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">
                    Todavía no escribió respuestas.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {status.answers.map((answer) => (
                      <li key={answer.questionId}>
                        <p className="text-xs font-medium text-gray-500">
                          {answer.position}. {answer.question}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-800">
                          {answer.responseText.trim() || "(vacío)"}
                        </p>
                        <LocalDateTime iso={answer.submittedAt} />
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="mt-4 text-sm font-semibold text-gray-800">
                  Palabras que tocó
                </h3>
                {lookups.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">
                    No tocó ninguna palabra, o todavía no lo estamos
                    guardando.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {lookups.map((lookup) => (
                      <li
                        key={`${lookup.text}-${lookup.lookedUpAt}`}
                        className="flex flex-wrap items-baseline gap-2"
                      >
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-800">
                          {lookup.text}
                        </span>
                        <LocalDateTime iso={lookup.lookedUpAt} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
