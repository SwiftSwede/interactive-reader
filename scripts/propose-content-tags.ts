// Propose ContentTag rows for every story in the database (Phase 4, slice 36).
//
//   npx tsx scripts/propose-content-tags.ts
//
// Writes tools/knowledge-graph/proposed-content-tags.json for Kyle to review.
// It never touches content_tags. Run scripts/apply-content-tags.ts after review.
//
// Proposals are deterministic, not LLM-guessed: grammar comes from the tense
// labels the difficulty evaluator already extracted, phonetics from the story's
// Práctica Coral IPA, vocabulary from keyword counts. Anything the controlled
// vocabulary does not recognize is reported as unmapped instead of invented.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createAdminClient } from "../src/lib/supabase/admin";
import {
  grammarTagFromLabel,
  phoneticTagsFromFocusType,
  phoneticTagsFromIpa,
  proposeVocabularyTags,
} from "../src/lib/knowledge-tags";
import type { CoverageLevel } from "../src/types";

const RESULTS_DIR = join("tools", "difficulty-evaluator", "results");
const OUTPUT_DIR = join("tools", "knowledge-graph");
const OUTPUT_FILE = join(OUTPUT_DIR, "proposed-content-tags.json");

/**
 * A structure used by most stories at a level is familiar language; a rare one
 * is the new element. That corpus frequency is what makes N+1 routing possible.
 */
const REINFORCED_FREQUENCY = 0.6;

type StoryRecord = {
  id: string;
  slug: string;
  title: string;
  level: string;
  body_text: string;
};

type DrillRecord = {
  story_id: string;
  focus_type: string | null;
  practica_coral_ipa: string | null;
};

type ProposedTag = {
  tagType: "grammar" | "vocabulary" | "phonetic";
  tagName: string;
  coverageLevel: CoverageLevel;
  why: string;
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Evaluator results are keyed by story title, not slug. Match on both. */
function loadEvaluatorIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();

  let files: string[] = [];
  try {
    files = readdirSync(RESULTS_DIR).filter((file) => file.endsWith(".json"));
  } catch {
    console.warn(`No evaluator results at ${RESULTS_DIR}, skipping grammar.`);
    return index;
  }

  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    } catch {
      console.warn(`  unreadable evaluator file: ${file}`);
      continue;
    }

    const record = parsed as {
      story_title?: string;
      rubric?: {
        dimensions?: {
          grammatical_complexity?: { tenses_found?: string[] };
        };
      };
    };

    const tenses =
      record.rubric?.dimensions?.grammatical_complexity?.tenses_found ?? [];
    if (tenses.length === 0) continue;

    const titleKey = normalizeKey(record.story_title ?? "");
    const fileKey = normalizeKey(file.replace(/\.json$/, ""));

    if (titleKey) index.set(titleKey, tenses);
    if (fileKey && !index.has(fileKey)) index.set(fileKey, tenses);
  }

  return index;
}

async function main() {
  const admin = createAdminClient();

  const { data: storyRows, error: storyError } = await admin
    .from("stories")
    .select("id, slug, title, level, body_text")
    .order("title");

  if (storyError) {
    console.error("stories read failed:", storyError.message);
    process.exit(1);
  }

  const stories = (storyRows ?? []) as StoryRecord[];
  if (stories.length === 0) {
    console.error("No stories in the database. Seed a story first.");
    process.exit(1);
  }

  const { data: drillRows } = await admin
    .from("pronunciation_drills")
    .select("story_id, focus_type, practica_coral_ipa");

  const drillByStory = new Map<string, DrillRecord>(
    ((drillRows ?? []) as DrillRecord[]).map((row) => [row.story_id, row])
  );

  const evaluatorIndex = loadEvaluatorIndex();
  console.log(`Loaded ${evaluatorIndex.size} evaluator entries.`);

  // Pass 1: collect raw grammar tags per story so frequency is known before
  // coverage_level is assigned.
  const grammarByStory = new Map<string, Set<string>>();
  const unmappedLabels = new Map<string, number>();
  const storiesWithoutEvaluator: string[] = [];

  for (const story of stories) {
    const tenses =
      evaluatorIndex.get(normalizeKey(story.title)) ??
      evaluatorIndex.get(normalizeKey(story.slug)) ??
      null;

    if (!tenses) {
      storiesWithoutEvaluator.push(story.slug);
      grammarByStory.set(story.id, new Set());
      continue;
    }

    const names = new Set<string>();
    for (const label of tenses) {
      const name = grammarTagFromLabel(label);
      if (name) {
        names.add(name);
      } else {
        const key = label.split("(")[0].trim().toLowerCase();
        unmappedLabels.set(key, (unmappedLabels.get(key) ?? 0) + 1);
      }
    }
    grammarByStory.set(story.id, names);
  }

  // Corpus frequency per level: what "familiar" means depends on the level a
  // student is reading at.
  const levelTotals = new Map<string, number>();
  const levelTagCounts = new Map<string, Map<string, number>>();

  for (const story of stories) {
    levelTotals.set(story.level, (levelTotals.get(story.level) ?? 0) + 1);
    const counts =
      levelTagCounts.get(story.level) ?? new Map<string, number>();
    for (const name of grammarByStory.get(story.id) ?? []) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    levelTagCounts.set(story.level, counts);
  }

  function grammarCoverage(level: string, tagName: string): CoverageLevel {
    const total = levelTotals.get(level) ?? 0;
    if (total === 0) return "introduced";
    const count = levelTagCounts.get(level)?.get(tagName) ?? 0;
    return count / total >= REINFORCED_FREQUENCY ? "reinforced" : "introduced";
  }

  // Pass 2: build proposals.
  const proposals = stories.map((story) => {
    const tags: ProposedTag[] = [];

    for (const tagName of [...(grammarByStory.get(story.id) ?? [])].sort()) {
      const coverageLevel = grammarCoverage(story.level, tagName);
      tags.push({
        tagType: "grammar",
        tagName,
        coverageLevel,
        why:
          coverageLevel === "reinforced"
            ? "evaluator tense label, common at this level"
            : "evaluator tense label, uncommon at this level",
      });
    }

    for (const { name, hits } of proposeVocabularyTags(story.body_text ?? "")) {
      tags.push({
        tagType: "vocabulary",
        tagName: name,
        coverageLevel: "reinforced",
        why: `${hits} keyword hits in the story text`,
      });
    }

    const drill = drillByStory.get(story.id);
    if (drill) {
      const focusTags = phoneticTagsFromFocusType(drill.focus_type ?? "");
      for (const tagName of focusTags) {
        tags.push({
          tagType: "phonetic",
          tagName,
          coverageLevel: "introduced",
          why: `drill focus_type "${drill.focus_type}"`,
        });
      }

      const ipaTags = phoneticTagsFromIpa(drill.practica_coral_ipa ?? "");
      for (const tagName of ipaTags) {
        if (focusTags.includes(tagName)) continue;
        tags.push({
          tagType: "phonetic",
          tagName,
          coverageLevel: "introduced",
          why: "sound appears in the Práctica Coral IPA",
        });
      }
    }

    return {
      contentType: "story" as const,
      contentId: story.id,
      slug: story.slug,
      title: story.title,
      level: story.level,
      approved: false,
      tags,
    };
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Review each entry, then set approved: true. scripts/apply-content-tags.ts only writes approved entries.",
        reinforcedFrequency: REINFORCED_FREQUENCY,
        stories: proposals,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const tagCount = proposals.reduce((sum, entry) => sum + entry.tags.length, 0);
  console.log(`\nWrote ${OUTPUT_FILE}`);
  console.log(`  ${proposals.length} stories, ${tagCount} proposed tags`);

  if (storiesWithoutEvaluator.length > 0) {
    console.log(
      `  no evaluator match (no grammar tags): ${storiesWithoutEvaluator.join(", ")}`
    );
  }

  if (unmappedLabels.size > 0) {
    console.log("\nUnmapped tense labels (add to GRAMMAR_LABEL_MAP if wanted):");
    for (const [label, count] of [...unmappedLabels].sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${count}x  ${label}`);
    }
  }

  console.log("\nNext: review the file, set approved: true, then");
  console.log("  npx tsx scripts/apply-content-tags.ts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
