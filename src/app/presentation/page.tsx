import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolvePresentationSessionAccess } from "@/lib/sessions";
import { getProfile } from "@/lib/auth-server";
import { documentTitle, presentationSessionTitle } from "@/lib/page-title";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import PresentationPlayer from "@/components/PresentationPlayer";
import {
  classAnswerFromResponse,
  mapPresentationPromptRow,
  mapPresentationResponseRow,
  type PresentationPromptRow,
  type PresentationResponseRow,
} from "@/lib/presentation";
import type { PresentationVocabNote } from "@/types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}): Promise<Metadata> {
  const { session } = await searchParams;
  const title = await presentationSessionTitle(session);
  return { title: documentTitle(title ?? "Presentación") };
}

export default async function PresentationPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionToken } = await searchParams;
  const access = await resolvePresentationSessionAccess(sessionToken);

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

  const promptId = access.session.presentationPromptId;
  if (!promptId) {
    return (
      <StoryAccessMessage
        title="Esta clase no tiene presentación"
        body="Avísale al Profe Kyle. Falta la presentación."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const isTeacher = profile?.role === "teacher";
  const responseSelect =
    "id, presentation_prompt_id, user_id, course_session_id, segment_id, question_id, response_text, revealed_answer, revealed_at, submitted_at";

  const [promptResult, noteResult, courseResult] = await Promise.all([
    supabase
      .from("presentation_prompts")
      .select(
        "id, title, level, theme, warmup_question, segments, created_at"
      )
      .eq("id", promptId)
      .maybeSingle(),
    supabase
      .from("presentation_vocab_notes")
      .select(
        "id, course_session_id, segment_id, vocab_english, note_text, created_by, created_at"
      )
      .eq("course_session_id", access.session.id),
    supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", access.session.courseId)
      .maybeSingle(),
  ]);

  const teacherUserId =
    typeof courseResult.data?.teacher_id === "string"
      ? courseResult.data.teacher_id
      : null;

  const [responseResult, classResult] = await Promise.all([
    user && !isTeacher
      ? supabase
          .from("presentation_responses")
          .select(responseSelect)
          .eq("course_session_id", access.session.id)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    teacherUserId
      ? supabase
          .from("presentation_responses")
          .select(responseSelect)
          .eq("course_session_id", access.session.id)
          .eq("user_id", teacherUserId)
      : Promise.resolve({ data: [] }),
  ]);

  if (!promptResult.data) {
    return (
      <StoryAccessMessage
        title="No encontré la presentación"
        body="Avísale al Profe Kyle."
      />
    );
  }

  const prompt = mapPresentationPromptRow(
    promptResult.data as PresentationPromptRow
  );
  if (prompt.segments.length === 0) {
    return (
      <StoryAccessMessage
        title="Esta presentación está vacía"
        body="Avísale al Profe Kyle. Faltan los videos."
      />
    );
  }

  const savedResponses = ((responseResult.data ?? []) as PresentationResponseRow[]).map(
    mapPresentationResponseRow
  );

  const classAnswers = ((classResult.data ?? []) as PresentationResponseRow[]).map(
    (row) => classAnswerFromResponse(mapPresentationResponseRow(row))
  );

  const vocabNotes: PresentationVocabNote[] = (
    (noteResult.data ?? []) as {
      id: string;
      course_session_id: string;
      segment_id: number;
      vocab_english: string;
      note_text: string;
      created_by: string;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.id,
    courseSessionId: row.course_session_id,
    segmentId: row.segment_id,
    vocabEnglish: row.vocab_english,
    noteText: row.note_text,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));

  return (
    <PresentationPlayer
      prompt={prompt}
      sessionId={access.session.id}
      isTeacher={isTeacher}
      sessionStartTime={access.session.sessionStartTime}
      sessionEndTime={access.session.sessionEndTime}
      classEndedAt={access.session.classEndedAt}
      allowReveal={access.allowReveal}
      saveResponses={access.saveResponses}
      initialStep={access.session.presentationStep}
      savedResponses={savedResponses}
      classAnswers={classAnswers}
      teacherUserId={teacherUserId}
      vocabNotes={vocabNotes}
    />
  );
}
