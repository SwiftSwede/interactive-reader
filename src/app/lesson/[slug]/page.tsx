import { createClient } from "@/lib/supabase/server";
import { getStoryBySlug } from "@/lib/stories";
import {
  resolveSessionAccess,
  isWithinSessionWindow,
} from "@/lib/sessions";
import { loadOwnComprehensionResponses } from "@/lib/comprehension";
import { loadOwnPersonalResponses } from "@/lib/personal-responses";
import { getProfile } from "@/lib/auth-server";
import StoryReader from "@/components/StoryReader";
import StoryAccessMessage from "@/components/StoryAccessMessage";

export default async function LessonSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session } = await searchParams;
  const access = await resolveSessionAccess(slug, session);

  if (access.kind === "invalid") {
    return (
      <StoryAccessMessage
        title="Ese link no sirve"
        body="Pídele el link de clase al Profe Kyle. A veces se copia mal, o ya no es de esta lección."
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

  const supabase = await createClient();
  const data = await getStoryBySlug(supabase, slug);

  if (!data) {
    return (
      <StoryAccessMessage
        title="No encontré esa lección"
        body="Revisa el link o pídeselo otra vez al Profe Kyle."
      />
    );
  }

  if (data.story.kind === "video_summary" && access.kind === "open") {
    return (
      <StoryAccessMessage
        title="Esta lección es para clase"
        body="Pídele el link de Zoom al Profe Kyle. Esta no se abre sola."
      />
    );
  }

  const allowReveal = access.kind === "open" || access.allowReveal;
  const unlockAt =
    access.kind === "ok" && !access.allowReveal
      ? access.session.sessionEndTime
      : undefined;
  const isVideo = data.story.kind === "video_summary";
  const sessionId =
    access.kind === "ok" && (access.saveResponses || isVideo)
      ? access.session.id
      : undefined;
  const savedResponses = !isVideo
    ? await loadOwnComprehensionResponses(
        data.comprehensionQuestions.map((question) => question.id),
        sessionId
      )
    : undefined;
  const savedPersonalResponses = !isVideo
    ? await loadOwnPersonalResponses(
        data.personalQuestions.map((question) => question.id)
      )
    : undefined;

  let readerMode: "classroom-live" | "classroom-review" | "open" = "open";
  if (access.kind === "ok" && (access.saveResponses || isVideo)) {
    readerMode = isWithinSessionWindow(access.session)
      ? "classroom-live"
      : "classroom-review";
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let trackLookups = false;
  let isTeacher = false;
  if (user) {
    const profile = await getProfile(user.id);
    isTeacher = profile?.role === "teacher";
    trackLookups = profile != null && profile.role !== "teacher";
  }

  return (
    <StoryReader
      data={data}
      allowReveal={allowReveal}
      unlockAt={unlockAt}
      sessionId={sessionId}
      savedResponses={savedResponses}
      savedPersonalResponses={savedPersonalResponses}
      trackLookups={trackLookups}
      readerMode={readerMode}
      isTeacher={isTeacher}
      sessionStartTime={
        access.kind === "ok" ? access.session.sessionStartTime : null
      }
      sessionEndTime={
        access.kind === "ok" ? access.session.sessionEndTime : null
      }
      timerStartedAt={
        access.kind === "ok" ? access.session.timerStartedAt : null
      }
      courseId={access.kind === "ok" ? access.session.courseId : null}
      answersRevealed={
        access.kind === "ok" ? access.session.answersRevealed : false
      }
    />
  );
}
