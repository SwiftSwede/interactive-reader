import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolveConversationSessionAccess } from "@/lib/sessions";
import { getProfile } from "@/lib/auth-server";
import { documentTitle, conversationSessionTitle } from "@/lib/page-title";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import ConversationStudent from "@/components/ConversationStudent";
import {
  mapConversationPromptRow,
  type ConversationPromptRow,
} from "@/lib/conversation";
import type { CourseLevel } from "@/types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}): Promise<Metadata> {
  const { session } = await searchParams;
  const title = await conversationSessionTitle(session);
  return { title: documentTitle(title ?? "Conversación") };
}

export default async function ConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionToken } = await searchParams;
  const access = await resolveConversationSessionAccess(sessionToken);

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

  const promptId = access.session.conversationPromptId;
  if (!promptId) {
    return (
      <StoryAccessMessage
        title="Esta clase no tiene conversación"
        body="Avísale al Profe Kyle. Faltan las preguntas."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const isTeacher = profile?.role === "teacher";

  const [promptResult, courseResult] = await Promise.all([
    supabase
      .from("conversation_prompts")
      .select("id, title, level, theme, questions, created_by, created_at")
      .eq("id", promptId)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("level")
      .eq("id", access.session.courseId)
      .maybeSingle(),
  ]);

  if (!promptResult.data) {
    return (
      <StoryAccessMessage
        title="No encontré la conversación"
        body="Avísale al Profe Kyle."
      />
    );
  }

  const prompt = mapConversationPromptRow(
    promptResult.data as ConversationPromptRow
  );
  if (prompt.questions.length === 0) {
    return (
      <StoryAccessMessage
        title="Esta conversación está vacía"
        body="Avísale al Profe Kyle. Faltan las preguntas."
      />
    );
  }

  const courseLevel: CourseLevel =
    courseResult.data?.level === "pre-intermediate"
      ? "pre-intermediate"
      : "intermediate";

  return (
    <ConversationStudent
      prompt={prompt}
      courseLevel={courseLevel}
      courseId={access.session.courseId}
      sessionId={access.session.id}
      isTeacher={isTeacher}
      sessionStartTime={access.session.sessionStartTime}
      sessionEndTime={access.session.sessionEndTime}
      classEndedAt={access.session.classEndedAt}
      conversationPlan={access.session.conversationPlan}
      roundCurrent={access.session.roundCurrent}
      roundState={access.session.roundState}
      roundStartedAt={access.session.roundStartedAt}
    />
  );
}
