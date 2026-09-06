import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, promoteTeacherIfNeeded } from "@/lib/auth-server";

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
  if (profile?.role === "teacher") {
    redirect("/teacher");
  }

  const rawName = user.user_metadata?.display_name;
  const displayName =
    typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;

  return { supabase, user, profile, displayName };
}
