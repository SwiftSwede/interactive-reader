import Link from "next/link";
import { notFound } from "next/navigation";
import { areAnswersUnlocked } from "@/lib/sessions";
import { studentSessionPath } from "@/lib/activities";
import UnlockAnswersButton from "../../UnlockAnswersButton";
import CopySessionLink from "../../CopySessionLink";
import LocalDateTime from "@/components/LocalDateTime";
import StartWritingTimerButton from "./StartWritingTimerButton";
import StartExamReviewButton from "./StartExamReviewButton";
import ExamGroupForm from "./ExamGroupForm";
import ExamReview from "./ExamReview";
import { mapExamPromptRow, type ExamPromptRow } from "@/lib/exam";
import {
  getOwnedCourse,
  loadCourseSessions,
  loadExamGroups,
  loadExamSubmissions,
  loadLookedUpWords,
  loadSessionStudentStatus,
  loadVideoSummaryFreeWrites,
  loadWritingSubmissions,
  sessionTitle,
} from "@/lib/teacher";

export const metadata = {
  title: "Clase - Profe Kyle",
};

function openedLabel(
  opened: boolean,
  attended: boolean,
  kind: "story" | "writing" | "exam" | "video_summary"
) {
  const noun =
    kind === "writing"
      ? "la escritura"
      : kind === "exam"
        ? "el examen"
        : kind === "video_summary"
          ? "el video"
          : "la historia";
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
  const isExam = session.sessionType === "exam";
  const isVideo = session.sessionType === "video_summary";
  const [students, lookedUpWords, submissions, examGroups, examSubs, freeWrites] =
    await Promise.all([
      loadSessionStudentStatus(
        supabase,
        course.id,
        session.id,
        session.storyId
      ),
      isWriting || isExam || isVideo
        ? Promise.resolve([])
        : loadLookedUpWords(supabase, session.id),
      isWriting
        ? loadWritingSubmissions(supabase, session.id)
        : Promise.resolve([]),
      isExam ? loadExamGroups(supabase, session.id) : Promise.resolve([]),
      isExam ? loadExamSubmissions(supabase, session.id) : Promise.resolve([]),
      isVideo
        ? loadVideoSummaryFreeWrites(supabase, session.id)
        : Promise.resolve([]),
    ]);

  const submissionByStudent = new Map(
    submissions.map((row) => [row.userId, row])
  );
  const examSubByGroup = new Map(
    examSubs.map((row) => [row.examGroupId, row])
  );

  let examPrompt = null;
  if (isExam && session.examPromptId) {
    const { data } = await supabase
      .from("exam_prompts")
      .select(
        "id, title, level, theme, vocabulary_list, fill_in_translation, task2_type, paragraph_restructuring, sentence_correction, translation_sentences, time_limit_minutes, created_by, created_at"
      )
      .eq("id", session.examPromptId)
      .maybeSingle();
    if (data) examPrompt = mapExamPromptRow(data as ExamPromptRow);
  }

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
        {isWriting || isVideo ? (
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
        ) : isExam ? (
          unlocked ? (
            <p className="flex items-center text-sm text-gray-500">
              Revisión abierta.
            </p>
          ) : (
            <StartExamReviewButton
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

      {isVideo && (
        <div className="mt-2">
          {unlocked ? (
            <p className="text-sm text-gray-500">Traducción abierta.</p>
          ) : (
            <UnlockAnswersButton
              courseId={course.id}
              sessionId={session.id}
              label="Continuar"
              pendingLabel="Abriendo..."
            />
          )}
        </div>
      )}

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

      {isExam && (
        <div className="mt-8">
          <ExamGroupForm
            courseId={course.id}
            sessionId={session.id}
            students={students.map((student) => ({
              studentId: student.studentId,
              displayName: student.displayName,
            }))}
            groups={examGroups}
          />
        </div>
      )}

      {isExam && unlocked && examPrompt && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Revisión
          </h2>
          <ExamReview
            prompt={examPrompt}
            groups={examGroups.map((group) => {
              const sub = examSubByGroup.get(group.id);
              return {
                id: group.id,
                label: group.groupLabel,
                task1: Array.isArray(sub?.task1Answers)
                  ? (sub.task1Answers as Array<{
                      slotIndex: number;
                      answer: string;
                    }>)
                  : [],
                task2: Array.isArray(sub?.task2Answers)
                  ? (sub.task2Answers as never[])
                  : [],
                task3: Array.isArray(sub?.task3Answers)
                  ? (sub.task3Answers as Array<{
                      sentenceNumber: number;
                      englishTranslation: string;
                    }>)
                  : [],
              };
            })}
          />
        </div>
      )}

      {!isWriting && !isExam && !isVideo && (
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

      {isVideo && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Resúmenes de estudiantes
          </h2>
          {freeWrites.length === 0 ? (
            <p className="text-sm text-gray-500">
              Todavía nadie ha entregado su resumen.
            </p>
          ) : (
            <ul className="space-y-3">
              {freeWrites.map((row) => {
                const name =
                  students.find((student) => student.studentId === row.userId)
                    ?.displayName ?? "Sin nombre";
                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-gray-100 px-3 py-3"
                  >
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.wordCount} palabras
                      {row.elapsedSeconds
                        ? ` · ${Math.round(row.elapsedSeconds / 60)} min`
                        : ""}
                      {row.submittedAt ? " · Entregado" : " · Borrador"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                      {row.submissionText || "(vacío)"}
                    </p>
                  </li>
                );
              })}
            </ul>
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
              const examGroup = examGroups.find((group) =>
                group.memberIds.includes(student.studentId)
              );
              const examSub = examGroup
                ? examSubByGroup.get(examGroup.id)
                : undefined;
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
                    {openedLabel(
                      student.opened,
                      student.attended,
                      isExam
                        ? "exam"
                        : isWriting
                          ? "writing"
                          : isVideo
                            ? "video_summary"
                            : "story"
                    )}
                  </p>
                  {student.openedAt && (
                    <LocalDateTime iso={student.openedAt} />
                  )}
                  {isExam && (
                    <p className="mt-2 text-sm text-gray-700">
                      {examGroup
                        ? `${examGroup.groupLabel}${
                            examGroup.writerId === student.studentId
                              ? " · escribe"
                              : ""
                          }${
                            examSub?.status === "submitted"
                              ? " · entregado"
                              : examSub
                                ? " · en progreso"
                                : ""
                          }`
                        : "Sin grupo"}
                    </p>
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
                  ) : isExam ? null : student.answers.length === 0 ? (
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
