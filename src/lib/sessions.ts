import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { promoteTeacherIfNeeded, getProfile } from "@/lib/auth-server";
import { safeNextPath } from "@/lib/auth";
import type { CourseSession } from "@/types";

type SessionRow = {
  id: string;
  course_id: string;
  story_id: string;
  session_date: string;
  session_start_time: string;
  session_end_time: string;
  answers_revealed: boolean;
  notes: string | null;
  session_link_token: string;
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
  | { kind: "refused" };

function mapSession(row: SessionRow): CourseSession {
  return {
    id: row.id,
    courseId: row.course_id,
    storyId: row.story_id,
    sessionDate: row.session_date,
    sessionStartTime: row.session_start_time,
    sessionEndTime: row.session_end_time,
    answersRevealed: row.answers_revealed,
    notes: row.notes,
    sessionLinkToken: row.session_link_token,
    createdAt: row.created_at,
  };
}

export function isWithinSessionWindow(
  session: CourseSession,
  now = new Date()
): boolean {
  const t = now.getTime();
  return (
    t >= new Date(session.sessionStartTime).getTime() &&
    t <= new Date(session.sessionEndTime).getTime()
  );
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
      await supabase
        .from("session_attendance")
        .update({ attended: true })
        .eq("course_session_id", session.id)
        .eq("student_id", studentId)
        .eq("attended", false);
    }

    return;
  }

  if (inWindow && !existing.attended) {
    const { error } = await supabase
      .from("session_attendance")
      .update({ attended: true })
      .eq("id", existing.id);

    if (error) {
      console.error("recordSessionAttendance update failed:", error);
    }
  }
}

function sessionStoryPath(slug: string, token: string): string {
  return `/story/${slug}?session=${token}`;
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
): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("course_enrollments").insert({
    course_id: courseId,
    student_id: studentId,
    display_name: displayName,
  });

  if (error && error.code !== "23505") {
    console.error("enrollClassroomStudent failed:", error);
  }
}

export async function resolveSessionAccess(
  slug: string,
  sessionToken: string | undefined
): Promise<SessionAccess> {
  if (!sessionToken) return { kind: "open" };

  const token = sessionToken.trim();
  const next = safeNextPath(sessionStoryPath(slug, token));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  await promoteTeacherIfNeeded(user.id, user.email);
  const session = await getSessionByToken(token);
  if (!session) return { kind: "invalid" };

  const storySlug = await getStorySlug(session.storyId);
  if (!storySlug) return { kind: "invalid" };

  if (storySlug !== slug) {
    redirect(sessionStoryPath(storySlug, token));
  }

  const profile = await getProfile(user.id);
  if (profile?.role === "teacher") {
    await persistAnswersRevealedIfEnded(session);
    return { kind: "ok", session, allowReveal: true, saveResponses: false };
  }

  if (profile?.role === "student-classroom") {
    const displayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name.trim()
        : "";
    await enrollClassroomStudent(session.courseId, user.id, displayName);
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
