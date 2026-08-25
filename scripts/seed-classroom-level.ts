// Seed profiles.classroom_level from live Stripe price when the field is empty.
// Does not overwrite a teacher move.
//
//   npx tsx scripts/seed-classroom-level.ts
//
// Requires schema-classroom-level.sql applied.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { execFileSync } from "node:child_process";
import type Stripe from "stripe";
import { createAdminClient } from "../src/lib/supabase/admin";
import { courseLevelForPriceId, subscriptionPriceId } from "../src/lib/stripe";
import { seedClassroomLevelIfEmpty } from "../src/lib/classroom-placement";

function stripeLiveJson(args: string[]): unknown {
  const raw = execFileSync("stripe", [...args, "--live"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const start = raw.indexOf("{");
  if (start < 0) {
    throw new Error(`stripe CLI returned no JSON: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start));
}

function listSubscriptions(status: string): Stripe.Subscription[] {
  const rows: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const args = [
      "subscriptions",
      "list",
      "--status",
      status,
      "--limit",
      "100",
      "--expand",
      "data.customer",
    ];
    if (startingAfter) args.push("--starting-after", startingAfter);
    const page = stripeLiveJson(args) as Stripe.ApiList<Stripe.Subscription>;
    rows.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }
  return rows;
}

function customerEmail(sub: Stripe.Subscription): string {
  const customer = sub.customer;
  if (customer && typeof customer === "object" && "email" in customer) {
    return String(customer.email ?? "").trim().toLowerCase();
  }
  return "";
}

async function main() {
  const admin = createAdminClient();
  const probe = await admin.from("profiles").select("classroom_level").limit(1);
  if (probe.error) {
    console.error(
      "classroom_level column missing. Run supabase/schema-classroom-level.sql in the SQL Editor."
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  const seen = new Set<string>();
  const subscriptions: Stripe.Subscription[] = [];
  for (const status of ["active", "past_due", "paused", "unpaid"]) {
    for (const sub of listSubscriptions(status)) {
      if (seen.has(sub.id)) continue;
      seen.add(sub.id);
      subscriptions.push(sub);
    }
  }

  let seeded = 0;
  let skipped = 0;
  let missing = 0;

  for (const sub of subscriptions) {
    const email = customerEmail(sub);
    const level = courseLevelForPriceId(subscriptionPriceId(sub));
    if (!email || !level) {
      skipped += 1;
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, classroom_level")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      missing += 1;
      continue;
    }

    if (profile.classroom_level) {
      skipped += 1;
      continue;
    }

    await seedClassroomLevelIfEmpty(profile.id, level);
    seeded += 1;
    console.log("seeded", email, level);
  }

  console.log(`done. seeded=${seeded} skipped=${skipped} missing_profile=${missing}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
