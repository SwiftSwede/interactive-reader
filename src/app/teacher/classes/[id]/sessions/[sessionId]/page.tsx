import Link from "next/link";
import { notFound } from "next/navigation";
import { areAnswersUnlocked } from "@/lib/sessions";
import UnlockAnswersButton from "../../UnlockAnswersButton";
import CopySessionLink from "../../CopySessionLink";
import LocalDateTime from "@/components/LocalDateTime";
import {
  getOwnedCourse,
  loadCourseSessions,
  loadLookedUpWords,
  loadSessionStudentStatus,
} from "@/lib/teacher";

export const metadata = {
  title: "Clase - Profe Kyle",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { course, supabase } = await getOwnedCourse(id);
  const sessions = await loadCourseSessions(supabase, course.id);
  const session = sessions.find((row) => row.id === sessionId);

  if (!session) {
    notFound();
  }

  const [students, lookedUpWords] = await Promise.all([
    loadSessionStudentStatus(
      supabase,
      course.id,
      session.id,
      session.storyId
    ),
    loadLookedUpWords(supabase, session.id),
  ]);

  const unlocked = areAnswersUnlocked({
    answersRevealed: session.answersRevealed,
    sessionEndTime: session.end,
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
      <h1 className="mt-2 text-2xl font-bold text-gray-900">
        {session.story?.title ?? "Historia"}
      </h1>
      <LocalDateTime iso={session.start} />
      {session.notes && (
        <p className="mt-2 text-sm text-gray-600">{session.notes}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {session.story ? (
          <CopySessionLink slug={session.story.slug} token={session.token} />
        ) : (
          <span />
        )}
        {unlocked ? (
          <p className="flex items-center text-sm text-gray-500">
            Respuestas desbloqueadas.
          </p>
        ) : (
          <UnlockAnswersButton
            courseId={course.id}
            sessionId={session.id}
          />
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Palabras más consultadas
        </h2>
        {lookedUpWords === null ? (
          <p className="text-sm text-gray-500">
            Todavía no estamos guardando las palabras. Eso llega con el
            siguiente paso.
          </p>
        ) : lookedUpWords.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía nadie ha tocado una palabra.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {lookedUpWords.map((word) => (
              <li
                key={word.text}
                className="flex items-baseline justify-between gap-3 px-3 py-2"
              >
                <span className="font-medium text-gray-900">{word.text}</span>
                <span className="text-sm text-gray-500">
                  {word.studentCount === 1
                    ? "1 estudiante"
                    : `${word.studentCount} estudiantes`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Estudiantes
        </h2>
        {students.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay estudiantes en este curso.
          </p>
        ) : (
          <ul className="space-y-4">
            {students.map((student) => (
              <li
                key={student.studentId}
                className="rounded-lg border border-gray-100 px-3 py-3"
              >
                <Link
                  href={`/teacher/classes/${course.id}/students/${student.studentId}?session=${session.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {student.displayName}
                </Link>
                <p className="mt-1 text-sm text-gray-600">
                  {student.opened
                    ? student.attended
                      ? "Abrió la historia. Llegó a tiempo."
                      : "Abrió la historia. Fuera de la ventana de clase."
                    : "Todavía no abre la historia."}
                </p>
                {student.openedAt && (
                  <LocalDateTime iso={student.openedAt} />
                )}
                {student.answers.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-400">
                    Todavía no escribió respuestas.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {student.answers.map((answer) => (
                      <li key={answer.questionId}>
                        <p className="text-xs font-medium text-gray-500">
                          {answer.position}. {answer.question}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-800">
                          {answer.responseText.trim() || "(vacío)"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
