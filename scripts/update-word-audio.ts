// Update audio_url field in Supabase for all word rows.
// Reads the audio mapping JSON and updates each word row.
//
// Run: npx tsx scripts/update-word-audio.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { readFileSync } from "fs";
import { join, dirname } from "path";

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
  // Load the audio mapping
  const mappingPath = join(dirname(__dirname), "scripts", "audio-mapping.json");
  // Actually it's in the scripts/ dir
  const mappingFile = join(process.cwd(), "scripts", "audio-mapping.json");
  const mapping: Record<string, string> = JSON.parse(readFileSync(mappingFile, "utf-8"));

  console.log(`Loaded ${Object.keys(mapping).length} audio mappings`);

  // Get the free story
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title")
    .eq("is_free", true)
    .single();

  if (storyError || !story) {
    console.error("Story not found:", storyError);
    process.exit(1);
  }

  console.log(`Story: ${story.title}`);

  // Fetch all words (paginated)
  const { data: page1 } = await supabase
    .from("words")
    .select("id, position, text")
    .eq("story_id", story.id)
    .order("position", { ascending: true })
    .range(0, 999);

  const { data: page2 } = await supabase
    .from("words")
    .select("id, position, text")
    .eq("story_id", story.id)
    .order("position", { ascending: true })
    .range(1000, 1999);

  const allWords = [...(page1 || []), ...(page2 || [])];
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

    if ((updated + skipped + failed) % 100 === 0) {
      console.log(`  Progress: ${updated + skipped + failed}/${allWords.length}`);
    }
  }

  console.log("");
  console.log(`Done! Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});