// Dedupe expressions for a story: keep the oldest row per expression text,
// re-point words.expression_id at the keeper, delete the rest.
//
// Pitfall this fixes: annotate-story.ts chunks per paragraph and separate
// chunks can each claim the same multi-word expression, inserting duplicate
// expressions rows. (Documented in the interactive-learning-platform skill.)
//
// Usage: npx tsx scripts/dedupe-expressions.ts --slug <slug> [--dry-run]

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

function parseSlug(): string {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--slug");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  console.error("Usage: npx tsx scripts/dedupe-expressions.ts --slug <slug> [--dry-run]");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const slug = parseSlug();
  const supabase = createAdminClient();

  const { data: story, error: storyErr } = await supabase
    .from("stories")
    .select("id,title")
    .eq("slug", slug)
    .maybeSingle();
  if (storyErr || !story) {
    console.error("Story not found:", storyErr?.message ?? slug);
    process.exit(1);
  }
  console.log(`Story: ${story.title}`);

  const { data: exprs, error: exprErr } = await supabase
    .from("expressions")
    .select("id,text,word_ids")
    .eq("story_id", story.id)
    .order("id", { ascending: true });
  if (exprErr) {
    console.error("Failed to fetch expressions:", exprErr.message);
    process.exit(1);
  }
  console.log(`Expressions: ${exprs.length}`);

  // group by exact text, keep first by id (no created_at column on expressions)
  const byText = new Map<string, typeof exprs>();
  for (const e of exprs) {
    const list = byText.get(e.text) ?? [];
    list.push(e);
    byText.set(e.text, list);
  }

  let repointed = 0;
  let deleted = 0;
  for (const [text, group] of byText) {
    if (group.length === 1) continue;
    const keeper = group[0];
    const losers = group.slice(1);
    console.log(`  "${text}": keeping ${keeper.id}, removing ${losers.length} duplicate(s)`);

    // words pointing at losers -> keeper
    const loserIds = losers.map((l) => l.id);
    const { data: affected, error: selErr } = await supabase
      .from("words")
      .select("id")
      .in("expression_id", loserIds);
    if (selErr) {
      console.error(`  failed to find words for duplicates of "${text}": ${selErr.message}`);
      continue;
    }
    if (affected && affected.length > 0) {
      if (!dryRun) {
        const { error: updErr } = await supabase
          .from("words")
          .update({ expression_id: keeper.id })
          .in("expression_id", loserIds);
        if (updErr) {
          console.error(`  failed to repoint words for "${text}": ${updErr.message}`);
          continue;
        }
      }
      repointed += affected.length;

      // merge word_ids into keeper
      const merged = Array.from(new Set([...(keeper.word_ids ?? []), ...affected.map((w) => w.id)]));
      if (!dryRun) {
        const { error: keepErr } = await supabase
          .from("expressions")
          .update({ word_ids: merged })
          .eq("id", keeper.id);
        if (keepErr) console.error(`  failed to merge word_ids into keeper: ${keepErr.message}`);
      }
    }

    if (!dryRun) {
      const { error: delErr } = await supabase
        .from("expressions")
        .delete()
        .in("id", loserIds);
      if (delErr) {
        console.error(`  failed to delete duplicates of "${text}": ${delErr.message}`);
        continue;
      }
    }
    deleted += losers.length;
  }

  console.log(
    dryRun
      ? `dry-run: would repoint ${repointed} words and delete ${deleted} duplicate expressions`
      : `Done: repointed ${repointed} words, deleted ${deleted} duplicate expressions`
  );
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
