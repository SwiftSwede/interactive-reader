import type { SupabaseClient } from "@supabase/supabase-js";
import { tagTableFor } from "@/lib/content-tags";
import { AppError } from "@/lib/errors";
import { getOrCreateActiveMission, type MissionTagType } from "@/lib/missions";

// What student surfaces may know about the mission: its name and snooze.
// Flags, evidence, and ranking stay behind missions.ts.

export type StudentMissionView = {
  missionId: string;
  tagType: MissionTagType;
  tagId: string;
  displayName: string;
  dismissedUntil: string | null;
};

/**
 * Runs the lazy picker, then names the mission from its tag catalog.
 * A tag row with no display name returns null so no raw id reaches a student.
 */
export async function missionForStudent(
  client: SupabaseClient,
  userId: string,
  adminClient?: SupabaseClient,
): Promise<StudentMissionView | null> {
  const mission = await getOrCreateActiveMission(client, userId, adminClient);
  if (!mission) return null;

  const { data, error } = await client
    .from(tagTableFor(mission.tagType))
    .select("display_name")
    .eq("id", mission.tagId)
    .maybeSingle();

  if (error) {
    console.error("missionForStudent tag read failed:", error.message);
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }

  const displayName =
    typeof data?.display_name === "string" ? data.display_name.trim() : "";
  if (!displayName) return null;

  return {
    missionId: mission.id,
    tagType: mission.tagType,
    tagId: mission.tagId,
    displayName,
    dismissedUntil: mission.dismissedUntil,
  };
}