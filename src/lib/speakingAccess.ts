import { isTeacherEmail } from "@/lib/auth";
import { getProfile, promoteTeacherIfNeeded } from "@/lib/auth-server";
import { speakingPrototypeEmails } from "@/lib/speakingFeedback";

export type SpeakingAccess = {
  allowed: boolean;
  owner: boolean;
};

/** Teacher profile or env allowlists. Matches teacher routes, not email env alone. */
export async function getSpeakingAccess(
  userId: string,
  email: string | null | undefined
): Promise<SpeakingAccess> {
  await promoteTeacherIfNeeded(userId, email);
  const profile = await getProfile(userId);
  const owner = profile?.role === "teacher" || isTeacherEmail(email);
  const volunteer =
    !!email &&
    speakingPrototypeEmails().includes(email.trim().toLowerCase());
  return { allowed: owner || volunteer, owner };
}
