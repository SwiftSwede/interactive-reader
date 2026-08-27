// Apply Phase 2.5 seed data after schema-phase2.5.sql is run in the SQL Editor.
//
//   npx tsx scripts/seed-phase2.5.ts

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import {
  SOUND_VIDEO_CATALOG,
  SOCCER_JERSEY_CORAL_IPA,
  SOCCER_JERSEY_WORD_NOTES,
} from "../src/lib/sound-catalog";

async function main() {
  const admin = createAdminClient();

  const probe = await admin.from("sound_videos").select("ipa").limit(1);
  if (probe.error) {
    console.error(
      "Phase 2.5 columns missing. Run supabase/schema-phase2.5.sql in the SQL Editor."
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  const { error: videoError } = await admin.from("sound_videos").upsert(
    SOUND_VIDEO_CATALOG.map((video) => ({
      symbol: video.symbol,
      ipa: video.ipa,
      ipa_aliases: video.ipaAliases,
      name: video.name,
      duration_seconds: video.durationSeconds,
      description: video.description,
      examples: video.examples,
      course: video.course,
    })),
    { onConflict: "symbol" }
  );

  if (videoError) {
    console.error("sound_videos upsert failed:", videoError.message);
    process.exit(1);
  }

  const { data: story, error: storyError } = await admin
    .from("stories")
    .select("id")
    .eq("slug", "the-soccer-jersey")
    .maybeSingle();

  if (storyError || !story) {
    console.error("Could not find the-soccer-jersey story.");
    process.exit(1);
  }

  const { error: drillError } = await admin
    .from("pronunciation_drills")
    .update({
      practica_coral_ipa: SOCCER_JERSEY_CORAL_IPA,
      coral_audio_url: "/audio/stories/practica-coral-soccery-jersey.mp3",
      word_notes: SOCCER_JERSEY_WORD_NOTES,
    })
    .eq("story_id", story.id);

  if (drillError) {
    console.error("pronunciation_drills update failed:", drillError.message);
    process.exit(1);
  }

  console.log("Phase 2.5 seed complete.");
}

main();
