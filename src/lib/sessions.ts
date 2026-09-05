import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { promoteTeacherIfNeeded, getProfile } from "@/lib/auth-server";
import { safeNextPath } from "@/lib/auth";
import {
  isSessionType,
  studentSessionPath,
  type SessionType,
} from "@/lib/activities";
import { classroomStudentCanAccessSession } from "@/lib/classroom-access";
import { seedClassroomLevelIfEmpty } from "@/lib/classroom-placement";
import type { CourseLevel, CourseSession } from "@/types";
import {
  getSessionPhase,
  isWithinSessionWindow,
  type SessionPhase,
} from "@/lib/session-phase";

export { getSessionPhase, isWithinSessionWindow, type SessionPhase };

function revalidateTeacherViews() {
  after(() => {
    revalidatePath("/teacher", "layout");
  });
}

type SessionRow = {
  id: string;
  course_id: string;
  session_type?: string | null;
  story_id: string | null;
  writing_prompt_id?: string | null;
  exam_prompt_id?: string | null;
  session_date: string;
  session_start_time: string;
  session_end_time: string;
  answers_revealed: boolean;
  notes: string | null;
  session_link_token: string;
  timer_started_at?: string | null;
  video_playing?: boolean | null;
  video_seconds?: number | null;
  video_rate?: number | null;
  created_at: string;
};

export type SessionAccess =
  | { kind: "open" }
  | {
      kind: "ok";
      session: CourseSession;
      allowReveal: boolean;
      saveResponses: boolean;
    }
  | { kind: "invalid" }
  | { kind: "refused" }
  | { kind: "expired" }
  | { kind: "wrong-group" };

export function mapSession(row: SessionRow): CourseSession {
  const sessionType: SessionType = isSessionType(row.session_type)
    ? row.session_type
    : row.writing_prompt_id
      ? "writing"
      : row.exam_prompt_id
        ? "exam"
        : "story";

  return {
    id: row.id,
    courseId: row.course_id,
    sessionType,
    storyId: row.story_id,
    writingPromptId: row.writing_prompt_id ?? null,
    examPromptId: row.exam_prompt_id ?? null,
    sessionDate: row.session_date,
    sessionStartTime: row.session_start_time,
    sessionEndTime: row.session_end_time,
    answersRevealed: row.answers_revealed,
    notes: row.notes,
    sessionLinkToken: row.session_link_token,
    timerStartedAt: row.timer_started_at ?? null,
    videoPlaying: row.video_playing ?? false,
    videoSeconds: row.video_seconds ?? 0,
    videoRate: row.video_rate ?? 1,
    createdAt: row.created_at,
  };
}

export function areAnswersUnlocked(
  session: Pick<CourseSession, "answersRevealed" | "sessionEndTime">,
  now = new Date()
): boolean {
  return (
    session.answersRevealed ||
    now.getTime() >= new Date(session.sessionEndTime).getTime()
  );
}

async function persistAnswersRevealedIfEnded(
  session: CourseSession
): Promise<void> {
  if (session.sessionType !== "story" && session.sessionType !== "video_summary")
    return;
  if (session.answersRevealed) return;
  if (!areAnswersUnlocked(session)) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("course_sessions")
    .update({ answers_revealed: true })
    .eq("id", session.id)
    .eq("answers_revealed", false);

  if (error) {
    console.error("persistAnswersRevealedIfEnded failed:", error);
  }
}

async function recordSessionAttendance(
  session: CourseSession,
  studentId: string
): Promise<void> {
  const supabase = await createClient();
  const inWindow = isWithinSessionWindow(session);

  const { data: existing } = await supabase
    .from("session_attendance")
    .select("id, attended")
    .eq("course_session_id", session.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("session_attendance").insert({
      course_session_id: session.id,
      student_id: studentId,
      attended: inWindow,
    });

    if (error && error.code !== "23505") {
      console.error("recordSessionAttendance insert failed:", error);
      return;
    }

    if (error?.code === "23505" && inWindow) {
      const { error: updateError } = await supabase
        .from("session_attendance")
        .update({ attended: true })
        .eq("course_session_id", session.id)
        .eq("student_id", studentId)
        .eq("attended", false);
      if (updateError) {
        console.error("recordSessionAttendance update failed:", updateError);
        return;
      }
    }

    revalidateTeacherViews();
    return;
  }

  if (inWindow && !existing.attended) {
    const { error } = await supabase
      .from("session_attendance")
      .update({ attended: true })
      .eq("id", existing.id);

    if (error) {
      console.error("recordSessionAttendance update failed:", error);
      return;
    }
    revalidateTeacherViews();
  }
}

async function getSessionByToken(token: string): Promise<CourseSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_session_by_token", {
    p_token: token,
  });

  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as SessionRow | undefined;
  if (!row) return null;
  return mapSession(row);
}

async function getStorySlug(storyId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("stories")
    .select("slug")
    .eq("id", storyId)
    .maybeSingle();
  return data?.slug ?? null;
}

async function enrollClassroomStudent(
  courseId: string,
  studentId: string,
  displayName: string
): Promise<"ok" | "wrong-group"> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("course_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) return "ok";

  // Students can only SELECT courses they are already enrolled in. A first
  // class-link open has no enrollment yet, so this lookup must bypass RLS.
  const { data: course } = await admin
    .from("courses")
    .select("level")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) return "wrong-group";

  const courseLevel = course.level as CourseLevel;
  const { data: profile } = await admin
    .from("profiles")
    .select("classroom_level")
    .eq("id", studentId)
    .maybeSingle();

  const home = profile?.classroom_level;
  if (
    (home === "pre-intermediate" || home === "intermediate") &&
    home !== courseLevel
  ) {
    return "wrong-group";
  }

  if (!home) {
    await seedClassroomLevelIfEmpty(studentId, courseLevel);
  }

  const { error } = await admin.from("course_enrollments").insert({
    course_id: courseId,
    student_id: studentId,
    display_name: displayName,
  });

  if (error && error.code !== "23505") {
    console.error("enrollClassroomStudent failed:", error);
  }
  return "ok";
}

export async function loadSessionAccess(
  sessionToken: string | undefined,
  loginNext?: string
): Promise<SessionAccess> {
  if (!sessionToken) return { kind: "open" };

  const token = sessionToken.trim();
  if (!token) return { kind: "open" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = safeNextPath(loginNext ?? `/writing?session=${token}`);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  await promoteTeacherIfNeeded(user.id, user.email);
  const session = await getSessionByToken(token);
  if (!session) return { kind: "invalid" };

  const profile = await getProfile(user.id);
  if (profile?.role === "teacher") {
    await persistAnswersRevealedIfEnded(session);
    return { kind: "ok", session, allowReveal: true, saveResponses: false };
  }

  if (profile?.role === "student-classroom") {
    const allowed = await classroomStudentCanAccessSession(profile, session);
    if (!allowed) return { kind: "expired" };

    const displayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name.trim()
        : "";
    const enrolled = await enrollClassroomStudent(
      session.courseId,
      user.id,
      displayName
    );
    if (enrolled === "wrong-group") return { kind: "wrong-group" };
    await recordSessionAttendance(session, user.id);
    await persistAnswersRevealedIfEnded(session);
    return {
      kind: "ok",
      session,
      allowReveal: areAnswersUnlocked(session),
      saveResponses: true,
    };
  }

  return { kind: "refused" };
}

export async function resolveSessionAccess(
  slug: string,
  sessionToken: string | undefined
): Promise<SessionAccess> {
  const loginNext = sessionToken
    ? studentSessionPath({
        sessionType: "story",
        token: sessionToken,
        storySlug: slug,
      })
    : undefined;
  const access = await loadSessionAccess(sessionToken, loginNext);
  if (access.kind !== "ok") return access;

  if (access.session.sessionType === "writing") {
    redirect(
      studentSessionPath({
        sessionType: "writing",
        token: access.session.sessionLinkToken,
      })
    );
  }

  if (access.session.sessionType === "exam") {
    redirect(
      studentSessionPath({
        sessionType: "exam",
        token: access.session.sessionLinkToken,
      })
    );
  }

  if (!access.session.storyId) return { kind: "invalid" };

  const storySlug = await getStorySlug(access.session.storyId);
  if (!storySlug) return { kind: "invalid" };

  if (storySlug !== slug) {
    redirect(
      studentSessionPath({
        sessionType: access.session.sessionType,
        token: access.session.sessionLinkToken,
        storySlug,
      })
    );
  }

  return access;
}

export async function resolveWritingSessionAccess(
  sessionToken: string | undefined
): Promise<SessionAccess> {
  if (!sessionToken?.trim()) return { kind: "invalid" };

  const loginNext = `/writing?session=${sessionToken.trim()}`;
  const access = await loadSessionAccess(sessionToken, loginNext);
  if (access.kind !== "ok") return access;

  if (
    access.session.sessionType === "story" ||
    access.session.sessionType === "video_summary"
  ) {
    const storySlug = access.session.storyId
      ? await getStorySlug(access.session.storyId)
      : null;
    if (!storySlug) return { kind: "invalid" };
    redirect(
      studentSessionPath({
        sessionType: access.session.sessionType,
        token: access.session.sessionLinkToken,
        storySlug,
      })
    );
  }

  if (access.session.sessionType === "exam") {
    redirect(
      studentSessionPath({
        sessionType: "exam",
        token: access.session.sessionLinkToken,
      })
    );
  }

  return access;
}

export async function resolveExamSessionAccess(
  sessionToken: string | undefined
): Promise<SessionAccess> {
  if (!sessionToken?.trim()) return { kind: "invalid" };

  const loginNext = `/exam?session=${sessionToken.trim()}`;
  const access = await loadSessionAccess(sessionToken, loginNext);
  if (access.kind !== "ok") return access;

  if (access.session.sessionType === "writing") {
    redirect(
      studentSessionPath({
        sessionType: "writing",
        token: access.session.sessionLinkToken,
      })
    );
  }

  if (
    access.session.sessionType === "story" ||
    access.session.sessionType === "video_summary"
  ) {
    const storySlug = access.session.storyId
      ? await getStorySlug(access.session.storyId)
      : null;
    if (!storySlug) return { kind: "invalid" };
    redirect(
      studentSessionPath({
        sessionType: access.session.sessionType,
        token: access.session.sessionLinkToken,
        storySlug,
      })
    );
  }

  return access;
}
