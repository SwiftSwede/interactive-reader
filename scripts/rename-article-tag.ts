// One-off: rename error tag article_omission -> article_usage IN PLACE so the
// row id survives (per the rename procedure; upsert-by-name would orphan it).
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();

  const { data: before, error: e0 } = await admin
    .from("error_tags")
    .select("id, name, display_name")
    .eq("name", "article_omission")
    .maybeSingle();
  if (e0) throw e0;
  if (!before) {
    console.log("No article_omission row found; nothing to rename.");
    return;
  }

  const { error: e1 } = await admin
    .from("error_tags")
    .update({ name: "article_usage", display_name: "Article usage" })
    .eq("id", before.id);
  if (e1) throw e1;

  const { data: after, error: e2 } = await admin
    .from("error_tags")
    .select("id, name, display_name")
    .eq("id", before.id)
    .maybeSingle();
  if (e2) throw e2;

  const { count, error: e3 } = await admin
    .from("error_tags")
    .select("id", { count: "exact" });
  if (e3) throw e3;

  console.log(JSON.stringify({ renamed: before, now: after, totalTags: count }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
