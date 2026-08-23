import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isTeacherEmail, safeNextPath } from "@/lib/auth";
import type { Profile, SubscriptionStatus, UserRole } from "@/types";

type ProfileRow = {
  id: string;
  email: string;
  role: UserRole;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  purchased: boolean;
  purchased_at: string | null;
  created_at: string;
};

const PROFILE_COLUMNS =
  "id, email, role, stripe_customer_id, subscription_status, purchased, purchased_at, created_at";

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    stripeCustomerId: row.stripe_customer_id,
    subscriptionStatus: row.subscription_status,
    purchased: row.purchased,
    purchasedAt: row.purchased_at,
    createdAt: row.created_at,
  };
}

export async function getAppOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

export async function promoteTeacherIfNeeded(
  userId: string,
  email: string | null | undefined
): Promise<void> {
  if (!isTeacherEmail(email)) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.role === "teacher") return;

  const normalizedEmail = email!.trim().toLowerCase();

  if (existing) {
    await admin.from("profiles").update({ role: "teacher" }).eq("id", userId);
    return;
  }

  await admin.from("profiles").insert({
    id: userId,
    email: normalizedEmail,
    role: "teacher",
    subscription_status: "none",
  });
}

export async function requireTeacher(nextPath = "/dashboard"): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }

  await promoteTeacherIfNeeded(user.id, user.email);
  const profile = await getProfile(user.id);

  if (!profile || profile.role !== "teacher") {
    redirect("/dashboard");
  }

  return profile;
}

export type ClassroomStudent = {
  id: string;
  email: string;
  displayName: string | null;
};

export async function getClassroomStudents(): Promise<ClassroomStudent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email")
    .eq("role", "student-classroom");

  if (error || !data) return [];

  const students = await Promise.all(
    data.map(async (row) => {
      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      const displayName =
        typeof authUser.user?.user_metadata?.display_name === "string"
          ? authUser.user.user_metadata.display_name.trim()
          : "";

      return {
        id: row.id,
        email: row.email,
        displayName: displayName || null,
      };
    })
  );

  return students.sort((a, b) => {
    const nameA = (a.displayName ?? a.email).toLocaleLowerCase("es");
    const nameB = (b.displayName ?? b.email).toLocaleLowerCase("es");
    return nameA.localeCompare(nameB, "es");
  });
}
