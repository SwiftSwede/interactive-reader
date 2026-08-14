// Annotation script: processes a story through an LLM to produce
// word-by-word translations (LatAm Spanish), IPA transcriptions,
// and multi-word expression grouping.
//
// Run with: npx tsx scripts/annotate-story.ts
//
// Uses OpenRouter API to call Claude Sonnet.

// Load environment variables from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

// ── Config ─────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = "anthropic/claude-sonnet-4";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars. Check .env.local");
  process.exit(1);
}
if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY. Add it to .env.local");
  console.error("Get it from https://openrouter.ai/keys");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: WebSocket as any },
});

const STORY_SLUG = "the-soccer-jersey";

// ── The LLM Prompt ─────────────────────────────────────────

function buildPrompt(storyText: string) {
  return `You are a language annotation tool for an English learning app targeting Latin American Spanish speakers.

You will be given an English story. For every word in the story, you must produce a JSON object with:
- "text": the word as it appears (preserve capitalization and punctuation attached to it)
- "lemma": the base form of the word (e.g. "went" → "go", "jerseys" → "jersey", "bought" → "buy")
- "ipa": the IPA phonetic transcription of the word in American English (e.g. "neighborhood" → "/ˈneɪbərhʊd/"). Use standard IPA notation.
- "spanish_translation": the best translation in context, in NEUTRAL LATIN AMERICAN Spanish. If a word has significant regional variation, include the most common variant first and alternatives in parentheses (e.g. "popote (Mx) / pajilla (Co)"). For proper nouns (names of people, brands, places), use the word itself as the translation.
- "part_of_speech": the part of speech (noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, interjection, proper noun)
- "is_transparent": true if the word is a cognate or easily understood by Spanish speakers without translation (e.g. "pizza", "soccer", "internet", "bar", "hotel"). false otherwise.
- "expression_id": null unless this word is part of a multi-word expression.

MULTI-WORD EXPRESSIONS:
Identify idioms, phrasal verbs, and fixed collocations (e.g. "make up your mind", "pull the wool over my eyes", "give someone a pat on the back", "come to your senses"). For each expression, assign a unique expression_id (a simple string like "expr_1", "expr_2", etc.). All words in the same expression get the same expression_id.

For each expression, also provide a separate entry in the "expressions" array:
- "id": the expression_id
- "text": the full expression as it appears
- "spanish_translation": translation of the whole expression
- "explanation": a brief explanation in Spanish of what the expression means and why it's used

OUTPUT FORMAT:
Return a single JSON object with this structure:
{
  "words": [
    {
      "text": "The",
      "lemma": "the",
      "ipa": "/ðə/",
      "spanish_translation": "el/la",
      "part_of_speech": "determiner",
      "is_transparent": true,
      "expression_id": null
    },
    ...
  ],
  "expressions": [
    {
      "id": "expr_1",
      "text": "make up your mind",
      "spanish_translation": "decidirte",
      "explanation": "Decidir algo, tomar una decision."
    },
    ...
  ]
}

RULES:
1. Translate to NEUTRAL LATIN AMERICAN Spanish. Not European Spanish. Use "carro" not "coche", "computadora" not "ordenador", "ustedes" not "vosotros".
2. Use standard IPA for American English pronunciation.
3. Include EVERY word in the story, including articles, prepositions, pronouns, etc.
4. Preserve punctuation attached to words (e.g. "jersey." not "jersey" and ".")
5. For proper nouns (Cristiano Ronaldo, Real Madrid, Barcelona, Adidas, Messi), set spanish_translation to the name itself and is_transparent to true.
6. For contractions (don't, can't, I'll), treat them as single words.
7. Mark cognates and easily understood words as transparent (is_transparent: true).
8. Be conservative with multi-word expressions. Only group words that form a recognized idiom, phrasal verb, or fixed expression. Do not group random adjacent words.

Here is the story to annotate:

${storyText}

Return ONLY the JSON object. No explanation, no markdown code fences, just the raw JSON.`;
}

// ── Call the LLM ──────────────────────────────────────────

type LLMWord = {
  text: string;
  lemma: string;
  ipa: string;
  spanish_translation: string;
  part_of_speech: string;
  is_transparent: boolean;
  expression_id: string | null;
};

type LLMExpression = {
  id: string;
  text: string;
  spanish_translation: string;
  explanation: string;
};

type LLMResponse = {
  words: LLMWord[];
  expressions: LLMExpression[];
};

async function annotateChunkWithLLM(chunkText: string, chunkIndex: number): Promise<LLMResponse> {
  const prompt = buildPrompt(chunkText);

  console.log(`  Chunk ${chunkIndex}: calling LLM (${prompt.length} chars)...`);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    }
  );

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

  // Strip markdown code fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/```$/, "").trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as LLMResponse;
    console.log(`  Chunk ${chunkIndex}: ${parsed.words.length} words, ${parsed.expressions?.length || 0} expressions.`);
    return parsed;
  } catch (err) {
    console.error(`Chunk ${chunkIndex}: failed to parse LLM response as JSON`);
    console.error("First 500 chars:", jsonStr.substring(0, 500));
    console.error("Parse error:", err);
    process.exit(1);
  }
}

async function annotateWithLLM(storyText: string): Promise<LLMResponse> {
  // Split story into paragraphs and process each separately
  const paragraphs = storyText.split("\n").filter((p) => p.trim());
  console.log(`Splitting story into ${paragraphs.length} paragraphs for processing...`);

  const allWords: LLMWord[] = [];
  const allExpressions: LLMExpression[] = [];
  let exprCounter = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const chunkResult = await annotateChunkWithLLM(para, i);

    // Renumber expression IDs to avoid collisions between chunks
    if (chunkResult.expressions) {
      for (const expr of chunkResult.expressions) {
        exprCounter++;
        const oldId = expr.id;
        const newId = `expr_${exprCounter}`;
        expr.id = newId;
        // Update words in this chunk that reference the old expression id
        for (const w of chunkResult.words) {
          if (w.expression_id === oldId) {
            w.expression_id = newId;
          }
        }
        allExpressions.push(expr);
      }
    }

    allWords.push(...chunkResult.words);
  }

  return { words: allWords, expressions: allExpressions };
}

// ── Insert into database ───────────────────────────────────

async function insertAnnotation(
  storyId: string,
  annotation: LLMResponse
) {
  // First, insert expressions
  const expressionIdMap = new Map<string, string>(); // expr_1 → uuid

  for (const expr of annotation.expressions || []) {
    const { data, error } = await supabase
      .from("expressions")
      .insert({
        story_id: storyId,
        text: expr.text,
        spanish_translation: expr.spanish_translation,
        explanation: expr.explanation,
        word_ids: [], // Will fill after words are inserted
      })
      .select()
      .single();

    if (error) {
      console.error(`Error inserting expression "${expr.text}":`, error);
      continue;
    }
    expressionIdMap.set(expr.id, data.id);
    console.log(`  Expression inserted: "${expr.text}" → ${data.id}`);
  }

  // Insert words
  let wordCount = 0;
  const wordIdsByExpr: Record<string, string[]> = {};

  for (let i = 0; i < annotation.words.length; i++) {
    const w = annotation.words[i];
    const exprUuid = w.expression_id ? expressionIdMap.get(w.expression_id) || null : null;

    const { data, error } = await supabase.from("words").insert({
      story_id: storyId,
      position: i,
      text: w.text,
      lemma: w.lemma || "",
      spanish_translation: w.spanish_translation || "",
      phonetic_transcription: w.ipa || "", // Using IPA directly per Kyle's decision
      part_of_speech: w.part_of_speech || "",
      audio_url: "", // Will be generated in a later slice
      expression_id: exprUuid,
      is_transparent: w.is_transparent || false,
    }).select().single();

    if (error) {
      console.error(`Error inserting word "${w.text}" at position ${i}:`, error);
      continue;
    }

    wordCount++;

    // Track word IDs for expression word_ids arrays
    if (w.expression_id) {
      if (!wordIdsByExpr[w.expression_id]) {
        wordIdsByExpr[w.expression_id] = [];
      }
      wordIdsByExpr[w.expression_id].push(data.id);
    }
  }

  console.log(`  ${wordCount} words inserted.`);

  // Update expressions with their word_ids
  for (const [exprLocalId, wordIds] of Object.entries(wordIdsByExpr)) {
    const exprUuid = expressionIdMap.get(exprLocalId);
    if (!exprUuid) continue;

    const { error } = await supabase
      .from("expressions")
      .update({ word_ids: wordIds })
      .eq("id", exprUuid);

    if (error) {
      console.error(`Error updating expression word_ids for ${exprLocalId}:`, error);
    }
  }

  return wordCount;
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  // Fetch the story from the database
  console.log("Fetching story from database...");
  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", STORY_SLUG)
    .single();

  if (error || !story) {
    console.error("Story not found:", error);
    process.exit(1);
  }

  console.log(`Story: ${story.title}`);
  console.log(`Body length: ${story.body_text.length} chars`);

  // Check if words already exist for this story
  const { data: existingWords } = await supabase
    .from("words")
    .select("id")
    .eq("story_id", story.id)
    .limit(1);

  if (existingWords && existingWords.length > 0) {
    console.log("Words already exist for this story. Deleting old words and expressions...");
    await supabase.from("words").delete().eq("story_id", story.id);
    await supabase.from("expressions").delete().eq("story_id", story.id);
    console.log("Old data deleted.");
  }

  // Run the LLM annotation
  const annotation = await annotateWithLLM(story.body_text);

  console.log("");
  console.log(`LLM returned ${annotation.words.length} words and ${annotation.expressions?.length || 0} expressions.`);

  // Show a sample
  console.log("\nSample words (first 5):");
  for (const w of annotation.words.slice(0, 5)) {
    console.log(`  "${w.text}" → ${w.spanish_translation} | IPA: ${w.ipa} | ${w.part_of_speech} | transparent: ${w.is_transparent}`);
  }

  if (annotation.expressions && annotation.expressions.length > 0) {
    console.log("\nExpressions found:");
    for (const e of annotation.expressions) {
      console.log(`  "${e.text}" → ${e.spanish_translation}`);
    }
  }

  // Insert into database
  console.log("\nInserting into database...");
  const count = await insertAnnotation(story.id, annotation);

  console.log("");
  console.log(`Done! ${count} words and ${annotation.expressions?.length || 0} expressions inserted for "${story.title}".`);
  console.log("Next step: Slice 4 — build the hover/tap tooltip UI.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});