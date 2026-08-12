// Seed script: inserts The Soccer Jersey story into Supabase
// Run with: npx tsx scripts/seed-story.ts
//
// This script reads the story markdown from the Obsidian vault,
// parses it, and inserts the story + comprehension questions +
// personal questions + pronunciation drill into the database.

// Load environment variables from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { WebSocket } from "ws";

// ── Config ─────────────────────────────────────────────────

// Use the secret key for seeding (bypasses RLS, allows inserts)
// Set SUPABASE_SECRET_KEY in .env.local (from Supabase Dashboard > Settings > API Keys > secret key)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  console.error("Add SUPABASE_SECRET_KEY to .env.local (from Supabase Dashboard > Settings > API Keys > secret key)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: WebSocket as any },
});

const STORY_FILE_PATH =
  "/Users/kylote/Documents/Obsidian Vault/Language-Wiki/raw/stories/pre-int stories/Pre-The-Soccer-Jersey.md";

// ── Parse the story markdown ───────────────────────────────

function parseStoryMarkdown(markdown: string) {
  const lines = markdown.split("\n");

  // Extract frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter: Record<string, string> = {};
  if (frontmatterMatch) {
    const fmText = frontmatterMatch[1];
    for (const line of fmText.split("\n")) {
      const match = line.match(/^(\w+):\s*(.+)/);
      if (match) frontmatter[match[1]] = match[2].trim();
    }
  }

  // Find the story body (between the # Title line and —The End—)
  const bodyStart = lines.findIndex((l) => l.startsWith("# "));
  const endIdx = lines.findIndex((l) => l.trim() === "—The End—");

  let bodyLines: string[] = [];
  if (bodyStart >= 0 && endIdx >= 0) {
    // Skip the title line and the blank line after it
    bodyLines = lines.slice(bodyStart + 1, endIdx).filter((l) => {
      // Skip the duplicate title line (e.g., "The Soccer Jersey" appears twice)
      return l.trim() !== frontmatter.title;
    });
  }

  // Clean up the body: remove leading/trailing blank lines, preserve paragraph breaks
  let bodyText = bodyLines.join("\n").trim();

  // Find comprehension questions
  const compStart = lines.findIndex((l) => l.trim() === "Comprehension Questions");
  const compEnd = lines.findIndex((l) => l.trim() === "Personal Questions");

  const comprehensionQuestions: { question: string; answer: string | null }[] = [];
  if (compStart >= 0 && compEnd >= 0) {
    const compLines = lines.slice(compStart + 1, compEnd).filter((l) => l.trim());
    for (const line of compLines) {
      // Questions end with "?" and answers follow on the same line or next line
      // Format: "Question? Answer." or "Question? Answer"
      const match = line.match(/^(.+?\?)\s+(.+)$/);
      if (match) {
        comprehensionQuestions.push({
          question: match[1].trim(),
          answer: match[2].trim(),
        });
      } else if (line.includes("?")) {
        comprehensionQuestions.push({
          question: line.trim(),
          answer: null,
        });
      }
    }
  }

  // Find personal questions
  const persStart = lines.findIndex((l) => l.trim() === "Personal Questions");
  const pronStart = lines.findIndex((l) => l.trim() === "Extreme Pronunciation");

  const personalQuestions: string[] = [];
  if (persStart >= 0 && pronStart >= 0) {
    const persLines = lines.slice(persStart + 1, pronStart).filter((l) => l.trim());
    for (const line of persLines) {
      if (line.trim()) personalQuestions.push(line.trim());
    }
  }

  // Find extreme pronunciation block
  const extremePronStart = lines.findIndex((l) => l.trim() === "Extreme Pronunciation");
  const practicaCoralIdx = lines.findIndex((l) => l.trim() === "Práctica Coral");

  // Extract symbol legend (everything between "Extreme Pronunciation" and "Práctica Coral")
  let symbolLegend = "";
  if (extremePronStart >= 0 && practicaCoralIdx >= 0) {
    const legendLines = lines.slice(extremePronStart + 1, practicaCoralIdx).filter((l) => l.trim());
    symbolLegend = legendLines.join("\n").trim();
  }

  // Extract Práctica Coral sentences
  let practicaCoralStandard = "";
  let practicaCoralPhonetic = "";
  if (practicaCoralIdx >= 0) {
    const coralLines = lines.slice(practicaCoralIdx + 1).filter((l) => l.trim());
    if (coralLines.length >= 2) {
      practicaCoralStandard = coralLines[0].trim();
      practicaCoralPhonetic = coralLines[1].trim();
    } else if (coralLines.length === 1) {
      practicaCoralStandard = coralLines[0].trim();
    }
  }

  return {
    title: frontmatter.title || "Untitled",
    level: frontmatter.level || "pre-intermediate",
    cefr: frontmatter.cefr || "A2/B1",
    bodyText,
    comprehensionQuestions,
    personalQuestions,
    pronunciationDrill: {
      symbolLegend,
      focusType: "sounds" as const,
      focusContent: symbolLegend, // For this story, the focus is the sounds legend
      practicaCoralStandard,
      practicaCoralPhonetic,
    },
  };
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log("Reading story file...");
  const markdown = readFileSync(STORY_FILE_PATH, "utf-8");

  console.log("Parsing story markdown...");
  const parsed = parseStoryMarkdown(markdown);

  console.log(`Title: ${parsed.title}`);
  console.log(`Level: ${parsed.level}`);
  console.log(`CEFR: ${parsed.cefr}`);
  console.log(`Body length: ${parsed.bodyText.length} chars`);
  console.log(`Comprehension questions: ${parsed.comprehensionQuestions.length}`);
  console.log(`Personal questions: ${parsed.personalQuestions.length}`);
  console.log(`Práctica Coral: ${parsed.pronunciationDrill.practicaCoralStandard}`);
  console.log("");

  // Check if story already exists
  const slug = "the-soccer-jersey";
  const { data: existing } = await supabase
    .from("stories")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    console.log("Story already exists. Deleting old records...");
    await supabase.from("pronunciation_drills").delete().eq("story_id", existing.id);
    await supabase.from("personal_questions").delete().eq("story_id", existing.id);
    await supabase.from("comprehension_questions").delete().eq("story_id", existing.id);
    await supabase.from("stories").delete().eq("id", existing.id);
    console.log("Old records deleted.");
  }

  // Insert story
  console.log("Inserting story...");
  const wordCount = parsed.bodyText.split(/\s+/).length;
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .insert({
      title: parsed.title,
      slug,
      level: parsed.level,
      cefr: parsed.cefr,
      body_text: parsed.bodyText,
      body_html: "", // Will be generated in Slice 3 (annotation)
      word_count: wordCount,
      is_free: true,
    })
    .select()
    .single();

  if (storyError) {
    console.error("Error inserting story:", storyError);
    process.exit(1);
  }

  console.log(`Story inserted with ID: ${story.id}`);

  // Insert comprehension questions
  console.log("Inserting comprehension questions...");
  for (let i = 0; i < parsed.comprehensionQuestions.length; i++) {
    const q = parsed.comprehensionQuestions[i];
    const { error } = await supabase.from("comprehension_questions").insert({
      story_id: story.id,
      position: i,
      question: q.question,
      answer: q.answer,
      level: "factual",
    });
    if (error) console.error(`Error inserting comp question ${i}:`, error);
  }
  console.log(`${parsed.comprehensionQuestions.length} comprehension questions inserted.`);

  // Insert personal questions
  console.log("Inserting personal questions...");
  for (let i = 0; i < parsed.personalQuestions.length; i++) {
    const { error } = await supabase.from("personal_questions").insert({
      story_id: story.id,
      position: i,
      question: parsed.personalQuestions[i],
    });
    if (error) console.error(`Error inserting personal question ${i}:`, error);
  }
  console.log(`${parsed.personalQuestions.length} personal questions inserted.`);

  // Insert pronunciation drill
  console.log("Inserting pronunciation drill...");
  const { error: drillError } = await supabase.from("pronunciation_drills").insert({
    story_id: story.id,
    symbol_legend: parsed.pronunciationDrill.symbolLegend,
    focus_type: parsed.pronunciationDrill.focusType,
    focus_content: parsed.pronunciationDrill.focusContent,
    practica_coral_standard: parsed.pronunciationDrill.practicaCoralStandard,
    practica_coral_phonetic: parsed.pronunciationDrill.practicaCoralPhonetic,
  });
  if (drillError) console.error("Error inserting pronunciation drill:", drillError);
  console.log("Pronunciation drill inserted.");

  console.log("");
  console.log("Done! The Soccer Jersey is now in the database.");
  console.log("Next step: Slice 2 — render the story on a page.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});