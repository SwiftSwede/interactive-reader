import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();

  // Check the current constraint
  const { data, error } = await admin
    .from("stories")
    .select("kind")
    .limit(1);

  // Try inserting a test row with kind = 'video_summary'
  const { data: test, error: testError } = await admin
    .from("stories")
    .insert({
      slug: "__test_video_summary_constraint",
      title: "TEST",
      kind: "video_summary",
      level: "pre-intermediate",
      cefr: "A2",
      body_text: "test",
      body_html: "test",
      word_count: 1,
      is_free: false,
    })
    .select("id")
    .maybeSingle();

  if (testError) {
    console.log("INSERT FAILED:", testError.message);
    console.log("\nConstraint was NOT updated. Run this SQL in Supabase SQL Editor:");
    console.log("  ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_kind_check;");
    console.log("  ALTER TABLE stories ADD CONSTRAINT stories_kind_check");
    console.log("    CHECK (kind IN ('story', 'dialogue', 'movie_talk', 'song', 'video_summary'));");
  } else {
    console.log("INSERT SUCCEEDED — constraint includes video_summary.");
    // Clean up
    await admin.from("stories").delete().eq("slug", "__test_video_summary_constraint");
    console.log("Test row cleaned up.");
  }
}

main().catch(console.error);
