import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { createAdminClient } from "../../src/lib/supabase/admin";

// DB round-trip check for one Iplo day. Prints JSON for iplo_verify.py.
// Usage: npx tsx scripts/iplo/verify_db.ts <day>
async function main() {
  const day = Number(process.argv[2]);
  if (!Number.isInteger(day)) throw new Error("usage: verify_db.ts <day>");
  const admin = createAdminClient();
  const slug = `iplo-day-${day}`;
  const { data: stories, error } = await admin
    .from("stories")
    .select("id,slug,title,kind,audio_script,created_at,updated_at")
    .eq("slug", slug);
  if (error) throw error;
  const s = stories?.[0];
  if (!s) {
    console.log(JSON.stringify({ ok: false, reason: "story row missing" }));
    return;
  }
  const script =
    typeof s.audio_script === "string"
      ? JSON.parse(s.audio_script)
      : s.audio_script;
  const { segments, ...header } = script;
  const { data: lessons, error: e2 } = await admin
    .from("course_lessons")
    .select("position, story_id")
    .eq("story_id", s.id);
  if (e2) throw e2;
  console.log(
    JSON.stringify({
      ok: true,
      slug: s.slug,
      title: s.title,
      kind: s.kind,
      header,
      segmentCount: Array.isArray(segments) ? segments.length : 0,
      courseLessons: lessons ?? [],
    })
  );
}
main();