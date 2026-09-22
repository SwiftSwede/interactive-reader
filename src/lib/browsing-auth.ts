import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, promoteTeacherIfNeeded } from "@/lib/auth-server";
import { readTeacherStudentPreview } from "@/lib/student-preview-server";
import type { CourseLevel, Profile } from "@/types";

export type BrowsingPreview = { level: CourseLevel };

export async function requireBrowsingStudent(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  await promoteTeacherIfNeeded(user.id, user.email);
  const profile = await getProfile(user.id);
  const previewLevel = await readTeacherStudentPreview(profile?.role);
  if (profile?.role === "teacher" && !previewLevel) {
    redirect("/teacher");
  }

  const rawName = user.user_metadata?.display_name;
  const displayName =
    typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;

  const preview: BrowsingPreview | null = previewLevel
    ? { level: previewLevel }
    : null;

  return { supabase, user, profile, displayName, preview };
}

export function browsingClassroomLevel(
  profile: Profile | null,
  preview: BrowsingPreview | null
): CourseLevel | null {
  return preview?.level ?? profile?.classroomLevel ?? null;
}
