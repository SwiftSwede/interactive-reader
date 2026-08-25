// One-off import of existing live Stripe (ThriveCart) subscriptions.
// Creates classroom users and periods. Only active (still-paying) subs
// are enrolled in the current course. Paused ThriveCart subs stay in
// profiles with subscription_status=paused and do not appear on the roster.
// Does NOT send magic-link emails. Teacher invite stays for nicknames.
//
// Dry-run (default):
//   npx tsx scripts/import-stripe-subscribers.ts
// Apply:
//   npx tsx scripts/import-stripe-subscribers.ts --apply
//
// Uses `stripe` CLI in live mode (already logged in) so this does not
// need sk_live in .env.local. Supabase comes from .env.local (same project
// as production).

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { execFileSync } from "node:child_process";
import type Stripe from "stripe";
import { courseLevelForPriceId, subscriptionPriceId } from "../src/lib/stripe";
import { syncClassroomFromSubscription } from "../src/lib/stripe-billing";

const APPLY = process.argv.includes("--apply");
const INCLUDE_CANCELED = process.argv.includes("--include-canceled");

const LIST_STATUSES: string[] = [
  "active",
  "past_due",
  "paused",
  "unpaid",
];
if (INCLUDE_CANCELED) {
  LIST_STATUSES.push("canceled");
}

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
    if (startingAfter) {
      args.push("--starting-after", startingAfter);
    }
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

function summarize(sub: Stripe.Subscription) {
  const priceId = subscriptionPriceId(sub);
  return {
    id: sub.id,
    status: sub.status,
    paused: Boolean(sub.pause_collection),
    email: customerEmail(sub) || "(no email)",
    priceId: priceId ?? "(no price)",
    level: courseLevelForPriceId(priceId),
  };
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const seen = new Set<string>();
  const subscriptions: Stripe.Subscription[] = [];

  for (const status of LIST_STATUSES) {
    const batch = listSubscriptions(status);
    for (const sub of batch) {
      if (seen.has(sub.id)) continue;
      seen.add(sub.id);
      subscriptions.push(sub);
    }
  }

  const rows = subscriptions.map(summarize);
  const unmapped = rows.filter((row) => row.level === null);
  const noEmail = rows.filter((row) => row.email === "(no email)");

  const unmappedPrices = [...new Set(unmapped.map((row) => row.priceId))];

  console.log(APPLY ? "APPLY" : "DRY-RUN (pass --apply to write)");
  console.log(
    INCLUDE_CANCELED
      ? "including canceled history"
      : "current subs only (pass --include-canceled for old cancels)"
  );
  console.log(
    "pre-int prices:",
    process.env.STRIPE_PRICE_PRE_INTERMEDIATE ?? "(unset)"
  );
  console.log(
    "int prices:",
    process.env.STRIPE_PRICE_INTERMEDIATE ?? "(unset)"
  );
  console.log(`subscriptions: ${rows.length}`);
  console.log(`mapped to a course: ${rows.length - unmapped.length}`);
  console.log(`unmapped price: ${unmapped.length}`);
  if (unmappedPrices.length > 0) {
    console.log("unmapped price ids:", unmappedPrices.join(", "));
  }
  console.log(`missing email: ${noEmail.length}`);
  console.log("");
  console.log(
    ["status", "paused", "level", "price", "email", "sub"].join("\t")
  );
  for (const row of rows) {
    console.log(
      [
        row.status,
        row.paused ? "paused" : "",
        row.level ?? "UNMAPPED",
        row.priceId,
        row.email,
        row.id,
      ].join("\t")
    );
  }

  if (!APPLY) {
    console.log("");
    console.log("No writes. Re-run with --apply to sync into Supabase.");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const sub of subscriptions) {
    const row = summarize(sub);
    try {
      await syncClassroomFromSubscription(sub, row.email === "(no email)" ? null : row.email, {
        skipMagicLink: true,
        skipStripeRetrieve: true,
      });
      ok += 1;
      console.log("synced", row.email, row.id);
    } catch (error) {
      failed += 1;
      console.error("FAILED", row.email, row.id, error);
    }
  }

  console.log("");
  console.log(`done. synced=${ok} failed=${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
