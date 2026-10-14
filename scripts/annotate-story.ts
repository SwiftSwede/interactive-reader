// Annotation script: processes a story through an LLM to produce
// word-by-word translations (LatAm Spanish), IPA transcriptions,
// and multi-word expression grouping.
//
// Usage:
//   npx tsx scripts/annotate-story.ts --slug flustered-and-driving
//
// Fetches the story from Supabase by slug, splits the body into paragraphs,
// sends each paragraph to Claude Sonnet via OpenRouter, and inserts
// word-by-word translations (LatAm Spanish), IPA transcriptions, and
// multi-word expression groupings.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { KYLE_IPA_ALPHA_RULE } from "../src/lib/ipa-conventions";
import { movieTalkSpokenText } from "../src/lib/movietalk";

// Spoken-text stream for dialogues: the reader renders pure bracket lines as
// italic stage directions and speaker prefixes ("Jane:" / "Jane-") as labels,
// and NEITHER consumes word positions. The words table must therefore cover
// only the spoken tokens, so annotation (and its alignment guard) runs on the
// same stripped stream. Keep the prefix regexes in sync with
// InteractiveStory.tsx (dialogueName + spokenTokens strip).
function dialogueSpokenText(body: string): string {
  return body
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return t.length > 0 && !/^\[[^\]]*\]$/.test(t); // drop pure stage directions
    })
    .map((l) =>
      l.replace(
        /^([A-Za-zÁÉÍÓÚáéíóúñÑ0-9][A-Za-zÁÉÍÓÚáéíóúñÑ0-9.' \-]*?)(:\s*|\s+-\s*|-\s*)/,
        ""
      )
    )
    .join("\n")
    .replace(/\[[^\]]*\]/g, "") // inline stage directions are unspoken too
    .replace(/[ \t]+/g, " ")
    .trim();
}

// ── Config ─────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = process.env.ANNOTATE_MODEL || "anthropic/claude-sonnet-4.5";

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

// ── Parse CLI args ─────────────────────────────────────────

function parseSlug(): string {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--slug");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  console.error("Usage: npx tsx scripts/annotate-story.ts --slug <slug>");
  console.error("Example: npx tsx scripts/annotate-story.ts --slug flustered-and-driving");
  process.exit(1);
}

const STORY_SLUG = parseSlug();

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
0. CRITICAL — WORD-BY-WORD ALIGNMENT. Each word's "spanish_translation" must be a dictionary-style gloss of THAT EXACT WORD ONLY, in its context. Do NOT translate the sentence and distribute the Spanish tokens across the English words — Spanish word order differs from English, so a sentence translation smeared word-by-word misaligns everything (the tooltip for "egg" would show a different word's translation). Function words must gloss as themselves: "the" -> "el/la/los/las", "she" -> "ella", "when" -> "cuando", "her" -> "su". If your glosses read as a running sentence translation, they are WRONG. Example for "She no longer looked at egg prices": She->"ella", no->"ya no", longer->"más/más tiempo", looked->"miró", at->"(preposición)", egg->"huevo", prices->"precios" — NEVER She->"Ya", at->"precios", egg->"de", prices->"los".
1. Translate to NEUTRAL LATIN AMERICAN Spanish. Not European Spanish. Use "carro" not "coche", "computadora" not "ordenador", "ustedes" not "vosotros".
2. Use standard IPA for American English pronunciation. ${KYLE_IPA_ALPHA_RULE}
3. Include EVERY word in the story, including articles, prepositions, pronouns, etc.
3a. Include bracketed stage directions like "[Walks up to the door]" — annotate the words inside the brackets exactly as they appear, keeping the opening/closing brackets attached to their adjacent words ("[Walks", "door]"). Do NOT skip them.
3b. In dialogue lines like "Jane-Are you ready", the token "Jane-Are" is ONE word (speaker name hyphen-joined to the first word). Never split it at the hyphen.
4. Preserve punctuation attached to words (e.g. "jersey." not "jersey" and ".")
5. For proper nouns (Cristiano Ronaldo, Real Madrid, Barcelona, Adidas, Messi), set spanish_translation to the name itself and is_transparent to true.
6. For contractions (don't, can't, I'll), treat them as single words.
7. Mark cognates and easily understood words as transparent (is_transparent: true).
8. Be conservative with multi-word expressions. Only group words that form a recognized idiom, phrasal verb, or fixed expression. Do not group random adjacent words.

Here is the story to annotate:

${storyText}

Return ONLY the JSON object. No explanation, no markdown code fences, just the raw JSON.`;
}

// ── Chunk cache ────────────────────────────────────────────
// Each successfully annotated (and verified) chunk is cached on disk, keyed by
// sha256(model + chunk text). On a re-run (e.g. one chunk failed inspection
// last time), cached chunks are reused and ONLY the failed chunk is
// re-annotated — the whole dialogue is never re-run from scratch.
const CHUNK_CACHE_DIR = path.resolve(process.cwd(), ".annotate-cache");
const cacheKey = (chunkText: string) =>
  createHash("sha256").update(`${MODEL}\n${chunkText}`).digest("hex").slice(0, 32);

function readChunkCache(key: string): LLMResponse | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(CHUNK_CACHE_DIR, `${key}.json`), "utf8"));
  } catch {
    return null;
  }
}

function writeChunkCache(key: string, res: LLMResponse) {
  try {
    fs.mkdirSync(CHUNK_CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CHUNK_CACHE_DIR, `${key}.json`), JSON.stringify(res));
  } catch (err) {
    console.warn(`  (cache write failed, non-fatal: ${err})`);
  }
}

// Merge punctuation-only tokens into the previous word before verification.
// Cheap models sometimes emit punctuation as SEPARATE tokens ("Well", ",", "I").
// The reader tokenizes with punctuation attached ("Well,"), so any split
// punctuation shifts every later position and silently misaligns tooltips.
function mergePunctuationTokens(words: LLMWord[]): LLMWord[] {
  const merged: LLMWord[] = [];
  for (const w of words) {
    const hasContent = /[\p{L}\p{N}]/u.test(w.text);
    if (hasContent || merged.length === 0) {
      merged.push({ ...w });
    } else {
      merged[merged.length - 1].text += w.text;
    }
  }
  return merged;
}

const normToken = (s: string) =>
  s.replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();

// Per-chunk inspection: the merged annotation for THIS chunk must match the
// chunk's own word-bearing tokens 1:1. Chunk token streams concatenate to the
// full transcript stream (chunks are whole non-empty lines), so per-chunk
// verification composes into the global alignment guard.
function inspectChunk(annotation: LLMResponse, chunkText: string): string[] {
  const expectedTokens = chunkText.split(/\s+/).filter(Boolean);
  const expectedWords = expectedTokens.filter((t) => /[\p{L}\p{N}]/u.test(t));
  const gotWords = mergePunctuationTokens(annotation.words).map((w) => w.text);
  const diffs: string[] = [];
  const maxLen = Math.max(gotWords.length, expectedWords.length);
  for (let i = 0; i < maxLen; i++) {
    const got = gotWords[i] ?? "<missing>";
    const want = expectedWords[i] ?? "<missing>";
    if (normToken(got) !== normToken(want)) {
      diffs.push(`expected "${want}" got "${got}"`);
      if (diffs.length >= 5) break;
    }
  }
  if (gotWords.length !== expectedWords.length) {
    diffs.unshift(`count: expected ${expectedWords.length}, got ${gotWords.length}`);
  }
  return diffs;
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
        max_tokens: 64000,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenRouter API error ${response.status}:`, errorText);
    throw new Error(`OpenRouter API error ${response.status}`); // bisect/retry ladder handles it
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content in LLM response:", JSON.stringify(data, null, 2));
    throw new Error("No content in LLM response");
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
    // THROW (don't exit) so annotateWithLLM's retry ladder can split the chunk
    console.error(`Chunk ${chunkIndex}: failed to parse LLM response as JSON`);
    console.error("Parse error:", err);
    throw err;
  }
}

async function annotateWithLLM(storyText: string): Promise<LLMResponse> {
  // Split story into paragraphs and merge small ones into chunks so that
  // line-per-paragraph content (e.g. dialogues) doesn't burn one LLM call
  // per line. ~2500 chars ≈ 250 words ≈ 40K chars of annotation JSON —
  // safely inside the model's output limit.
  const MIN_CHUNK = 2500;
  const rawParas = storyText.split("\n").filter((p) => p.trim());
  const paragraphs: string[] = [];
  let buf = "";
  for (const p of rawParas) {
    if ((buf + "\n" + p).length <= MIN_CHUNK) {
      buf = buf ? buf + "\n" + p : p;
    } else {
      if (buf) paragraphs.push(buf);
      buf = p;
    }
  }
  if (buf) paragraphs.push(buf);
  console.log(`Splitting story into ${paragraphs.length} chunk(s) for processing...`);

  const allWords: LLMWord[] = [];
  const allExpressions: LLMExpression[] = [];
  let exprCounter = 0;

  // Chunk-level retry ladder: cache → LLM (with network retries) → per-chunk
  // inspection → bisect on failure. A chunk that keeps failing bisects down to
  // single lines; a single line that still fails throws after retries (it
  // never silently vanishes — that would shift every later word position).
  async function annotateChunk(text: string, depth: number, tag: string): Promise<LLMResponse> {
    const key = cacheKey(text);
    const cached = readChunkCache(key);
    if (cached) {
      console.log(`  ${tag}: cache hit (${cached.words.length} words)`);
      return cached;
    }

    const tryOnce = async (): Promise<LLMResponse> => {
      const res = await annotateChunkWithLLM(text, tag);
      // Punctuation-merge + inspect THIS chunk before accepting/caching it.
      const merged = mergePunctuationTokens(res.words);
      res.words = merged;
      const diffs = inspectChunk(res, text);
      if (diffs.length > 0) {
        throw new Error(`chunk inspection failed: ${diffs.slice(0, 3).join(" | ")}`);
      }
      writeChunkCache(key, res);
      return res;
    };

    try {
      return await tryOnce();
    } catch (err) {
      console.error(`  ${tag}: failed (${err instanceof Error ? err.message : err})`);
      const lines = text.split("\n").filter((l) => l.trim());
      // Single line: retry the LLM a couple of times before giving up hard.
      if (lines.length < 2) {
        for (let attempt = 2; attempt <= 3; attempt++) {
          console.error(`  ${tag}: retrying single line (attempt ${attempt}/3)`);
          try {
            return await tryOnce();
          } catch (err2) {
            console.error(`  ${tag}: attempt ${attempt} failed (${err2 instanceof Error ? err2.message : err2})`);
          }
        }
        console.error(`  ${tag}: single line failed 3 attempts — ABORTING (never drop a line)`);
        throw new Error(`Chunk "${tag}" is unannotatable after retries`);
      }
      const half = Math.ceil(lines.length / 2);
      console.log(`  ${tag}: bisecting (${lines.length} lines -> ${half}+${lines.length - half})`);
      const a = await annotateChunk(lines.slice(0, half).join("\n"), depth + 1, tag + "a");
      const b = await annotateChunk(lines.slice(half).join("\n"), depth + 1, tag + "b");
      return {
        words: [...a.words, ...b.words],
        expressions: [...(a.expressions ?? []), ...(b.expressions ?? [])],
      };
    }
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const chunkResult = await annotateChunk(paragraphs[i], 0, `chunk ${i}`);

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
  annotation: LLMResponse,
  wordSlots: number[]
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
    // wordSlots[i] = the token's index in the app's full token stream. Tokens
    // that are pure punctuation get no annotation row, so positions stay
    // aligned with the reader's token stream.
    const position = wordSlots[i] ?? i;

    const { data, error } = await supabase.from("words").insert({
      story_id: storyId,
      position,
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
      console.error(`Error inserting word "${w.text}" at position ${position}:`, error);
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
    .maybeSingle();

  if (error || !story) {
    console.error("Story not found:", error);
    process.exit(1);
  }

  console.log(`Story: ${story.title}`);
  console.log(`Body length: ${story.body_text.length} chars`);
  const kind = typeof story.kind === "string" ? story.kind : "story";
  const textForLlm =
    kind === "movie_talk"
      ? movieTalkSpokenText(story.body_text)
      : kind === "dialogue"
        ? dialogueSpokenText(story.body_text)
        : story.body_text;
  if (kind === "movie_talk") {
    console.log(
      "Movie Talk: skipping speaker names, *** dividers, and stage directions in the annotation stream."
    );
  }
  if (kind === "dialogue") {
    console.log(
      "Dialogue: skipping stage directions and speaker prefixes in the annotation stream."
    );
  }

  // Check if words already exist for this story
  const { data: existingWords } = await supabase
    .from("words")
    .select("id")
    .eq("story_id", story.id)
    .limit(1);

  if (existingWords && existingWords.length > 0) {
    console.log("Words already exist for this story. Deleting old words and expressions...");
    await supabase
      .from("words")
      .delete()
      .eq("story_id", story.id)
      .eq("source", "body");
    await supabase.from("expressions").delete().eq("story_id", story.id);
    console.log("Old data deleted.");
  }

  // Run the LLM annotation
  const annotation = await annotateWithLLM(textForLlm);

  // Cheap models sometimes emit punctuation as SEPARATE tokens — merge them
  // (per-chunk inspection already merged each cached chunk; this is a belt-and-
  // braces pass over the concatenated result).
  const merged = mergePunctuationTokens(annotation.words);
  if (merged.length !== annotation.words.length) {
    console.log(
      `Merged ${annotation.words.length - merged.length} punctuation-only token(s) into neighboring words.`
    );
  }
  annotation.words = merged;

  // Strict alignment guard: the annotation stream (word-bearing tokens only,
  // after punctuation merge) must match the transcript's word-bearing tokens
  // 1:1. Punctuation-only tokens in the transcript (a lone quote, an em dash)
  // get no annotation row, but the app's position numbering still counts them,
  // so rows are inserted at wordSlots indices. Any other mismatch means the
  // LLM split/dropped/merged real words, which offsets every word position and
  // silently kills tap-to-reveal. ABORT before inserting anything.
  const expectedTokens = textForLlm.split(/\s+/).filter(Boolean);
  const wordSlots: number[] = [];
  expectedTokens.forEach((t, idx) => {
    if (/[\p{L}\p{N}]/u.test(t)) wordSlots.push(idx);
  });
  const expectedWords = wordSlots.map((i) => expectedTokens[i]);
  const gotWords = annotation.words.map((w) => w.text);
  const norm = (s: string) =>
    s.replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();
  const diffs: string[] = [];
  const maxLen = Math.max(gotWords.length, expectedWords.length);
  for (let i = 0; i < maxLen; i++) {
    const got = gotWords[i] ?? "<missing>";
    const want = expectedWords[i] ?? "<missing>";
    if (norm(got) !== norm(want)) {
      diffs.push(
        `  pos ${wordSlots[i] ?? i}: expected "${want}" got "${got}"`
      );
      if (diffs.length >= 10) break;
    }
  }
  if (diffs.length > 0 || gotWords.length !== expectedWords.length) {
    console.error(
      `ALIGNMENT MISMATCH: transcript has ${expectedWords.length} word tokens ` +
        `(of ${expectedTokens.length} total) but annotation has ${gotWords.length} words. ` +
        `Not inserting anything. First differences:\n${diffs.join("\n")}`
    );
    process.exit(1);
  }
  console.log(
    `Alignment check passed: ${gotWords.length} words match the transcript 1:1 ` +
      `(${expectedTokens.length - expectedWords.length} punctuation-only token(s) skipped).`
  );

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
  const count = await insertAnnotation(story.id, annotation, wordSlots);

  console.log("");
  console.log(`Done! ${count} words and ${annotation.expressions?.length || 0} expressions inserted for "${story.title}".`);
  console.log("Next: dedupe-expressions.ts, then the word-audio pipeline.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});