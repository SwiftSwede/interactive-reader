"use server";

import { getProfile } from "@/lib/auth-server";
import { getOrCreateActiveMission, snoozeMission } from "@/lib/missions";
import { isValidSnoozeUntil } from "@/lib/mission-snooze";
import { createClient } from "@/lib/supabase/server";

/** Hides the caller's own active mission card until the given instant. */
export async function snoozeMissionCard(
  untilIso: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Entra con tu email de nuevo." };

    const profile = await getProfile(user.id);
    if (!profile || profile.role === "teacher") {
      return { ok: false, error: "La vista de estudiante no guarda cambios." };
    }

    if (typeof untilIso !== "string" || !isValidSnoozeUntil(untilIso)) {
      return { ok: false, error: "No pude guardarlo. Intenta de nuevo." };
    }

    const mission = await getOrCreateActiveMission(supabase, user.id);
    if (!mission) return { ok: true };

    await snoozeMission(supabase, user.id, mission.id, untilIso);
    return { ok: true };
  } catch (error) {
    console.error(
      "snoozeMissionCard failed:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, error: "No pude guardarlo. Intenta de nuevo." };
  }
}
