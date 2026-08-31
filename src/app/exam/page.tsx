import { createClient } from "@/lib/supabase/server";
import { resolveExamSessionAccess } from "@/lib/sessions";
import { getProfile } from "@/lib/auth-server";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import ExamSession from "@/components/ExamSession";
import { mapExamPromptRow, type ExamPromptRow } from "@/lib/exam";
import type {
  ExamTask1Answer,
  ExamTask2CorrectionAnswer,
  ExamTask2LetterAnswer,
  ExamTask3Answer,
} from "@/types";

export const metadata = {
  title: "Examen - Profe Kyle",
};

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
    .select(
      "id, title, level, theme, vocabulary_list, fill_in_translation, task2_type, paragraph_restructuring, sentence_correction, translation_sentences, time_limit_minutes, created_by, created_at"
    )
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
  const isTeacher = profile?.role === "teacher";

  let group: {
    id: string;
    group_label: string;
    writer_id: string;
    member_ids: string[];
  } | null = null;

  if (user && !isTeacher) {
    const { data: groups } = await supabase
      .from("exam_groups")
      .select("id, group_label, writer_id, member_ids")
      .eq("course_session_id", access.session.id);
    group =
      (
        (groups ?? []) as {
          id: string;
          group_label: string;
          writer_id: string;
          member_ids: string[];
        }[]
      ).find((row) => row.member_ids.includes(user.id)) ?? null;
  }

  let task1: ExamTask1Answer[] = [];
  let task2: ExamTask2LetterAnswer[] | ExamTask2CorrectionAnswer[] = [];
  let task3: ExamTask3Answer[] = [];
  let status: "in_progress" | "submitted" | null = null;
  let startedAt: string | null = null;
  let reviewRevealedAt: string | null = null;

  if (group) {
    const { data: submission } = await supabase
      .from("group_exam_submissions")
      .select(
        "task1_answers, task2_answers, task3_answers, status, started_at, review_revealed_at"
      )
      .eq("exam_group_id", group.id)
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
      reviewRevealedAt = submission.review_revealed_at;
    }
  }

  return (
    <ExamSession
      sessionId={access.session.id}
      prompt={prompt}
      group={
        group
          ? { id: group.id, label: group.group_label }
          : null
      }
      isWriter={Boolean(user && group && group.writer_id === user.id)}
      isTeacher={isTeacher}
      allowReveal={access.allowReveal}
      initialTask1={task1}
      initialTask2={task2}
      initialTask3={task3}
      initialStatus={status}
      startedAt={startedAt}
      reviewRevealedAt={reviewRevealedAt}
    />
  );
}
