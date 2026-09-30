import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { restoreAlumniEnrollmentsFromAttendance } from "../src/lib/classroom-placement";
import { createAdminClient } from "../src/lib/supabase/admin";

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function studentIdsToRestore(): Promise<string[]> {
  const email = argValue("--email")?.trim().toLowerCase() ?? null;
  const all = process.argv.includes("--all");
  const admin = createAdminClient();

  if (email) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .eq("role", "student-classroom")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      console.error("No classroom profile for", email);
      process.exit(1);
    }
    return [data.id];
  }

  if (!all) {
    console.error(
      "Pass --email <student@email> or --all (cancelled/paused students with attendance and no enrollment)."
    );
    process.exit(1);
  }

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "student-classroom")
    .in("subscription_status", ["cancelled", "paused"]);
  if (profileError) throw profileError;

  const ids: string[] = [];
  for (const profile of profiles ?? []) {
    const [{ count: enrollCount }, { count: attendedCount }] = await Promise.all([
      admin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", profile.id),
      admin
        .from("session_attendance")
        .select("id", { count: "exact", head: true })
        .eq("student_id", profile.id)
        .eq("attended", true),
    ]);
    if ((enrollCount ?? 0) === 0 && (attendedCount ?? 0) > 0) {
      ids.push(profile.id);
    }
  }
  return ids;
}

async function main() {
  const ids = await studentIdsToRestore();
  if (ids.length === 0) {
    console.log("No alumni enrollments to restore.");
    return;
  }

  for (const id of ids) {
    const result = await restoreAlumniEnrollmentsFromAttendance(id);
    if ("ok" in result && result.ok === false) {
      console.error("restore failed", id);
      process.exit(1);
    }
    if ("restored" in result) {
      console.log("restored", id, result.restored);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
