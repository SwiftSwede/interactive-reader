// Seed the Paris presentation (intermediate Class 3 Format A).
//
//   npx tsx scripts/seed-presentation.ts
//
// Idempotent: updates the row if a prompt titled "Paris" already exists.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

type VocabSeed = {
  english: string;
  spanish: string;
  example_sentence: string | null;
};

function vocab(
  english: string,
  spanish: string,
  example?: string
): VocabSeed {
  return {
    english,
    spanish,
    example_sentence: example ?? null,
  };
}

const PARIS_SEGMENTS = [
  {
    id: 1,
    youtube_url: "https://www.youtube.com/watch?v=WoOEWvhj_0M",
    title: "Part 1",
    vocabulary: [
      vocab("Neat", "ordenado"),
      vocab("Cramped", "estrecho (de espacio)"),
      vocab("Barred from", "prohibido de"),
      vocab("Seize", "tomar con fuerza"),
      vocab("Fastrack", "acelerar"),
      vocab("Appoint", "nombrar"),
      vocab("Drive", "ambición"),
      vocab("Spring water", "agua manantial"),
      vocab("Sewer system", "sistema de alcantarillado"),
      vocab("Battle", "luchar"),
      vocab("Maze", "laberinto"),
      vocab("Narrow", "estrecho (de ancho)"),
      vocab("Armed uprising", "levantamiento armado"),
      vocab("Urge on", "animar a"),
      vocab("Painstaking", "minucioso"),
      vocab("Slope", "tener pendiente"),
      vocab("Landmark", "monumento"),
      vocab("Rule of thumb", "regla general"),
      vocab("Radiate", "irradiar"),
      vocab("Depth", "profundidad"),
    ],
    comprehension_questions: [
      {
        id: 1,
        question: "Paris limits the height of new buildings to how many meters?",
        answer: "37 meters",
      },
      {
        id: 2,
        question: "In what decade did a cholera pandemic hit Paris?",
        answer: "1830s",
      },
      {
        id: 3,
        question: "How many laborers did Haussmann hire to rebuild Paris?",
        answer: "10,000",
      },
      {
        id: 4,
        question: "What material did they use for Paris' facades?",
        answer: "Limestone",
      },
      {
        id: 5,
        question:
          "Napoleon and Haussmann wanted everything rebuilt in time for what event?",
        answer: "The 1855 World's Fair",
      },
    ],
  },
  {
    id: 2,
    youtube_url: "https://www.youtube.com/watch?v=TfI9nEKdGfg",
    title: "Part 2",
    vocabulary: [
      vocab("Overrated", "sobrevalorado"),
      vocab("Hyped", "exagerado por el público"),
      vocab("Set you up right", "te prepara adecuadamente"),
      vocab("Walkable", "se puede caminar"),
      vocab("Hidden gem", "algo increíble que nadie conoce"),
      vocab(
        "Quintessential",
        "por excelencia",
        "The arepa is quintessential Colombian food."
      ),
      vocab("French vibes", "ambiente francés"),
      vocab("FOMO", "fear of missing out"),
      vocab("Atmosphere", "ambiente"),
      vocab("Biased", "parcial"),
      vocab("Stick with", "quedarse con"),
      vocab("Starter", "entrada"),
      vocab("Main (dish)", "plato principal"),
      vocab("Overwhelming", "abrumador"),
      vocab("Big crowds", "grandes multitudes"),
    ],
    comprehension_questions: [
      {
        id: 1,
        question: "Where should you have breakfast in Paris?",
        answer: "Local bakery",
      },
      {
        id: 2,
        question: "Do Parisians usually wake up early or late?",
        answer: "Late",
      },
      {
        id: 3,
        question: "Is French onion soup common in France?",
        answer: "No",
      },
      {
        id: 4,
        question: "Does she recommend going to Le Louvre?",
        answer: "No",
      },
      {
        id: 5,
        question:
          "Where is the best view of the Eiffel tower without dealing with the big crowds?",
        answer: "Across the river",
      },
    ],
  },
  {
    id: 3,
    youtube_url: "https://www.youtube.com/watch?v=TfI9nEKdGfg&t=417s",
    title: "Part 3",
    vocabulary: [
      vocab("Chill", "relax"),
      vocab("Welcome break", "merecido descanso"),
      vocab("Under the radar", "poco conocido"),
      vocab("Budget", "presupuesto"),
      vocab(
        "Artsy",
        "artístico",
        "It has a very artsy feel."
      ),
    ],
    comprehension_questions: [
      {
        id: 1,
        question: "What is the national sport of Paris?",
        answer: "People watching",
      },
      {
        id: 2,
        question: "How long can you stay in French cafés?",
        answer: "However long you want",
      },
      {
        id: 3,
        question: "What's the best mode of transport for a tourist in Paris?",
        answer: "Your feet",
      },
    ],
  },
];

async function main() {
  const admin = createAdminClient();

  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (teacherError || !teacher) {
    console.error("No teacher profile found:", teacherError?.message);
    process.exit(1);
  }

  const payload = {
    title: "Paris",
    level: "intermediate",
    theme: "Paris, France",
    warmup_question: "Have you ever been to Paris? Would you like to go?",
    segments: PARIS_SEGMENTS,
    created_by: teacher.id,
  };

  const { data: existing } = await admin
    .from("presentation_prompts")
    .select("id")
    .eq("title", "Paris")
    .eq("level", "intermediate")
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("presentation_prompts")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      console.error("✗ Paris: update failed —", error.message);
      process.exit(1);
    }
    console.log(`✓ Updated "Paris" — id: ${existing.id}`);
    return;
  }

  const { data, error } = await admin
    .from("presentation_prompts")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("✗ Paris: insert failed —", error?.message ?? "no data");
    process.exit(1);
  }

  console.log(`✓ Seeded "Paris" — id: ${data.id}`);
}

void main();
