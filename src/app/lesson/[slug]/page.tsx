import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getStoryBySlug } from "@/lib/stories";
import {
  resolveSessionAccess,
  isWithinSessionWindow,
} from "@/lib/sessions";
import { sessionRecordingUrl } from "@/lib/session-phase";
import { loadOwnComprehensionResponses } from "@/lib/comprehension";
import { loadOwnPersonalResponses } from "@/lib/personal-responses";
import { getProfile } from "@/lib/auth-server";
import { documentTitle, storyTitleBySlug } from "@/lib/page-title";
import StoryReader from "@/components/StoryReader";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import {
  loadOwnWordFlagRequests,
  loadSessionWordFlagRequests,
  loadWordFlags,
} from "@/lib/word-flags";
import { loadOwnSongLyricAttempts } from "@/lib/services/songAttempts";
import type { WordFlagging } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = await storyTitleBySlug(slug);
  return { title: documentTitle(title ?? "Lección") };
}

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
  const kind = data.story.kind ?? "story";
  const isVideo = kind === "video_summary";
  const isSong = kind === "song";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const isTeacher = profile?.role === "teacher";
  const trackLookups = profile != null && profile.role !== "teacher";

  const sessionId =
    access.kind === "ok" && (access.saveResponses || isVideo || isSong)
      ? access.session.id
      : undefined;
  const flagSessionId = access.kind === "ok" ? access.session.id : null;

  let readerMode: "classroom-live" | "classroom-review" | "open" = "open";
  if (access.kind === "ok" && (access.saveResponses || isVideo || isSong)) {
    readerMode = isWithinSessionWindow(access.session)
      ? "classroom-live"
      : "classroom-review";
  }

  const skipFlags = isVideo;
  const [
    savedResponses,
    savedPersonalResponses,
    flags,
    teacherRequests,
    ownRequests,
    savedAttempts,
  ] = await Promise.all([
    !isVideo
      ? loadOwnComprehensionResponses(
          data.comprehensionQuestions.map((question) => question.id),
          sessionId
        )
      : Promise.resolve(undefined),
    !isVideo
      ? loadOwnPersonalResponses(
          data.personalQuestions.map((question) => question.id)
        )
      : Promise.resolve(undefined),
    !skipFlags && isTeacher
      ? loadWordFlags(supabase, data.story.id)
      : Promise.resolve([]),
    !skipFlags && isTeacher && flagSessionId
      ? loadSessionWordFlagRequests(supabase, flagSessionId)
      : Promise.resolve([]),
    !skipFlags &&
      kind !== "song" &&
      !isTeacher &&
      user &&
      flagSessionId &&
      readerMode === "classroom-live"
      ? loadOwnWordFlagRequests(supabase, flagSessionId, user.id)
      : Promise.resolve([]),
    isSong &&
      readerMode === "classroom-live" &&
      user &&
      sessionId &&
      !isTeacher
      ? loadOwnSongLyricAttempts(supabase, sessionId, user.id)
      : Promise.resolve([]),
  ]);

  const flagging: WordFlagging | undefined = skipFlags
    ? undefined
    : {
        enabled: isTeacher && kind !== "song",
        flags,
        requests: isTeacher ? teacherRequests : ownRequests,
        isTeacher,
        sessionId: flagSessionId,
        storyId: data.story.id,
        readerMode,
      };

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
      flagging={flagging}
      sessionStartTime={
        access.kind === "ok" ? access.session.sessionStartTime : null
      }
      sessionEndTime={
        access.kind === "ok" ? access.session.sessionEndTime : null
      }
      timerStartedAt={
        access.kind === "ok" ? access.session.timerStartedAt : null
      }
      classEndedAt={
        access.kind === "ok" ? access.session.classEndedAt : null
      }
      courseId={access.kind === "ok" ? access.session.courseId : null}
      answersRevealed={
        access.kind === "ok" ? access.session.answersRevealed : false
      }
      recordingYoutubeUrl={
        access.kind === "ok" ? sessionRecordingUrl(access.session) : null
      }
      savedAttempts={savedAttempts}
      lessonStepCurrent={
        access.kind === "ok" ? access.session.lessonStepCurrent : null
      }
      lessonStepLocked={
        access.kind === "ok" ? access.session.lessonStepLocked : false
      }
      songClassAnswers={
        access.kind === "ok" ? access.session.songClassAnswers : {}
      }
    />
  );
}
