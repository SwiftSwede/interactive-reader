// Verify the seed guard: line_timestamps must survive a re-seed untouched.
// Sets a dummy value, runs nothing itself (seed run is separate), checks after.
// Usage: npx tsx scripts/verify-seed-guard.ts <set|check|clear>   (delete after)
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { createAdminClient } from "../src/lib/supabase/admin";

const mode = process.argv[2] ?? "check";
const DUMMY = [{ line_index: 0, start_seconds: 1, end_seconds: 2 }];

async function main() {
  const admin = createAdminClient();
  if (mode === "set") {
    const { error } = await admin
      .from("stories")
      .update({ line_timestamps: DUMMY })
      .eq("slug", "white-is-red");
    console.log(error ? "ERROR setting dummy: " + error.message : "dummy set");
  } else if (mode === "clear") {
    const { error } = await admin
      .from("stories")
      .update({ line_timestamps: null })
      .eq("slug", "white-is-red");
    console.log(error ? "ERROR clearing: " + error.message : "cleared to null");
  } else {
    const { data } = await admin
      .from("stories")
      .select("line_timestamps")
      .eq("slug", "white-is-red")
      .single();
    const ts = data?.line_timestamps;
    console.log(
      ts && Array.isArray(ts) && ts.length > 0
        ? "PRESENT: " + JSON.stringify(ts[0])
        : "NULL/empty"
    );
  }
}
main();