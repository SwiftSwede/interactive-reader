// Reusable story verification: prints a story's first words next to the first
// characters of body_text, to confirm annotation alignment (tap-to-reveal).
//
//   npx tsx scripts/verify-story.ts --slug beetlejuice
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--slug");
  const slug = idx >= 0 ? args[idx + 1] : null;
  if (!slug) {
    console.error("Usage: npx tsx scripts/verify-story.ts --slug <slug>");
    process.exit(1);
  }
  const a = createAdminClient();
  const s = await a
    .from("stories")
    .select("id,slug,title,body_text")
    .eq("slug", slug)
    .single();
  if (!s.data) {
    console.error(`No story with slug "${slug}"`);
    process.exit(1);
  }
  const w = await a
    .from("words")
    .select("position,text")
    .eq("story_id", s.data.id)
    .order("position")
    .range(0, 9);
  console.log(`story: ${s.data.title} (${s.data.slug})`);
  console.log("first words:", w.data!.map((x) => `${x.position}:${x.text}`).join(" | "));
  console.log("body first 200:", JSON.stringify(s.data.body_text.slice(0, 200)));
  const { count } = await a
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("story_id", s.data.id);
  console.log("total words:", count);
}
main();
