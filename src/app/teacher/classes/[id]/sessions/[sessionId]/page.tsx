import Link from "next/link";
import { notFound } from "next/navigation";
import { areAnswersUnlocked } from "@/lib/sessions";
import { isLiveOnlySessionType, studentSessionPath } from "@/lib/activities";
import UnlockAnswersButton from "../../UnlockAnswersButton";
import CopySessionLink from "../../CopySessionLink";
import LocalDateTime from "@/components/LocalDateTime";
import SessionRecordingForm from "@/components/teacher/SessionRecordingForm";
import AttendanceToggle from "@/components/teacher/AttendanceToggle";
import { isAutoMarked } from "@/lib/attendance";
import EndClassButton from "@/components/EndClassButton";
import { getSessionPhase } from "@/lib/session-phase";
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
  kind:
    | "story"
    | "writing"
    | "exam"
    | "video_summary"
    | "presentation"
    | "conversation"
) {
  const noun =
    kind === "writing"
      ? "la escritura"
      : kind === "exam"
        ? "el examen"
        : kind === "video_summary"
          ? "la traducción"
          : kind === "presentation"
            ? "la presentación"
            : kind === "conversation"
              ? "la conversación"
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
  const isPresentation = session.sessionType === "presentation";
  const isConversation = session.sessionType === "conversation";
  const isLiveOnly = isLiveOnlySessionType(session.sessionType);
  const [students, lookedUpWords, submissions, examGroups, examSubs, freeWrites] =
    await Promise.all([
      loadSessionStudentStatus(
        supabase,
        course.id,
        session.id,
        session.storyId
      ),
      isWriting || isExam || isVideo || isPresentation || isConversation
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
    sessionStartTime: session.start,
    sessionEndTime: session.end,
    classEndedAt: session.classEndedAt,
  });
  const classLive =
    getSessionPhase({
      sessionStartTime: session.start,
      sessionEndTime: session.end,
      classEndedAt: session.classEndedAt,
    }) === "live";

  const copyHref = studentSessionPath({
    sessionType: session.sessionType,
    token: session.token,
    storySlug: session.story?.slug,
  });

  return (
    <section>
      <p className="text-sm text-text-muted">
        <Link
          href={`/teacher/classes/${course.id}`}
          className="underline-offset-2 hover:text-text-primary hover:underline"
        >
          {course.name}
        </Link>
      </p>
      <h1 className="mt-2 text-headline-lg text-text-primary">
        {sessionTitle(session)}
      </h1>
      <LocalDateTime iso={session.start} />
      {session.notes && (
        <p className="mt-2 text-sm text-text-secondary">{session.notes}</p>
      )}
      {classLive ? (
        <EndClassButton
          sessionId={session.id}
          classEndedAt={session.classEndedAt}
        />
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {copyHref ? <CopySessionLink href={copyHref} /> : <span />}
        {isWriting || isVideo ? (
          session.timerStartedAt ? (
            <p className="flex items-center text-sm text-text-muted">
              Tiempo de escritura iniciado.
            </p>
          ) : Date.now() < new Date(session.start).getTime() ? (
            <p className="flex items-center text-sm text-text-muted">
              La escritura se inicia cuando empiece la clase.
            </p>
          ) : Date.now() > new Date(session.end).getTime() && !classLive ? (
            <p className="flex items-center text-sm text-text-muted">
              La clase ya terminó.
            </p>
          ) : (
            <StartWritingTimerButton
              courseId={course.id}
              sessionId={session.id}
              label={isVideo ? "Iniciar tarea de escribir" : "Iniciar"}
            />
          )
        ) : isExam ? (
          unlocked ? (
            <p className="flex items-center text-sm text-text-muted">
              Revisión abierta.
            </p>
          ) : (
            <StartExamReviewButton
              courseId={course.id}
              sessionId={session.id}
            />
          )
        ) : isConversation || isPresentation ? (
          <span />
        ) : unlocked ? (
          <p className="flex items-center text-sm text-text-muted">
            Respuestas desbloqueadas.
          </p>
        ) : (
          <UnlockAnswersButton
            courseId={course.id}
            sessionId={session.id}
          />
        )}
      </div>

      <div className="mt-6">
        <SessionRecordingForm
          courseId={course.id}
          sessionId={session.id}
          recordingUrl={session.recordingYoutubeUrl}
        />
      </div>

      {isPresentation && copyHref ? (
        <p className="mt-4">
          <Link
            href={copyHref}
            className="inline-flex h-11 items-center rounded-card bg-accent px-4 text-sm font-medium text-white"
          >
            Abrir la presentación
          </Link>
        </p>
      ) : null}

      {isConversation && copyHref ? (
        <p className="mt-4">
          <Link
            href={copyHref}
            className="inline-flex h-11 items-center rounded-card bg-accent px-4 text-sm font-medium text-white"
          >
            Abrir la clase
          </Link>
        </p>
      ) : null}

      {isVideo && (
        <p className="mt-2 text-sm text-text-muted">
          Los estudiantes entran a Traducción cuando termina el tiempo de
          escribir. No hace falta otro botón.
        </p>
      )}

      {isWriting && session.writingPrompt && (
        <div className="mt-8 rounded-card border border-paper-line px-3 py-3">
          <p className="text-xs font-medium text-text-muted">Pregunta</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
            {session.writingPrompt.promptText}
          </p>
          <p className="mt-2 text-xs text-text-muted">
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
          <h2 className="mb-3 text-headline-md text-text-primary">
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

      {!isWriting && !isExam && !isVideo && !isPresentation && !isConversation && (
        <div className="mt-10">
          <h2 className="mb-3 text-headline-md text-text-primary">
            Palabras más consultadas
          </h2>
          {lookedUpWords === null ? (
            <p className="text-sm text-text-muted">
              Todavía no estamos guardando las palabras. Eso llega con el
              siguiente paso.
            </p>
          ) : lookedUpWords.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía nadie ha tocado una palabra.
            </p>
          ) : (
            <ol className="divide-y divide-paper-line rounded-card border border-paper-line">
              {lookedUpWords.map((word) => (
                <li
                  key={word.text}
                  className="flex items-baseline justify-between gap-3 px-3 py-2"
                >
                  <span className="font-medium text-text-primary">{word.text}</span>
                  <span className="text-sm text-text-muted">
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
          <h2 className="mb-3 text-headline-md text-text-primary">
            Resúmenes de estudiantes
          </h2>
          {freeWrites.length === 0 ? (
            <p className="text-sm text-text-muted">
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
                    className="rounded-card border border-paper-line px-3 py-3"
                  >
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {row.wordCount} palabras
                      {row.elapsedSeconds
                        ? ` · ${Math.round(row.elapsedSeconds / 60)} min`
                        : ""}
                      {row.submittedAt ? " · Entregado" : " · Borrador"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">
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
        <h2 className="mb-3 text-headline-md text-text-primary">
          Estudiantes
        </h2>
        {students.length === 0 ? (
          <p className="text-sm text-text-muted">
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
                  className="rounded-card border border-paper-line px-3 py-3"
                >
                  <AttendanceToggle
                    courseId={course.id}
                    sessionId={session.id}
                    studentId={student.studentId}
                    attended={student.attended}
                    autoMarked={
                      !isLiveOnly &&
                      isAutoMarked(
                        student.openedAt,
                        session.start,
                        session.end,
                        session.classEndedAt
                      )
                    }
                    name={student.displayName}
                  />
                  <Link
                    href={
                      isWriting && submission
                        ? `/teacher/classes/${course.id}/sessions/${session.id}/submissions/${submission.id}`
                        : `/teacher/classes/${course.id}/students/${student.studentId}?session=${session.id}`
                    }
                    className="mt-2 inline-block text-label-sm text-text-accent underline-offset-2 hover:underline"
                  >
                    Ver ficha
                  </Link>
                  {!isLiveOnly ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      {openedLabel(
                        student.opened,
                        student.attended,
                        isExam
                          ? "exam"
                          : isWriting
                            ? "writing"
                            : isVideo
                              ? "video_summary"
                              : isPresentation
                                ? "presentation"
                                : isConversation
                                  ? "conversation"
                                  : "story"
                      )}
                    </p>
                  ) : null}
                  {student.openedAt && (
                    <LocalDateTime iso={student.openedAt} />
                  )}
                  {isExam && (
                    <p className="mt-2 text-sm text-text-secondary">
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
                    <div className="mt-2 text-sm text-text-secondary">
                      <p>{submissionStatusLabel(submission?.status)}</p>
                      {submission && (
                        <p className="mt-0.5 text-sm text-text-muted">
                          {submission.wordCount} palabras
                          {session.writingPrompt?.level === "pre-intermediate" &&
                          submission.wpm
                            ? ` · ${submission.wpm} ppm`
                            : ""}
                        </p>
                      )}
                    </div>
                  ) : isExam || isPresentation ? null : student.answers.length === 0 ? (
                    <p className="mt-2 text-sm text-text-muted">
                      Todavía no escribió respuestas.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {student.answers.map((answer) => (
                        <li key={answer.questionId}>
                          <p className="text-xs font-medium text-text-muted">
                            {answer.position}. {answer.question}
                          </p>
                          <p className="mt-0.5 text-sm text-text-primary">
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
