// Confirms idx_subscription_periods_stripe_sub exists by attempting a
// duplicate insert of a throwaway period, then deleting it.
//
//   npx tsx scripts/check-stripe-schema.ts
//
// If the unique index is missing, prints the SQL to run.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const DUMMY_SUB = "sub_schema_check_do_not_use";

async function main() {
  const admin = createAdminClient();
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (teacherError || !teacher) {
    console.error("Need a teacher profile row to probe the unique index.");
    process.exit(1);
  }

  await admin
    .from("subscription_periods")
    .delete()
    .eq("stripe_subscription_id", DUMMY_SUB);

  const row = {
    user_id: teacher.id,
    stripe_subscription_id: DUMMY_SUB,
    started_at: new Date().toISOString(),
    ended_at: null,
    status: "active",
  };

  const first = await admin.from("subscription_periods").insert(row);
  if (first.error) {
    console.error("first insert failed:", first.error.message);
    process.exit(1);
  }

  const second = await admin.from("subscription_periods").insert(row);
  await admin
    .from("subscription_periods")
    .delete()
    .eq("stripe_subscription_id", DUMMY_SUB);

  if (second.error?.code === "23505") {
    console.log("ok: unique index idx_subscription_periods_stripe_sub is present");
    return;
  }

  if (second.error) {
    console.error("second insert failed unexpectedly:", second.error.message);
    process.exit(1);
  }

  console.error("missing unique index on subscription_periods.stripe_subscription_id");
  console.error("Run this in the Supabase SQL Editor:");
  console.error(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_periods_stripe_sub ON public.subscription_periods(stripe_subscription_id);"
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
