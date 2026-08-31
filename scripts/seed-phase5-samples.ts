// Seed one annotated dialogue and one Movie Talk for Phase 5 slices 45–46.
//
//   npx tsx scripts/seed-phase5-samples.ts

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

type Sample = {
  slug: string;
  title: string;
  kind: "dialogue" | "movie_talk" | "song";
  body: string;
  translations: Record<string, { es: string; ipa: string }>;
  youtubeUrl?: string;
  lyricBlanks?: Array<{ id: number; prompt: string; answer: string }>;
};

const SAMPLES: Sample[] = [
  {
    slug: "the-coffee-line",
    title: "The Coffee Line",
    kind: "dialogue",
    body: "Sofia: I want a coffee.\nKyle: Me too. Let's go.",
    translations: {
      Sofia: { es: "Sofía", ipa: "/səˈfiə/" },
      I: { es: "yo", ipa: "/aɪ/" },
      want: { es: "quiero", ipa: "/wɑnt/" },
      a: { es: "un", ipa: "/ə/" },
      coffee: { es: "café", ipa: "/ˈkɑfi/" },
      Kyle: { es: "Kyle", ipa: "/kaɪl/" },
      Me: { es: "yo también", ipa: "/mi/" },
      too: { es: "también", ipa: "/tu/" },
      "Let's": { es: "vamos", ipa: "/lets/" },
      go: { es: "ir", ipa: "/ɡoʊ/" },
    },
  },
  {
    slug: "the-bus-stop",
    title: "The Bus Stop",
    kind: "movie_talk",
    body: "The bus is late.\n***\nA man starts to run.",
    translations: {
      The: { es: "el", ipa: "/ðə/" },
      bus: { es: "bus", ipa: "/bʌs/" },
      is: { es: "está", ipa: "/ɪz/" },
      late: { es: "tarde", ipa: "/leɪt/" },
      A: { es: "un", ipa: "/ə/" },
      man: { es: "hombre", ipa: "/mæn/" },
      starts: { es: "empieza", ipa: "/stɑrts/" },
      to: { es: "a", ipa: "/tə/" },
      run: { es: "correr", ipa: "/rʌn/" },
    },
  },
  {
    slug: "happy-today",
    title: "Happy Today",
    kind: "song",
    body: "I am happy today\nI am walking to school",
    translations: {
      I: { es: "yo", ipa: "/aɪ/" },
      am: { es: "soy", ipa: "/æm/" },
      happy: { es: "feliz", ipa: "/ˈhæpi/" },
      today: { es: "hoy", ipa: "/təˈdeɪ/" },
      walking: { es: "caminando", ipa: "/ˈwɑkɪŋ/" },
      to: { es: "a", ipa: "/tə/" },
      school: { es: "la escuela", ipa: "/skul/" },
    },
    youtubeUrl: "https://www.youtube.com/watch?v=ZbZSe6N_BXs",
    lyricBlanks: [
      { id: 1, prompt: "I am _____ today", answer: "happy" },
      { id: 2, prompt: "I am _____ to school", answer: "walking" },
    ],
  },
];

function tokensOf(body: string): string[] {
  return body
    .split("\n")
    .filter((line) => line.trim() && !/^\*+\s*$/.test(line.trim()))
    .flatMap((line) => line.split(/\s+/).filter(Boolean));
}

async function seedOne(
  admin: ReturnType<typeof createAdminClient>,
  sample: Sample
) {
  const tokens = tokensOf(sample.body);
  const { data: story, error: storyError } = await admin
    .from("stories")
    .upsert(
      {
        slug: sample.slug,
        title: sample.title,
        kind: sample.kind,
        level: "pre-intermediate",
        cefr: "A2",
        body_text: sample.body,
        body_html: sample.body,
        word_count: tokens.length,
        is_free: false,
        youtube_url: sample.youtubeUrl ?? null,
        lyric_blanks: sample.lyricBlanks ?? [],
      },
      { onConflict: "slug" }
    )
    .select("id")
    .maybeSingle();

  if (storyError || !story) {
    throw new Error(storyError?.message ?? `No pude guardar ${sample.slug}`);
  }

  await admin.from("words").delete().eq("story_id", story.id);

  const wordRows = tokens.map((token, position) => {
    const lemma = token.replace(/[^A-Za-z']/g, "");
    const info = sample.translations[lemma] ?? sample.translations[token];
    return {
      story_id: story.id,
      position,
      text: token,
      lemma: lemma.toLowerCase() || token,
      spanish_translation: info?.es ?? lemma,
      phonetic_transcription: info?.ipa ?? "",
      part_of_speech: "word",
      audio_url: "",
      is_transparent: false,
    };
  });

  const { error: wordError } = await admin.from("words").insert(wordRows);
  if (wordError) throw new Error(wordError.message);

  await admin.from("comprehension_questions").delete().eq("story_id", story.id);
  await admin.from("comprehension_questions").insert({
    story_id: story.id,
    position: 1,
    question: "What happens first?",
    answer:
      sample.kind === "dialogue"
        ? "Sofia wants a coffee."
        : sample.kind === "song"
          ? "The singer is happy."
          : "The bus is late.",
    level: "pre-intermediate",
  });

  await admin.from("personal_questions").delete().eq("story_id", sample.slug);
  await admin.from("personal_questions").delete().eq("story_id", story.id);
  await admin.from("personal_questions").insert({
    story_id: story.id,
    position: 1,
    question: "When was the last time you waited in a line?",
  });

  console.log(`Seeded ${sample.slug} (${tokens.length} words)`);
}

async function main() {
  const admin = createAdminClient();
  for (const sample of SAMPLES) {
    await seedOne(admin, sample);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
