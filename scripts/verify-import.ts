import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const email = "nany_lopez79@hotmail.com";
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, role, stripe_customer_id, subscription_status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    console.error("missing profile", email);
    process.exit(1);
  }
  console.log("profile", {
    email: profile.email,
    role: profile.role,
    status: profile.subscription_status,
    customer: profile.stripe_customer_id,
  });

  const { data: periods } = await admin
    .from("subscription_periods")
    .select("stripe_subscription_id, status, started_at, ended_at")
    .eq("user_id", profile.id);
  console.log("periods", periods);

  const { data: enroll } = await admin
    .from("course_enrollments")
    .select("course_id, display_name, courses(level)")
    .eq("student_id", profile.id);
  console.log("enrollments", enroll);

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student-classroom");
  console.log("classroom students", count);

  if (profile.role !== "student-classroom" || !profile.stripe_customer_id) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
