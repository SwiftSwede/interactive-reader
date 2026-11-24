// One-off: merge error tags gerund_after_preposition + negative_infinitive
// into gerunds_and_infinitives. The gerund_after_preposition row keeps its id.
// Then delete negative_infinitive. Also rewrites name-keyed learning_events.
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const SURVIVOR_OLD = "gerund_after_preposition";
const LOSER = "negative_infinitive";
const NEW = "gerunds_and_infinitives";
const DISPLAY = "Gerunds and infinitives";
const OLD_NAMES = new Set([SURVIVOR_OLD, LOSER]);

type TagRow = { id: string; name: string; display_name: string };

function rewriteNames(value: unknown): { next: unknown[]; changed: boolean } | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const next: unknown[] = [];
  let changed = false;
  for (const item of value) {
    if (typeof item !== "string") {
      next.push(item);
      continue;
    }
    const mapped = OLD_NAMES.has(item) ? NEW : item;
    if (mapped !== item) changed = true;
    if (seen.has(mapped)) {
      changed = true;
      continue;
    }
    seen.add(mapped);
    next.push(mapped);
  }
  return { next, changed };
}

async function main() {
  const admin = createAdminClient();

  const { data: tags, error: tagErr } = await admin
    .from("error_tags")
    .select("id, name, display_name")
    .in("name", [SURVIVOR_OLD, LOSER, NEW]);
  if (tagErr) throw tagErr;

  const byName = new Map<string, TagRow>(
    (tags ?? []).map((row) => [row.name as string, row as TagRow]),
  );
  const survivor = byName.get(SURVIVOR_OLD) ?? byName.get(NEW);
  const loser = byName.get(LOSER);

  if (!survivor) {
    console.log("No survivor row (gerund_after_preposition / gerunds_and_infinitives). Abort.");
    process.exit(1);
  }

  if (survivor.name !== NEW || survivor.display_name !== DISPLAY) {
    const { error } = await admin
      .from("error_tags")
      .update({ name: NEW, display_name: DISPLAY })
      .eq("id", survivor.id);
    if (error) throw error;
    survivor.name = NEW;
    survivor.display_name = DISPLAY;
  }

  const uuidTables = [
    "user_topic_evidence",
    "student_missions",
    "drill_items",
    "content_tags",
  ] as const;

  const uuidMoves: Record<string, { updated: number; dropped: number }> = {};

  if (loser && loser.id !== survivor.id) {
    for (const table of uuidTables) {
      const { data: rows, error } = await admin
        .from(table)
        .select("id")
        .eq("tag_id", loser.id);
      if (error) throw error;

      let updated = 0;
      let dropped = 0;
      for (const row of rows ?? []) {
        const { error: updErr } = await admin
          .from(table)
          .update({ tag_id: survivor.id })
          .eq("id", row.id);
        if (updErr) {
          const { error: delErr } = await admin.from(table).delete().eq("id", row.id);
          if (delErr) throw delErr;
          dropped += 1;
        } else {
          updated += 1;
        }
      }
      uuidMoves[table] = { updated, dropped };
    }

    const { data: missionEvents, error: missionErr } = await admin
      .from("learning_events")
      .select("id, detail")
      .filter("detail->>tag_id", "eq", loser.id);
    if (missionErr) throw missionErr;

    let missionEventsUpdated = 0;
    for (const row of missionEvents ?? []) {
      const detail = { ...(row.detail as Record<string, unknown>) };
      detail.tag_id = survivor.id;
      if (typeof detail.name === "string" && OLD_NAMES.has(detail.name)) {
        detail.name = NEW;
      }
      const { error: updErr } = await admin
        .from("learning_events")
        .update({ detail })
        .eq("id", row.id);
      if (updErr) throw updErr;
      missionEventsUpdated += 1;
    }
    uuidMoves.learning_events_tag_id = {
      updated: missionEventsUpdated,
      dropped: 0,
    };

    const { error: delTagErr } = await admin
      .from("error_tags")
      .delete()
      .eq("id", loser.id);
    if (delTagErr) throw delTagErr;
  }

  const nameKeys = ["error_tags", "flags", "clears"] as const;
  let nameRowsUpdated = 0;
  for (const oldName of [SURVIVOR_OLD, LOSER]) {
    for (const key of nameKeys) {
      const { data, error } = await admin
        .from("learning_events")
        .select("id, detail")
        .contains("detail", { [key]: [oldName] });
      if (error) throw error;
      for (const row of data ?? []) {
        const detail = { ...(row.detail as Record<string, unknown>) };
        let changed = false;
        for (const field of nameKeys) {
          const rewritten = rewriteNames(detail[field]);
          if (!rewritten) continue;
          if (rewritten.changed) {
            detail[field] = rewritten.next;
            changed = true;
          }
        }
        if (typeof detail.name === "string" && OLD_NAMES.has(detail.name)) {
          detail.name = NEW;
          changed = true;
        }
        if (!changed) continue;
        const { error: updErr } = await admin
          .from("learning_events")
          .update({ detail })
          .eq("id", row.id);
        if (updErr) throw updErr;
        nameRowsUpdated += 1;
      }
    }
  }

  const leftover: Record<string, number> = {};
  for (const oldName of [SURVIVOR_OLD, LOSER]) {
    leftover[`error_tags.${oldName}`] = (
      await admin
        .from("error_tags")
        .select("id", { count: "exact", head: true })
        .eq("name", oldName)
    ).count ?? 0;
    leftover[`events.error_tags.${oldName}`] = (
      await admin
        .from("learning_events")
        .select("id", { count: "exact", head: true })
        .contains("detail", { error_tags: [oldName] })
    ).count ?? 0;
  }

  const { count: totalTags, error: countErr } = await admin
    .from("error_tags")
    .select("id", { count: "exact", head: true });
  if (countErr) throw countErr;

  const { data: after, error: afterErr } = await admin
    .from("error_tags")
    .select("id, name, display_name")
    .eq("id", survivor.id)
    .maybeSingle();
  if (afterErr) throw afterErr;

  console.log(
    JSON.stringify(
      {
        survivor: after,
        uuidMoves,
        nameRowsUpdated,
        leftover,
        totalTags,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
