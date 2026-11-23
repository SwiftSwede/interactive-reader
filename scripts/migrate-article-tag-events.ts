// One-off data migration: repoint historical learning_events rows that still
// carry the old tag name "article_omission" in detail.error_tags so they group
// with the renamed "article_usage" tag under mergeErrors (name-keyed).
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const OLD = "article_omission";
const NEW = "article_usage";

async function main() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("learning_events")
    .select("id, detail")
    .contains("detail", { error_tags: [OLD] });
  if (error) throw error;

  console.log(`rows matching: ${(data ?? []).length}`);

  let updated = 0;
  for (const row of data ?? []) {
    const detail = { ...(row.detail as Record<string, unknown>) };
    const tags = Array.isArray(detail.error_tags)
      ? (detail.error_tags as unknown[]).map((t) => (t === OLD ? NEW : t))
      : undefined;
    if (!tags) continue;
    detail.error_tags = tags;
    const { error: updErr } = await admin
      .from("learning_events")
      .update({ detail })
      .eq("id", row.id);
    if (updErr) throw updErr;
    updated += 1;
  }

  // verify: nothing left under the old name
  const { data: leftover, error: vErr } = await admin
    .from("learning_events")
    .select("id")
    .contains("detail", { error_tags: [OLD] });
  if (vErr) throw vErr;

  const { data: renamed, error: v2Err } = await admin
    .from("learning_events")
    .select("id")
    .contains("detail", { error_tags: [NEW] });
  if (v2Err) throw v2Err;

  console.log(
    JSON.stringify({
      updated,
      leftoverOldName: (leftover ?? []).length,
      rowsWithNewName: (renamed ?? []).length,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
