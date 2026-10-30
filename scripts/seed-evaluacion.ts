// Seed the /evaluacion bank (Slice 97a) from scripts/evaluacion-bank-v1.ts.
//
//   npx tsx scripts/seed-evaluacion.ts            # upsert content, keep statuses
//   npx tsx scripts/seed-evaluacion.ts --dry-run  # validate + show diffs only
//   npx tsx scripts/seed-evaluacion.ts --force    # also rewrite rows whose content changed
//                                                 # (refused once any attempt exists)
//
// Column ownership (ADR 012):
//   OWNS   eval_structures: track, kind, display_name_es, egp_ref, egp_level, l1_focus,
//          class_type, position
//   OWNS   eval_items: structure_id, role, format, prompt, options, correct_option_id,
//          rule_text, source
//   INSERT-ONLY eval_items.status ('draft'). Kyle's approve/retire is never overwritten.
//   NEVER  eval_attempts, eval_answers, eval_error_tags (student data).
//
// Without --force, an existing item whose content differs is logged and left alone, so a
// re-run never rewrites a question a student may already have answered.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import {
  DEFAULT_SEED_STATUS,
  toRows,
  validateBank,
  type ItemContentRow,
} from "../src/lib/evaluacion/seed";
import { EVALUACION_BANK_V1 } from "./evaluacion-bank-v1";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function changedFields(existing: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(next).filter((key) => stableJson(existing[key]) !== stableJson(next[key]));
}

async function main() {
  const problems = validateBank(EVALUACION_BANK_V1);
  if (problems.length > 0) {
    console.error("Bank has problems, nothing written:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const { structures, items } = toRows(EVALUACION_BANK_V1);
  const admin = createAdminClient();

  const { count: attemptCount, error: attemptError } = await admin
    .from("eval_attempts")
    .select("id", { count: "exact", head: true });
  if (attemptError) throw new Error(`Could not count attempts: ${attemptError.message}`);
  if (force && (attemptCount ?? 0) > 0) {
    console.error(
      `Refusing --force: ${attemptCount} evaluation attempts exist. Retire the item and add a new one instead.`,
    );
    process.exit(1);
  }

  const [{ data: existingStructures, error: sErr }, { data: existingItems, error: iErr }] =
    await Promise.all([
      admin.from("eval_structures").select("*"),
      admin.from("eval_items").select("*"),
    ]);
  if (sErr || iErr) throw new Error(`Could not read bank: ${(sErr ?? iErr)?.message}`);

  const structureById = new Map((existingStructures ?? []).map((row) => [row.id as string, row]));
  for (const row of structures) {
    const existing = structureById.get(row.id);
    if (existing) {
      const diff = changedFields(existing, row);
      if (diff.length) console.log(`structure ${row.id}: updating ${diff.join(", ")}`);
    }
  }

  const itemById = new Map((existingItems ?? []).map((row) => [row.id as string, row]));
  const inserts: (ItemContentRow & { status: string })[] = [];
  const updates: ItemContentRow[] = [];
  let unchanged = 0;
  for (const row of items) {
    const existing = itemById.get(row.id);
    if (!existing) {
      inserts.push({ ...row, status: DEFAULT_SEED_STATUS });
      continue;
    }
    const diff = changedFields(existing, row);
    if (diff.length === 0) {
      unchanged += 1;
    } else if (force) {
      console.log(`item ${row.id}: rewriting ${diff.join(", ")}`);
      updates.push(row);
    } else {
      console.log(`item ${row.id}: differs (${diff.join(", ")}), left alone. Use --force before any attempt exists.`);
    }
  }

  console.log(
    `${structures.length} structures; items: ${inserts.length} new, ${updates.length} rewritten, ${unchanged} unchanged.`,
  );
  if (dryRun) {
    console.log("Dry run: nothing written.");
    return;
  }

  // Positions are unique per track; park existing rows on unique negatives before the upsert.
  const existingIds = [...structureById.keys()];
  for (const [index, id] of existingIds.entries()) {
    const { error } = await admin
      .from("eval_structures")
      .update({ position: -1 - index })
      .eq("id", id);
    if (error) throw new Error(`Could not park ${id}: ${error.message}`);
  }
  for (const row of structures) {
    const { error } = await admin
      .from("eval_structures")
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw new Error(`Structure ${row.id}: ${error.message}`);
  }

  if (inserts.length > 0) {
    const { error } = await admin.from("eval_items").insert(inserts);
    if (error) throw new Error(`Item insert failed: ${error.message}`);
  }
  for (const row of updates) {
    const { error } = await admin
      .from("eval_items")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(`Item ${row.id}: ${error.message}`);
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
