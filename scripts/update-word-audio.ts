// Update audio_url field in Supabase for all word rows of ONE story.
// Reads the audio mapping JSON (written by generate-word-audio.py) and
// updates each word row whose clean filename exists in the mapping.
//
// The MP3 library in public/audio/words/ is SHARED across stories (keyed by
// word text), so run generate-word-audio.py first for the slug, then this.
//
// Run: npx tsx scripts/update-word-audio.ts --slug <story-slug>

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: WebSocket as any },
});

// ── Helpers ──────────────────────────────────────────────

function cleanForFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[^a-z0-9']/g, "");
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  // Parse --slug argument (required)
  const args = process.argv.slice(2);
  const slugIdx = args.indexOf("--slug");
  if (slugIdx === -1 || !args[slugIdx + 1]) {
    console.error("Usage: npx tsx scripts/update-word-audio.ts --slug <story-slug>");
    process.exit(1);
  }
  const slug = args[slugIdx + 1];

  // Load the audio mapping
  const mappingFile = join(process.cwd(), "scripts", "audio-mapping.json");
  const mapping: Record<string, string> = JSON.parse(
    readFileSync(mappingFile, "utf-8")
  );
  console.log(`Loaded ${Object.keys(mapping).length} audio mappings`);

  // Get the story by slug (NOT is_free — there can be multiple free stories)
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title")
    .eq("slug", slug)
    .limit(1)
    .single();

  if (storyError || !story) {
    console.error("Story not found:", storyError);
    process.exit(1);
  }

  console.log(`Story: ${story.title}`);

  // Fetch all words (paginated)
  const allWords: { id: string; position: number; text: string; audio_url: string }[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("words")
      .select("id, position, text, audio_url")
      .eq("story_id", story.id)
      .order("position", { ascending: true })
      .range(start, start + 999);
    if (error) {
      console.error("Failed fetching words:", error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allWords.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Total words to update: ${allWords.length}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const word of allWords) {
    const filename = cleanForFilename(word.text) + ".mp3";
    const audioUrl = mapping[filename];

    if (!audioUrl) {
      console.warn(`  No audio mapping for "${word.text}" -> ${filename}`);
      skipped++;
      continue;
    }

    // Skip rows that already point at the right file (idempotent re-runs)
    if (word.audio_url === audioUrl) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("words")
      .update({ audio_url: audioUrl })
      .eq("id", word.id);

    if (error) {
      console.error(`  Error updating word ${word.id} ("${word.text}"):`, error.message);
      failed++;
    } else {
      updated++;
    }

    if ((updated + skipped + failed) % 200 === 0) {
      console.log(`  Progress: ${updated + skipped + failed}/${allWords.length}`);
    }
  }

  console.log("");
  console.log(`Done! Updated: ${updated}, Already correct/skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
