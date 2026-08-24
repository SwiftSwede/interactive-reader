import Link from "next/link";
import { notFound } from "next/navigation";
import { areAnswersUnlocked } from "@/lib/sessions";
import { studentSessionPath } from "@/lib/activities";
import UnlockAnswersButton from "../../UnlockAnswersButton";
import CopySessionLink from "../../CopySessionLink";
import LocalDateTime from "@/components/LocalDateTime";
import StartWritingTimerButton from "./StartWritingTimerButton";
import {
  getOwnedCourse,
  loadCourseSessions,
  loadLookedUpWords,
  loadSessionStudentStatus,
  loadWritingSubmissions,
  sessionTitle,
} from "@/lib/teacher";

export const metadata = {
  title: "Clase - Profe Kyle",
};

function openedLabel(opened: boolean, attended: boolean, isWriting: boolean) {
  const noun = isWriting ? "la escritura" : "la historia";
  if (!opened) return `Todavía no abre ${noun}.`;
  if (attended) return `Abrió ${noun}. Llegó a tiempo.`;
  return `Abrió ${noun}. Fuera de la ventana de clase.`;
}

function submissionStatusLabel(status: string | undefined) {
  if (status === "corrected") return "Corregido";
  if (status === "submitted") return "Entregado";
  if (status === "draft") return "Escribiendo";
  return "Sin texto";
}

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

  const isWriting = session.sessionType === "writing";
  const [students, lookedUpWords, submissions] = await Promise.all([
    loadSessionStudentStatus(
      supabase,
      course.id,
      session.id,
      session.storyId
    ),
    isWriting ? Promise.resolve([]) : loadLookedUpWords(supabase, session.id),
    isWriting ? loadWritingSubmissions(supabase, session.id) : Promise.resolve([]),
  ]);

  const submissionByStudent = new Map(
    submissions.map((row) => [row.userId, row])
  );

  const unlocked = areAnswersUnlocked({
    answersRevealed: session.answersRevealed,
    sessionEndTime: session.end,
  });

  const copyHref = studentSessionPath({
    sessionType: session.sessionType,
    token: session.token,
    storySlug: session.story?.slug,
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
        {sessionTitle(session)}
      </h1>
      <LocalDateTime iso={session.start} />
      {session.notes && (
        <p className="mt-2 text-sm text-gray-600">{session.notes}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <CopySessionLink href={copyHref} />
        {isWriting ? (
          session.timerStartedAt ? (
            <p className="flex items-center text-sm text-gray-500">
              Tiempo iniciado.
            </p>
          ) : (
            <StartWritingTimerButton
              courseId={course.id}
              sessionId={session.id}
            />
          )
        ) : unlocked ? (
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

      {isWriting && session.writingPrompt && (
        <div className="mt-8 rounded-lg border border-gray-100 px-3 py-3">
          <p className="text-xs font-medium text-gray-500">Pregunta</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
            {session.writingPrompt.promptText}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {session.writingPrompt.writingTimeMinutes} minutos
          </p>
        </div>
      )}

      {!isWriting && (
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
      )}

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
            {students.map((student) => {
              const submission = submissionByStudent.get(student.studentId);
              return (
                <li
                  key={student.studentId}
                  className="rounded-lg border border-gray-100 px-3 py-3"
                >
                  <Link
                    href={
                      isWriting && submission
                        ? `/teacher/classes/${course.id}/sessions/${session.id}/submissions/${submission.id}`
                        : `/teacher/classes/${course.id}/students/${student.studentId}?session=${session.id}`
                    }
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {student.displayName}
                  </Link>
                  <p className="mt-1 text-sm text-gray-600">
                    {openedLabel(student.opened, student.attended, isWriting)}
                  </p>
                  {student.openedAt && (
                    <LocalDateTime iso={student.openedAt} />
                  )}
                  {isWriting ? (
                    <div className="mt-2 text-sm text-gray-700">
                      <p>{submissionStatusLabel(submission?.status)}</p>
                      {submission && (
                        <p className="mt-0.5 text-sm text-gray-500">
                          {submission.wordCount} palabras
                          {session.writingPrompt?.level === "pre-intermediate" &&
                          submission.wpm
                            ? ` · ${submission.wpm} ppm`
                            : ""}
                        </p>
                      )}
                    </div>
                  ) : student.answers.length === 0 ? (
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
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
