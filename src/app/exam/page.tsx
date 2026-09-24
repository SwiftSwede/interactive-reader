import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolveExamSessionAccess } from "@/lib/sessions";
import { sessionRecordingUrl } from "@/lib/session-phase";
import { getProfile } from "@/lib/auth-server";
import { documentTitle, examSessionTitle } from "@/lib/page-title";
import { isTeacherView, lessonSessionNext, lessonViewToggle } from "@/lib/student-preview";
import {
  loadCourseLevel,
  readTeacherStudentPreview,
} from "@/lib/student-preview-server";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import ExamSession from "@/components/ExamSession";
import { EXAM_PROMPT_SELECT, mapExamPromptRow, type ExamPromptRow } from "@/lib/exam";
import type {
  ExamTask1Answer,
  ExamTask2CorrectionAnswer,
  ExamTask2LetterAnswer,
  ExamTask3Answer,
} from "@/types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}): Promise<Metadata> {
  const { session } = await searchParams;
  const title = await examSessionTitle(session);
  return { title: documentTitle(title ?? "Examen") };
}

export default async function ExamPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionToken } = await searchParams;
  const access = await resolveExamSessionAccess(sessionToken);

  if (access.kind === "invalid") {
    return (
      <StoryAccessMessage
        title="Ese link no sirve"
        body="Pídele el link de clase al Profe Kyle. A veces se copia mal."
      />
    );
  }
  if (access.kind === "refused") {
    return (
      <StoryAccessMessage
        title="Este link es para el grupo"
        body="Si pagaste el curso, pídele al Profe Kyle que te invite con tu email. Después el mismo link te deja entrar."
      />
    );
  }
  if (access.kind === "expired") {
    return (
      <StoryAccessMessage
        title="Esta clase es nueva"
        body="Tu suscripción ya no está activa, así que las clases nuevas no se abren. Las que tomaste cuando pagabas siguen ahí. Si crees que es un error, escríbeme."
      />
    );
  }
  if (access.kind === "wrong-group") {
    return (
      <StoryAccessMessage
        title="Este link es del otro grupo"
        body="Pídele el link de tu clase al Profe Kyle. Este es del otro horario."
      />
    );
  }
  if (access.kind !== "ok") {
    return (
      <StoryAccessMessage
        title="Ese link no sirve"
        body="Pídele el link de clase al Profe Kyle."
      />
    );
  }

  const promptId = access.session.examPromptId;
  if (!promptId) {
    return (
      <StoryAccessMessage
        title="Esta clase no tiene examen"
        body="Avísale al Profe Kyle. Falta el examen."
      />
    );
  }

  const supabase = await createClient();
  const { data: promptRow } = await supabase
    .from("exam_prompts")
    .select(EXAM_PROMPT_SELECT)
    .eq("id", promptId)
    .maybeSingle();

  if (!promptRow) {
    return (
      <StoryAccessMessage
        title="No encontré el examen"
        body="Avísale al Profe Kyle."
      />
    );
  }

  const prompt = mapExamPromptRow(promptRow as ExamPromptRow);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const previewLevel = await readTeacherStudentPreview(profile?.role);
  const isTeacher = isTeacherView(profile?.role, previewLevel);
  const courseLevel =
    profile?.role === "teacher"
      ? await loadCourseLevel(supabase, access.session.courseId)
      : null;
  const viewToggle = lessonViewToggle({
    role: profile?.role,
    courseLevel,
    nextPath: lessonSessionNext("/exam", sessionToken),
  });

  let attended = false;

  if (user && access.saveResponses) {
    const { data: attendance } = await supabase
      .from("session_attendance")
      .select("attended")
      .eq("course_session_id", access.session.id)
      .eq("student_id", user.id)
      .maybeSingle();
    attended = Boolean(attendance?.attended);
  }

  let task1: ExamTask1Answer[] = [];
  let task2: ExamTask2LetterAnswer[] | ExamTask2CorrectionAnswer[] = [];
  let task3: ExamTask3Answer[] = [];
  let status: "in_progress" | "submitted" | null = null;
  let startedAt: string | null = null;
  let task1SubmittedAt: string | null = null;
  let task2SubmittedAt: string | null = null;
  let task3SubmittedAt: string | null = null;

  if (user && access.saveResponses) {
    const { data: submission } = await supabase
      .from("group_exam_submissions")
      .select(
        "task1_answers, task2_answers, task3_answers, status, started_at, task1_submitted_at, task2_submitted_at, task3_submitted_at"
      )
      .eq("course_session_id", access.session.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (submission) {
      task1 = Array.isArray(submission.task1_answers)
        ? (submission.task1_answers as ExamTask1Answer[])
        : [];
      task2 = Array.isArray(submission.task2_answers)
        ? (submission.task2_answers as typeof task2)
        : [];
      task3 = Array.isArray(submission.task3_answers)
        ? (submission.task3_answers as ExamTask3Answer[])
        : [];
      status = submission.status as "in_progress" | "submitted";
      startedAt = submission.started_at;
      task1SubmittedAt = submission.task1_submitted_at;
      task2SubmittedAt = submission.task2_submitted_at;
      task3SubmittedAt = submission.task3_submitted_at;
    }
  }

  return (
    <ExamSession
      sessionId={access.session.id}
      prompt={prompt}
      isTeacher={isTeacher}
      previewLevel={previewLevel}
      viewToggle={viewToggle}
      attended={attended}
      recordingYoutubeUrl={sessionRecordingUrl(access.session)}
      classEndedAt={access.session.classEndedAt}
      sessionStartTime={access.session.sessionStartTime}
      sessionEndTime={access.session.sessionEndTime}
      timerStartedAt={access.session.timerStartedAt}
      examTimerMode={access.session.examTimerMode}
      examTimerMinutes={access.session.examTimerMinutes}
      examClassAnswers={access.session.examClassAnswers}
      examScorePublishedAt={access.session.examScorePublishedAt}
      lessonStepCurrent={access.session.lessonStepCurrent}
      lessonStepLocked={access.session.lessonStepLocked}
      initialTask1={task1}
      initialTask2={task2}
      initialTask3={task3}
      initialStatus={status}
      startedAt={startedAt}
      task1SubmittedAt={task1SubmittedAt}
      task2SubmittedAt={task2SubmittedAt}
      task3SubmittedAt={task3SubmittedAt}
    />
  );
}
