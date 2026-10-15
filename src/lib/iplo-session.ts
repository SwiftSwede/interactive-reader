import { createAdminClient } from "@/lib/supabase/admin";

export type IploSessionState = {
  completedOnce: boolean;
  closingLine: boolean;
  dayMarks: string[];
};

export async function loadIploSessionState(
  storyId: string,
  userId: string | null
): Promise<IploSessionState> {
  if (!userId) {
    return { completedOnce: false, closingLine: false, dayMarks: [] };
  }
  const admin = createAdminClient();
  const [progress, events, lesson] = await Promise.all([
    admin
      .from("user_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("story_id", storyId)
      .maybeSingle(),
    admin
      .from("learning_events")
      .select("occurred_at, detail")
      .eq("user_id", userId)
      .eq("event_type", "iplo_attempt")
      .order("occurred_at", { ascending: false })
      .limit(40),
    admin
      .from("course_lessons")
      .select("position")
      .eq("story_id", storyId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (progress.error) {
    console.error("loadIploSessionState progress:", progress.error.message);
  }
  if (events.error) {
    console.error("loadIploSessionState events:", events.error.message);
  }
  if (lesson.error) {
    console.error("loadIploSessionState lesson:", lesson.error.message);
  }

  const dayMarks = (events.data ?? [])
    .filter((row) => {
      const detail = row.detail as { story_id?: string } | null;
      return detail?.story_id === storyId;
    })
    .map((row) => row.occurred_at as string);

  return {
    completedOnce: progress.data?.status === "completed",
    closingLine: lesson.data?.position === 23,
    dayMarks,
  };
}
