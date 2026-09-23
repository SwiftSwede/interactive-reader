// Read-only probe: word audio state across all stories.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { existsSync } from "fs";
import { join } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { realtime: { transport: WebSocket as any } }
);

const clean = (t: string) =>
  t.toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9']/g, "");

const wordsDir = join(process.cwd(), "public", "audio", "words");

async function fetchWords(storyId: string) {
  const all: { text: string; audio_url: string; translation: string; ipa: string }[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("words")
      .select("text, audio_url, spanish_translation, phonetic_transcription")
      .eq("story_id", storyId)
      .order("position", { ascending: true })
      .range(start, start + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as any));
    if (data.length < 1000) break;
  }
  return all;
}

async function main() {
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, title, slug, is_free, level")
    .order("created_at", { ascending: true });
  if (error) throw error;

  for (const s of stories || []) {
    const words = await fetchWords(s.id);
    const withAudio = words.filter((w) => w.audio_url).length;
    const noTranslation = words.filter((w) => !w.spanish_translation).length;
    const noIpa = words.filter((w) => !w.phonetic_transcription).length;

    // unique words in this story and MP3 coverage
    const unique = new Map<string, string>();
    for (const w of words) {
      const f = clean(w.text);
      if (f && !unique.has(f)) unique.set(f, w.text);
    }
    let haveMp3 = 0;
    const missing: string[] = [];
    for (const [f] of unique) {
      if (existsSync(join(wordsDir, f + ".mp3"))) haveMp3++;
      else missing.push(f);
    }
    console.log(
      `${s.is_free ? "[FREE]" : "      "} ${s.slug} (${s.level}) — words: ${words.length}, ` +
        `audio_url set: ${withAudio}, missing translation: ${noTranslation}, missing IPA: ${noIpa}`
    );
    console.log(
      `        unique words: ${unique.size}, MP3 already on disk: ${haveMp3}, MP3 missing: ${unique.size - haveMp3}` +
        (missing.length ? ` — e.g. ${missing.slice(0, 8).join(", ")}` : "")
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
