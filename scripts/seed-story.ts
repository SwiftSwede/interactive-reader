// Seed script: inserts a story from the Obsidian vault into Supabase.
//
// Usage:
//   npx tsx scripts/seed-story.ts --slug flustered-and-driving --file "pre-int stories/Pre-Flustered-and-Driving.md"
//
// If --file is omitted, the script tries to resolve it from the slug:
//   flustered-and-driving → searches pre-int stories/ and int stories/ for *Flustered-and-Driving.md
//
// If --slug is omitted, it's derived from --file:
//   Pre-Flustered-and-Driving.md → flustered-and-driving
//
// Flags:
//   --slug <slug>         URL-safe slug for the story (default: derived from filename)
//   --file <path>         Path relative to vault raw/stories/ folder, or absolute path
//   --free                Mark as free story (default: false)
//   --level <level>       Override level (default: from frontmatter)
//   --no-answers          Skip AI answer generation for answerless comprehension questions
//
// For pre-intermediate stories with comprehension questions that have no answers,
// the script calls Claude Sonnet via OpenRouter to generate factual answers.
// This only runs when needed (questions parsed without answers).

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { WebSocket } from "ws";
import { stripStressMarks } from "../src/lib/pronunciation/referenceText";

// ── Config ─────────────────────────────────────────────────

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

const VAULT_BASE = "/Users/kylote/Documents/Obsidian Vault/Language-Wiki/raw/stories";

// ── Parse CLI args ─────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
  };
  const has = (flag: string): boolean => args.includes(flag);

  let slug = get("--slug");
  let file = get("--file");
  const isFree = has("--free");
  const levelOverride = get("--level");
  const skipAnswers = has("--no-answers");

  // Derive slug from file if not provided
  if (!slug && file) {
    const basename = file.split("/").pop()!.replace(/\.md$/, "");
    slug = basename
      .replace(/^Pre-/, "")
      .replace(/^Int-/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();
  }

  // Try to resolve file from slug if not provided
  if (!file && slug) {
    const caps = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("-");
    const candidates = [
      `${VAULT_BASE}/pre-int stories/Pre-${caps}.md`,
      `${VAULT_BASE}/int stories/Int-${caps}.md`,
      `${VAULT_BASE}/int stories/${caps}.md`,
      `${VAULT_BASE}/pre-int stories/${caps}.md`,
    ];
    for (const c of candidates) {
      if (existsSync(c)) {
        file = c;
        break;
      }
    }
  }

  // Resolve relative file path to absolute
  if (file && !file.startsWith("/")) {
    file = `${VAULT_BASE}/${file}`;
  }

  if (!slug) {
    console.error("Could not determine slug. Use --slug <slug> or --file <path>");
    process.exit(1);
  }
  if (!file || !existsSync(file)) {
    console.error(`Could not find story file. Resolved: ${file}`);
    console.error(`Use --file "pre-int stories/Pre-Story-Name.md" or provide an absolute path.`);
    process.exit(1);
  }

  return { slug, file, isFree, levelOverride, skipAnswers };
}

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
      if (match) frontmatter[match[1]] = match[2].trim().replace(/^"(.*)"$/, "$1");
    }
  }

  // Find the story body (between the # Title line and —The End— or —THE END—)
  const bodyStart = lines.findIndex((l) => l.startsWith("# "));
  const endIdx = lines.findIndex((l) => {
    const trimmed = l.trim();
    return trimmed === "—The End—" || trimmed === "—THE END—";
  });

  let bodyLines: string[] = [];
  if (bodyStart >= 0 && endIdx >= 0) {
    bodyLines = lines.slice(bodyStart + 1, endIdx).filter((l) => {
      return l.trim().toLowerCase() !== frontmatter.title.trim().toLowerCase();
    });
  }

  let bodyText = bodyLines.join("\n").trim();

  // Find comprehension questions
  // Handle both "Comprehension Questions" and "Comprehension questions"
  const compHeaderIdx = lines.findIndex((l) => {
    const t = l.trim().toLowerCase();
    return t === "comprehension questions" || t === "comprensión";
  });
  const persHeaderIdx = lines.findIndex((l) => {
    const t = l.trim().toLowerCase();
    return t === "personal questions" || t === "preguntas personales";
  });

  const comprehensionQuestions: { question: string; answer: string | null }[] = [];
  if (compHeaderIdx >= 0) {
    const endIdx2 = persHeaderIdx >= 0 ? persHeaderIdx : lines.length;
    const compLines = lines.slice(compHeaderIdx + 1, endIdx2).filter((l) => l.trim());
    for (const line of compLines) {
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
  const pronHeaderIdx = lines.findIndex((l) => {
    const t = l.trim().toLowerCase();
    return t === "extreme pronunciation" || t === "pronunciación extrema";
  });

  const personalQuestions: string[] = [];
  if (persHeaderIdx >= 0) {
    const endIdx3 = pronHeaderIdx >= 0 ? pronHeaderIdx : lines.length;
    const persLines = lines.slice(persHeaderIdx + 1, endIdx3).filter((l) => l.trim());
    for (const line of persLines) {
      if (line.trim()) personalQuestions.push(line.trim());
    }
  }

  // Find extreme pronunciation block
  const practicaCoralIdx = lines.findIndex((l) => {
    const t = l.trim().toLowerCase();
    return t === "práctica coral" || t === "practica coral";
  });

  let symbolLegend = "";
  if (pronHeaderIdx >= 0 && practicaCoralIdx >= 0) {
    const legendLines = lines.slice(pronHeaderIdx + 1, practicaCoralIdx).filter((l) => l.trim());
    symbolLegend = legendLines.join("\n").trim();
  }

  // Detect focus type from the pronunciation block content
  let focusType: "sounds" | "ed-s-rules" | "emphasized-syllable" = "sounds";
  const legendLower = symbolLegend.toLowerCase();
  if (legendLower.includes("-ed") && legendLower.includes("-s")) {
    focusType = "ed-s-rules";
  } else if (legendLower.includes("emphasized") || legendLower.includes("stressed") || legendLower.includes("syllable")) {
    focusType = "emphasized-syllable";
  }

  // Extract Práctica Coral sentences + Kyle's Notes
  // The standard text and phonetic respelling may be separated by blank lines.
  // After those two lines, there may be a "Kyle's Word Notes:" section with
  // word-by-word teaching notes (parsed into word_notes JSON), or a
  // "Kyle's Notes:" section with a single text block (coral_explanation).
  let practicaCoralStandard = "";
  let practicaCoralPhonetic = "";
  let coralExplanation = "";
  let coralWordNotes: { word: string; note: string }[] = [];
  if (practicaCoralIdx >= 0) {
    const coralLines: string[] = [];
    let notesStartIdx = -1;
    let notesType: "word" | "text" | null = null;
    for (let i = practicaCoralIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue; // skip blank lines, don't break
      // Skip timestamps, student names, or other trailing data
      if (/^\d+:\d+$/.test(t)) continue;
      if (/^[A-Z][a-z]+-\d/.test(t)) continue; // e.g. "Gina-3:50"
      if (coralLines.length < 2) {
        coralLines.push(t);
        if (coralLines.length >= 2) continue; // keep scanning for notes
      }
      // After the two coral lines, look for "Kyle's Word Notes:" or "Kyle's Notes:"
      if (/^kyle'?s?\s+word\s+notes?\s*:?/i.test(t)) {
        notesStartIdx = i + 1;
        notesType = "word";
        break;
      }
      if (/^kyle'?s?\s+notes?\s*:?/i.test(t)) {
        notesStartIdx = i + 1;
        notesType = "text";
        break;
      }
    }
    if (coralLines.length >= 2) {
      practicaCoralStandard = stripStressMarks(coralLines[0]);
      practicaCoralPhonetic = coralLines[1];
    } else if (coralLines.length === 1) {
      practicaCoralStandard = stripStressMarks(coralLines[0]);
      practicaCoralPhonetic = ""; // empty string, not null
    }
    // Collect notes content (everything after the header until EOF)
    if (notesStartIdx >= 0 && notesType === "word") {
      // Parse word-by-word notes: each entry is "Word: note text"
      // Entries may span multiple lines; blank lines separate entries.
      const rawNotes: string[] = [];
      for (let i = notesStartIdx; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t) rawNotes.push(t);
      }
      // Join all lines, then split on entries (Word: ...)
      // An entry starts when a line begins with "Word:" pattern
      let currentWord = "";
      let currentNote = "";
      for (const line of rawNotes) {
        const match = line.match(/^([A-Za-z'\s]+?):\s*(.+)$/);
        if (match) {
          // New entry starts
          if (currentWord) {
            coralWordNotes.push({ word: currentWord, note: currentNote.trim() });
          }
          currentWord = match[1].trim();
          currentNote = match[2].trim();
        } else {
          // Continuation of previous note
          currentNote += " " + line;
        }
      }
      if (currentWord) {
        coralWordNotes.push({ word: currentWord, note: currentNote.trim() });
      }
    } else if (notesStartIdx >= 0 && notesType === "text") {
      // Collect all text after the header as a single text block
      const noteLines: string[] = [];
      for (let i = notesStartIdx; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t) noteLines.push(t);
      }
      coralExplanation = noteLines.join("\n").trim();
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
      focusType,
      focusContent: symbolLegend,
      practicaCoralStandard,
      practicaCoralPhonetic,
      coralExplanation,
      coralWordNotes,
    },
  };
}

// ── AI answer generation for answerless comprehension questions ──

async function generateAnswers(
  storyTitle: string,
  storyBody: string,
  questions: string[]
): Promise<string[]> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
  if (!OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY. Cannot generate answers.");
    console.error("Add it to .env.local or use --no-answers to skip.");
    process.exit(1);
  }

  const prompt = `You are an English teaching assistant for Profe Kyle, a Canadian English teacher for Latin American Spanish speakers.

Read the following pre-intermediate English story. Then answer ${questions.length} comprehension questions about it.

RULES:
1. Each answer must be a SHORT, FACTUAL phrase — 1-10 words. These are pre-intermediate factual recall questions; the answer should be directly findable in the text.
2. Answer in English (the story is in English).
3. Keep answers simple enough for a pre-intermediate (A2/B1) learner to understand.
4. Do NOT repeat the question. Just give the answer.
5. If a question asks "what" or "who", give the specific thing or person from the story.
6. Return ONLY a JSON array of strings, one per question, in order. No explanation.

Story title: ${storyTitle}

Story:
${storyBody}

Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Return a JSON array of ${questions.length} answer strings:`;

  console.log(`  Calling Claude Sonnet to generate ${questions.length} answers...`);

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
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenRouter API error ${response.status}:`, errorText);
    process.exit(1);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content in LLM response:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/```$/, "").trim();
  }

  try {
    const answers = JSON.parse(jsonStr) as string[];
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      console.error(`Expected ${questions.length} answers, got ${answers.length}`);
      console.error("Raw:", jsonStr.substring(0, 500));
      process.exit(1);
    }
    return answers;
  } catch (err) {
    console.error("Failed to parse LLM response as JSON array");
    console.error("First 500 chars:", jsonStr.substring(0, 500));
    console.error("Parse error:", err);
    process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  const { slug, file, isFree, levelOverride, skipAnswers } = parseArgs();

  console.log("Reading story file...");
  console.log(`  File: ${file}`);
  const markdown = readFileSync(file, "utf-8");

  console.log("Parsing story markdown...");
  const parsed = parseStoryMarkdown(markdown);

  const level = levelOverride || parsed.level;

  console.log(`  Title: ${parsed.title}`);
  console.log(`  Slug: ${slug}`);
  console.log(`  Level: ${level}`);
  console.log(`  CEFR: ${parsed.cefr}`);
  console.log(`  Body: ${parsed.bodyText.length} chars, ~${parsed.bodyText.split(/\s+/).length} words`);
  console.log(`  Comprehension questions: ${parsed.comprehensionQuestions.length}`);
  console.log(`  Personal questions: ${parsed.personalQuestions.length}`);
  console.log(`  Pronunciation focus: ${parsed.pronunciationDrill.focusType}`);
  console.log(`  Práctica Coral: ${parsed.pronunciationDrill.practicaCoralStandard}`);
  if (parsed.pronunciationDrill.coralExplanation) {
    console.log(`  Kyle's Notes: ${parsed.pronunciationDrill.coralExplanation.length} chars`);
  }
  if (parsed.pronunciationDrill.coralWordNotes.length > 0) {
    console.log(`  Kyle's Word Notes: ${parsed.pronunciationDrill.coralWordNotes.length} entries`);
  }
  console.log(`  is_free: ${isFree}`);
  console.log("");

  // Generate answers for answerless comprehension questions
  const answerless = parsed.comprehensionQuestions.filter((q) => !q.answer);
  if (answerless.length > 0 && !skipAnswers) {
    console.log(`${answerless.length} of ${parsed.comprehensionQuestions.length} comprehension questions have no answer.`);
    console.log("Generating answers with Claude Sonnet...");

    const answers = await generateAnswers(
      parsed.title,
      parsed.bodyText,
      answerless.map((q) => q.question)
    );

    // Fill in the answers
    let answerIdx = 0;
    for (const q of parsed.comprehensionQuestions) {
      if (!q.answer) {
        q.answer = answers[answerIdx++];
      }
    }

    console.log("Generated answers:");
    for (const q of parsed.comprehensionQuestions) {
      console.log(`  Q: ${q.question}`);
      console.log(`  A: ${q.answer}`);
    }
    console.log("");
  } else if (answerless.length > 0 && skipAnswers) {
    console.log(`${answerless.length} questions have no answer. Skipping (--no-answers flag set).`);
  }

  // Check if story already exists
  const { data: existing } = await supabase
    .from("stories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    console.log("Story already exists. Deleting old records...");
    await supabase.from("pronunciation_drills").delete().eq("story_id", existing.id);
    await supabase.from("personal_questions").delete().eq("story_id", existing.id);
    await supabase.from("comprehension_questions").delete().eq("story_id", existing.id);
    await supabase.from("words").delete().eq("story_id", existing.id);
    await supabase.from("expressions").delete().eq("story_id", existing.id);
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
      level,
      cefr: parsed.cefr,
      kind: "story",
      body_text: parsed.bodyText,
      body_html: "",
      word_count: wordCount,
      is_free: isFree,
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
    symbol_legend: parsed.pronunciationDrill.symbolLegend || null,
    focus_type: parsed.pronunciationDrill.focusType,
    focus_content: parsed.pronunciationDrill.focusContent || null,
    practica_coral_standard: parsed.pronunciationDrill.practicaCoralStandard || null,
    practica_coral_phonetic: parsed.pronunciationDrill.practicaCoralPhonetic || null,
    coral_explanation: parsed.pronunciationDrill.coralExplanation || null,
    word_notes: parsed.pronunciationDrill.coralWordNotes || [],
  });
  if (drillError) console.error("Error inserting pronunciation drill:", drillError);
  console.log("Pronunciation drill inserted.");

  console.log("");
  console.log(`Done! "${parsed.title}" is now in the database.`);
  console.log(`Next step: annotate words → npx tsx scripts/annotate-story.ts --slug ${slug}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
