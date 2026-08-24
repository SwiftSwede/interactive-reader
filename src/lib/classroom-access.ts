import { createAdminClient } from "@/lib/supabase/admin";
import type { CourseSession, Profile } from "@/types";

export async function classroomStudentCanAccessSession(
  profile: Profile,
  session: Pick<CourseSession, "sessionStartTime">
): Promise<boolean> {
  if (profile.role !== "student-classroom") return false;
  if (profile.subscriptionStatus === "active") return true;
  if (profile.subscriptionStatus === "none") return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_periods")
    .select("started_at, ended_at")
    .eq("user_id", profile.id);

  if (error || !data?.length) return false;

  const t = new Date(session.sessionStartTime).getTime();
  return data.some((row) => {
    const start = new Date(row.started_at).getTime();
    const end = row.ended_at
      ? new Date(row.ended_at).getTime()
      : Number.POSITIVE_INFINITY;
    return t >= start && t <= end;
  });
}
