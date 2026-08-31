// Seed the Phase 4 tag catalogs after supabase/schema-phase4a.sql is run.
//
//   npx tsx scripts/seed-knowledge-tags.ts
//
// Idempotent: upserts on `name`, then resolves grammar prerequisites to UUIDs.
// Tags are catalog data, so writes go through the service role, never the
// browser.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import { TAG_SEEDS } from "../src/lib/knowledge-tags";
import { tagTableFor, TAG_TYPES } from "../src/lib/content-tags";

async function main() {
  const admin = createAdminClient();

  const probe = await admin.from("grammar_tags").select("id").limit(1);
  if (probe.error) {
    console.error(
      "Tag tables missing. Run supabase/schema-phase4a.sql in the SQL Editor first."
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  // Pass 1: names and display names.
  for (const tagType of TAG_TYPES) {
    const table = tagTableFor(tagType);
    const rows = TAG_SEEDS[tagType].map((seed) => ({
      name: seed.name,
      display_name: seed.displayName,
    }));

    const { error } = await admin
      .from(table)
      .upsert(rows, { onConflict: "name" });

    if (error) {
      console.error(`${table} upsert failed:`, error.message);
      process.exit(1);
    }
    console.log(`${table}: ${rows.length} tags`);
  }

  // Pass 2: grammar prerequisites, now that every id exists.
  const { data: grammarRows, error: grammarError } = await admin
    .from("grammar_tags")
    .select("id, name");

  if (grammarError) {
    console.error("grammar_tags read failed:", grammarError.message);
    process.exit(1);
  }

  const idByName = new Map<string, string>(
    (grammarRows ?? []).map((row) => [row.name as string, row.id as string])
  );

  let prerequisiteUpdates = 0;
  for (const seed of TAG_SEEDS.grammar) {
    const prerequisiteNames = seed.prerequisites ?? [];
    const id = idByName.get(seed.name);
    if (!id) continue;

    const prerequisiteIds: string[] = [];
    for (const name of prerequisiteNames) {
      const prerequisiteId = idByName.get(name);
      if (!prerequisiteId) {
        console.warn(
          `  unknown prerequisite "${name}" on "${seed.name}", skipped`
        );
        continue;
      }
      prerequisiteIds.push(prerequisiteId);
    }

    const { error } = await admin
      .from("grammar_tags")
      .update({ prerequisites: prerequisiteIds })
      .eq("id", id);

    if (error) {
      console.error(`prerequisites for ${seed.name} failed:`, error.message);
      process.exit(1);
    }
    if (prerequisiteIds.length > 0) prerequisiteUpdates += 1;
  }

  console.log(`grammar prerequisites set on ${prerequisiteUpdates} tags`);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
