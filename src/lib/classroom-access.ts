import { createAdminClient } from "@/lib/supabase/admin";
import type { CourseSession, Profile, SubscriptionStatus } from "@/types";

export function isActiveClassroomSubscription(
  status: SubscriptionStatus | null | undefined
): boolean {
  return status === "active";
}

export type SubscriptionPeriodWindow = {
  startedAt: string;
  endedAt: string | null;
};

export function periodCoversSessionStart(
  sessionStartTime: string,
  periods: SubscriptionPeriodWindow[]
): boolean {
  const t = new Date(sessionStartTime).getTime();
  return periods.some((row) => {
    const start = new Date(row.startedAt).getTime();
    const end = row.endedAt
      ? new Date(row.endedAt).getTime()
      : Number.POSITIVE_INFINITY;
    return t >= start && t <= end;
  });
}

/** Alumni (cancelled / paused) keep months they already belong to. */
export function alumniMayAccessSession(params: {
  enrolledInCourse: boolean;
  sessionStartTime: string;
  periods: SubscriptionPeriodWindow[];
}): boolean {
  if (params.enrolledInCourse) return true;
  return periodCoversSessionStart(params.sessionStartTime, params.periods);
}

export async function classroomStudentCanAccessSession(
  profile: Profile,
  session: Pick<CourseSession, "sessionStartTime" | "courseId">
): Promise<boolean> {
  if (profile.role !== "student-classroom") return false;
  if (profile.subscriptionStatus === "active") return true;
  if (profile.subscriptionStatus === "none") return false;

  const admin = createAdminClient();
  const [{ data: enrollment, error: enrollError }, { data: periods, error: periodError }] =
    await Promise.all([
      admin
        .from("course_enrollments")
        .select("id")
        .eq("course_id", session.courseId)
        .eq("student_id", profile.id)
        .maybeSingle(),
      admin
        .from("subscription_periods")
        .select("started_at, ended_at")
        .eq("user_id", profile.id),
    ]);

  if (enrollError) {
    console.error("classroomStudentCanAccessSession enroll:", enrollError);
  }
  if (periodError) {
    console.error("classroomStudentCanAccessSession periods:", periodError);
  }

  return alumniMayAccessSession({
    enrolledInCourse: Boolean(enrollment),
    sessionStartTime: session.sessionStartTime,
    periods: (periods ?? []).map((row) => ({
      startedAt: row.started_at,
      endedAt: row.ended_at,
    })),
  });
}
