// Check line_timestamps state for both songs (wipe diagnosis).
// Usage: npx tsx scripts/check-timestamps.ts   (delete after verification)
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  for (const slug of ["summer-of-69", "white-is-red"]) {
    const { data } = await admin
      .from("stories")
      .select("line_timestamps")
      .eq("slug", slug)
      .single();
    const ts = data?.line_timestamps;
    console.log(
      `${slug}: ${
        ts && Array.isArray(ts) && ts.length > 0
          ? `${ts.length} line timestamps present (first: ${JSON.stringify(ts[0])})`
          : "NULL / empty"
      }`
    );
  }
}
main();