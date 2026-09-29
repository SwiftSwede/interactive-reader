// Read-only sample: show audio links on a few words (proof for Kyle).
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { realtime: { transport: WebSocket as any } }
);

async function main() {
  const { data: s } = await supabase
    .from("stories")
    .select("id, title")
    .eq("slug", "flustered-and-driving")
    .limit(1)
    .single();
  const { data: words } = await supabase
    .from("words")
    .select("text, spanish_translation, phonetic_transcription, audio_url")
    .eq("story_id", s.id)
    .in("text", ["fender", "bender", "appointment", "honking"])
    .limit(5);
  console.log(`Story: ${s.title}`);
  for (const w of words || []) {
    console.log(`"${w.text}" → IPA: ${w.phonetic_transcription || "(none)"} | ES: ${w.spanish_translation} | audio: ${w.audio_url || "(none)"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
