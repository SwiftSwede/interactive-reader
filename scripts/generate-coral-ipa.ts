// Generate IPA for a story's Práctica Coral sentence and save to database.
// Usage: npx tsx scripts/generate-coral-ipa.ts --slug flustered-and-driving

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { KYLE_IPA_ALPHA_RULE } from "../src/lib/ipa-conventions";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: WebSocket as any },
});

function parseSlug(): string {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--slug");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  console.error("Usage: npx tsx scripts/generate-coral-ipa.ts --slug <slug>");
  process.exit(1);
}

async function main() {
  const slug = parseSlug();

  // Fetch the pronunciation drill
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();

  if (storyError || !story) {
    console.error("Story not found:", storyError);
    process.exit(1);
  }

  const { data: drill, error: drillError } = await supabase
    .from("pronunciation_drills")
    .select("id, practica_coral_standard, practica_coral_ipa")
    .eq("story_id", story.id)
    .maybeSingle();

  if (drillError || !drill) {
    console.error("Pronunciation drill not found:", drillError);
    process.exit(1);
  }

  if (!drill.practica_coral_standard) {
    console.error("No Práctica Coral sentence for this story.");
    process.exit(1);
  }

  if (drill.practica_coral_ipa) {
    console.log(`IPA already exists: ${drill.practica_coral_ipa}`);
    return;
  }

  console.log(`Generating IPA for: "${drill.practica_coral_standard}"`);

  const prompt = `Transcribe this English sentence in IPA (American English, General American accent). ${KYLE_IPA_ALPHA_RULE} Return ONLY the IPA string in slashes, no explanation.

Sentence: ${drill.practica_coral_standard}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API error ${response.status}:`, errorText);
    process.exit(1);
  }

  const data = await response.json();
  const ipa = data.choices?.[0]?.message?.content?.trim();

  if (!ipa) {
    console.error("No IPA in response:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`IPA: ${ipa}`);

  const { error: updateError } = await supabase
    .from("pronunciation_drills")
    .update({ practica_coral_ipa: ipa })
    .eq("id", drill.id);

  if (updateError) {
    console.error("Database update error:", updateError);
    process.exit(1);
  }

  console.log("IPA saved to database.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
