// Seed Presentation class lessons (Intermediate Class 3 Format A).
//
//   npx tsx scripts/seed-presentation.ts                  # seed all lessons
//   npx tsx scripts/seed-presentation.ts --slug gabo      # seed one lesson
//   npx tsx scripts/seed-presentation.ts --slug gabo --force
//       # required to re-seed a lesson that already has student responses
//       # (guard protects live class data; responses are never deleted —
//       # the row is updated in place)
//
// To add a lesson: append an entry to PRESENTATIONS below with the title,
// theme, warmup question (optional) and the segments array. Each segment is
// one YouTube viewing block: URL (use &t=300s for a mid-video start point),
// title, vocabulary (English=Spanish, optional example sentence) and
// comprehension questions with answers.
//
// Source material: Kyle's "2. Presentation: <Title>" Google Slides decks on
// Drive. Extract with: google_api.py drive download <id> --export-mime
// text/plain, then transcribe the vocabulary and Q&A into an entry below.
//
// Presentations skip the story pipeline entirely: no word annotation, no IPA,
// no Práctica Coral, no comprehension/personal questions. Idempotent by
// title+level (upsert in place — never deletes the row, so student responses
// survive). Free.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

type VocabSeed = {
  english: string;
  spanish: string;
  example_sentence: string | null;
};

type QuestionSeed = {
  id: number;
  question: string;
  answer: string;
};

type SegmentSeed = {
  id: number;
  youtube_url: string;
  title: string;
  vocabulary: VocabSeed[];
  comprehension_questions: QuestionSeed[];
};

type PresentationSeed = {
  slug: string; // script-side identifier for the --slug filter (not stored in DB)
  title: string;
  level: string;
  theme: string;
  warmup_question: string | null;
  segments: SegmentSeed[];
};

function vocab(english: string, spanish: string, example?: string): VocabSeed {
  return {
    english,
    spanish,
    example_sentence: example ?? null,
  };
}

const PRESENTATIONS: PresentationSeed[] = [
  {
    slug: "gabo",
    title: "Gabo",
    level: "intermediate",
    theme: "Gabriel García Márquez",
    warmup_question: null,
    segments: [
      {
        id: 1,
        youtube_url: "https://www.youtube.com/watch?v=B2zhLYz4pYo",
        title: "Video 1",
        vocabulary: [
          vocab("Forefront", "dar una paliza (golpes o palabras)"),
          vocab("Remarkable", "notable"),
          vocab("Chronicle", "narrar"),
          vocab("Lush", "exuberante"),
          vocab("Cast", "elenco"),
          vocab("Tangled", "enredado"),
          vocab("Rewarding", "gratificante"),
          vocab("Assortment", "surtido"),
          vocab("Matter of fact", "objetivo"),
          vocab("Intertwine seamlessly", "entrelazarse sin problemas"),
          vocab("Isolation", "aislamiento"),
          vocab("Features", "rasgos"),
          vocab("Gypsy", "gitano"),
          vocab("Skirmishes", "escaramuzas"),
          vocab("Firing squads", "pelotones de fusilamiento"),
          vocab("Striking workers", "trabajadores en huelga"),
          vocab("Mirror", "reflejar"),
          vocab("Downward spiral", "espiral descendente"),
          vocab("Powerless", "impotente"),
          vocab("From… onwards", "a partir de"),
          vocab("Coup d'etat", "golpe de estado"),
          vocab("Outlook", "perspectiva"),
        ],
        comprehension_questions: [
          {
            id: 1,
            question:
              "What was Gabo doing when he was struck by inspiration for 100 Years of Solitude?",
            answer: "Driving to Acapulco for a family vacation",
          },
          {
            id: 2,
            question: "What literary genre is Gabo a representative of?",
            answer: "Magical realism",
          },
          {
            id: 3,
            question: "What family does 100 Years of Solitude chronicle?",
            answer: "The Buendías",
          },
        ],
      },
      {
        id: 2,
        youtube_url: "https://www.youtube.com/watch?v=n2S2Neswudw&t=300s",
        title: "Video 2 - Part 1 (5:00)",
        vocabulary: [
          vocab("Outlive", "sobrevivir"),
          vocab("Decree", "decretar"),
          vocab("Praise", "elogiar/alabar"),
        ],
        comprehension_questions: [
          {
            id: 1,
            question: "At what age did Gabo die?",
            answer: "87",
          },
          {
            id: 2,
            question:
              "100 Years of Solitude was considered the greatest work of Spanish fiction since what other famous novel?",
            answer: "Don Quijote",
          },
          {
            id: 3,
            question:
              "How many languages has 100 Years of Solitude been translated into?",
            answer: "More than 30",
          },
          {
            id: 4,
            question: "What was the first book that Gabo read as a child?",
            answer: "1,001 Arabian Nights",
          },
          {
            id: 5,
            question: "What year did Gabo win the Nobel Prize in literature?",
            answer: "1982",
          },
          {
            id: 6,
            question: "Which way did Gabo lean politically?",
            answer: "Left",
          },
        ],
      },
      {
        id: 3,
        youtube_url: "https://www.youtube.com/watch?v=n2S2Neswudw&t=960s",
        title: "Video 2 - Part 2 (16:00)",
        vocabulary: [
          vocab("Enable", "habilitar"),
          vocab("Sheer", "puro"),
          vocab("Feat", "hazaña/proeza"),
          vocab("Pull off", "realizar algo difícil"),
          vocab("Waive", "desvanecerse"),
          vocab("Claim", "afirmar"),
          vocab("Bring up", "criar"),
          vocab("Everyday", "cotidiano"),
          vocab("Concern", "preocupación"),
          vocab("Riveting", "fascinante"),
          vocab("Craftily", "astutamente"),
          vocab("Furthermore", "además"),
          vocab("Vie for", "competir por"),
          vocab("Norm", "lo normal"),
          vocab("Ultimately", "última instancia"),
          vocab("Curtail", "reducir"),
          vocab("Trigger", "provocar"),
          vocab("Messy", "complicado/desordenado"),
          vocab("Childish", "infantil"),
          vocab("Strike", "parecer"),
          vocab("Striking", "llamativo"),
          vocab("Pull someone into", "sumergir a alguien en"),
          vocab("Overtaken", "dominado / se dejó llevar"),
          vocab("Setting", "escenario"),
        ],
        comprehension_questions: [
          {
            id: 1,
            question:
              "What did 100 Years of Solitude become for Latin America according to the professor?",
            answer: "A Bible",
          },
          {
            id: 2,
            question: "Who brought up Gabo as a child?",
            answer: "His maternal grandparents",
          },
          {
            id: 3,
            question:
              "What did 100 Years of Solitude help Latinos realize according to the professor?",
            answer: "They didn't have to live under oppression",
          },
          {
            id: 4,
            question:
              "Why is 100 Years of Solitude's opening line one of the greatest of all time?",
            answer: "It makes the reader want to resolve the mystery",
          },
        ],
      },
      {
        id: 4,
        youtube_url: "https://www.youtube.com/watch?v=n2S2Neswudw",
        title: "Video 2 - Part 3",
        vocabulary: [
          vocab("Shipwreck", "naufragio"),
          vocab("Straightforward", "directo"),
          vocab("Network", "red"),
          vocab("Consciousness", "conciencia"),
          vocab("Sorrow", "tristeza"),
          vocab("Above all", "sobre todo"),
          vocab("Leanings", "inclinaciones"),
          vocab("Subdued", "apagado"),
          vocab("Scores", "decenas"),
          vocab("Age", "envejecer"),
        ],
        comprehension_questions: [
          {
            id: 1,
            question: "What was the foundation of Gabo's writing?",
            answer: "His background as a reporter",
          },
          {
            id: 2,
            question:
              "What news story got Gabo in trouble with the Colombian authorities?",
            answer:
              "Contraband being smuggled into the country by the authorities",
          },
          {
            id: 3,
            question:
              "Which political leader did Gabo remain friends with even as other writers distanced themselves from said leader?",
            answer: "Fidel Castro",
          },
          {
            id: 4,
            question:
              "Which Latin American tyrants did Gabo support and which did he not?",
            answer:
              "He supported left-wing dictators but not right-wing ones",
          },
          {
            id: 5,
            question:
              "Why was it a contradiction that Gabo supported Fidel Castro and Hugo Chavez?",
            answer: "Because he criticized tyranny",
          },
        ],
      },
    ],
  },
  {
    slug: "paris",
    title: "Paris",
    level: "intermediate",
    theme: "Paris, France",
    warmup_question: "Have you ever been to Paris? Would you like to go?",
    segments: [
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
            question:
              "Paris limits the height of new buildings to how many meters?",
            answer: "37 meters",
          },
          {
            id: 2,
            question: "In what decade did a cholera pandemic hit Paris?",
            answer: "1830s",
          },
          {
            id: 3,
            question:
              "How many laborers did Haussmann hire to rebuild Paris?",
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
          vocab("Artsy", "artístico", "It has a very artsy feel."),
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
            question:
              "What's the best mode of transport for a tourist in Paris?",
            answer: "Your feet",
          },
        ],
      },
    ],
  },
];

async function seedPresentation(
  admin: ReturnType<typeof createAdminClient>,
  presentation: PresentationSeed,
  force: boolean
) {
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (teacherError || !teacher) {
    throw new Error(
      `No teacher profile found: ${teacherError?.message ?? "none"}`
    );
  }

  const payload = {
    title: presentation.title,
    level: presentation.level,
    theme: presentation.theme,
    warmup_question: presentation.warmup_question,
    segments: presentation.segments,
    created_by: teacher.id,
  };

  const { data: existing } = await admin
    .from("presentation_prompts")
    .select("id")
    .eq("title", presentation.title)
    .eq("level", presentation.level)
    .maybeSingle();

  // Guard: refuse to touch a lesson that already has student responses
  // unless --force. The update is in place (responses are never deleted),
  // but content changes mid-class would desync segment/question ids.
  if (existing) {
    const { count, error: countError } = await admin
      .from("presentation_responses")
      .select("id", { count: "exact", head: true })
      .eq("presentation_prompt_id", existing.id);

    if (countError) {
      throw new Error(
        `Could not check existing responses: ${countError.message}`
      );
    }

    if ((count ?? 0) > 0 && !force) {
      throw new Error(
        `${presentation.title}: ${count} student response(s) already exist for this lesson. ` +
          `Re-seeding would overwrite the content students answered against. ` +
          `Pass --force only if you really want to update it.`
      );
    }
  }

  if (existing) {
    const { error } = await admin
      .from("presentation_prompts")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      throw new Error(
        `${presentation.title}: update failed — ${error.message}`
      );
    }
    console.log(`✓ Updated "${presentation.title}" — id: ${existing.id}`);
  } else {
    const { data, error } = await admin
      .from("presentation_prompts")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      throw new Error(
        `${presentation.title}: insert failed — ${error?.message ?? "no data"}`
      );
    }
    console.log(`✓ Seeded "${presentation.title}" — id: ${data.id}`);
  }

  // Verification summary
  const totalVocab = presentation.segments.reduce(
    (sum, s) => sum + s.vocabulary.length,
    0
  );
  const totalQuestions = presentation.segments.reduce(
    (sum, s) => sum + s.comprehension_questions.length,
    0
  );
  console.log(
    `  ${presentation.segments.length} segments · ${totalVocab} vocab items · ${totalQuestions} questions`
  );
  presentation.segments.forEach((s) => {
    console.log(
      `  [${s.id}] ${s.title} — ${s.vocabulary.length} vocab, ${s.comprehension_questions.length} questions — ${s.youtube_url}`
    );
  });
}

async function main() {
  const admin = createAdminClient();

  const slugArgIdx = process.argv.indexOf("--slug");
  const slug = slugArgIdx !== -1 ? process.argv[slugArgIdx + 1] : undefined;
  const force = process.argv.includes("--force");

  const presentations = slug
    ? PRESENTATIONS.filter((p) => p.slug === slug)
    : PRESENTATIONS;
  if (presentations.length === 0) {
    console.error(`No presentation found with slug "${slug}". Available slugs:`);
    PRESENTATIONS.forEach((p) => console.error(`  ${p.slug} — ${p.title}`));
    process.exit(1);
  }

  for (const presentation of presentations) {
    console.log(`\n========== Seeding: ${presentation.title} ==========`);
    await seedPresentation(admin, presentation, force);
  }

  console.log(`\nDone. Seed successful.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
