import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  GRAMMAR_TAG_SEEDS,
  PHONETIC_TAG_SEEDS,
  VOCABULARY_KEYWORDS,
  VOCABULARY_TAG_SEEDS,
  grammarTagFromLabel,
  phoneticTagsFromFocusType,
  phoneticTagsFromIpa,
  proposeVocabularyTags,
} from "./knowledge-tags";

const RESULTS_DIR = join("tools", "difficulty-evaluator", "results");

test("grammar labels normalize to controlled tag names", () => {
  assert.equal(grammarTagFromLabel("past simple"), "past_simple");
  assert.equal(
    grammarTagFromLabel("past perfect (she'd seen, she'd made)"),
    "past_perfect"
  );
  assert.equal(grammarTagFromLabel("  Present Perfect  "), "present_perfect");
  assert.equal(grammarTagFromLabel("reported speech elements"), "reported_speech");
});

test("unknown grammar labels return null rather than inventing a tag", () => {
  assert.equal(grammarTagFromLabel("interpretive subjunctive mood"), null);
  assert.equal(grammarTagFromLabel(""), null);
});

test("every mapped grammar name exists in the seed catalog", () => {
  const seedNames = new Set(GRAMMAR_TAG_SEEDS.map((seed) => seed.name));

  let mapped = 0;
  let unmapped = 0;

  for (const file of readdirSync(RESULTS_DIR).filter((name) =>
    name.endsWith(".json")
  )) {
    const parsed = JSON.parse(
      readFileSync(join(RESULTS_DIR, file), "utf8")
    ) as {
      rubric?: {
        dimensions?: { grammatical_complexity?: { tenses_found?: string[] } };
      };
    };

    for (const label of parsed.rubric?.dimensions?.grammatical_complexity
      ?.tenses_found ?? []) {
      const name = grammarTagFromLabel(label);
      if (name === null) {
        unmapped += 1;
        continue;
      }
      mapped += 1;
      assert.ok(seedNames.has(name), `mapped name not seeded: ${name}`);
    }
  }

  // The corpus is the real input to slice 36. If coverage drops below this the
  // label map has drifted away from the evaluator output.
  const coverage = mapped / (mapped + unmapped);
  assert.ok(mapped > 500, `expected a large corpus, mapped ${mapped}`);
  assert.ok(
    coverage > 0.9,
    `label coverage too low: ${(coverage * 100).toFixed(1)}%`
  );
});

test("grammar prerequisites only reference seeded tags", () => {
  const seedNames = new Set(GRAMMAR_TAG_SEEDS.map((seed) => seed.name));
  for (const seed of GRAMMAR_TAG_SEEDS) {
    for (const prerequisite of seed.prerequisites ?? []) {
      assert.ok(
        seedNames.has(prerequisite),
        `${seed.name} requires unseeded ${prerequisite}`
      );
      assert.notEqual(prerequisite, seed.name, `${seed.name} requires itself`);
    }
  }
});

test("tag names are unique within each catalog", () => {
  for (const seeds of [
    GRAMMAR_TAG_SEEDS,
    VOCABULARY_TAG_SEEDS,
    PHONETIC_TAG_SEEDS,
  ]) {
    const names = seeds.map((seed) => seed.name);
    assert.equal(new Set(names).size, names.length);
  }
});

test("IPA multi-character sequences win over their parts", () => {
  const tags = phoneticTagsFromIpa("tʃɪp");
  assert.ok(tags.includes("ch_sound"));
  // The t and ʃ were consumed by tʃ, so no stray sh_sound.
  assert.ok(!tags.includes("sh_sound"));

  const jTags = phoneticTagsFromIpa("dʒʌst");
  assert.ok(jTags.includes("j_sound"));
  assert.ok(jTags.includes("short_u"));
});

test("IPA proposal finds Kyle's teaching targets and ignores the rest", () => {
  const tags = phoneticTagsFromIpa("aɪ ˈwɑnt ðə θɪŋ");
  assert.ok(tags.includes("listerine_vowel"));
  assert.ok(tags.includes("th_voiced"));
  assert.ok(tags.includes("th_unvoiced"));
  assert.ok(tags.includes("schwa_reduction"));
  assert.ok(tags.includes("ng_ending"));
  assert.deepEqual(phoneticTagsFromIpa(""), []);
});

test("every IPA and focus proposal is a seeded phonetic tag", () => {
  const seeded = new Set(PHONETIC_TAG_SEEDS.map((seed) => seed.name));
  const sample =
    "ɪiːɑʌæɛʊɝɹvzʃʒθðəŋhj tʃ dʒ aɪ ɔɪ aʊ ptkbdgfsmnl";

  for (const tag of phoneticTagsFromIpa(sample)) {
    assert.ok(seeded.has(tag), `unseeded phonetic tag: ${tag}`);
  }
  for (const focus of ["ed-s-rules", "emphasized-syllable", "sounds"]) {
    for (const tag of phoneticTagsFromFocusType(focus)) {
      assert.ok(seeded.has(tag), `unseeded phonetic tag: ${tag}`);
    }
  }
  assert.deepEqual(phoneticTagsFromFocusType("sounds"), []);
});

test("vocabulary topics need repeated evidence", () => {
  const soccer =
    "The soccer game was close. My team lost the match. The player scored a goal.";
  assert.deepEqual(
    proposeVocabularyTags(soccer, 4).map((tag) => tag.name),
    ["sports"]
  );

  // One mention is not a topic.
  assert.deepEqual(proposeVocabularyTags("I saw one goal.", 4), []);
});

test("vocabulary keywords respect word boundaries", () => {
  // "great" must not count as "eat", "carefully" must not count as "car".
  assert.deepEqual(proposeVocabularyTags("great great great great", 1), []);
  assert.deepEqual(proposeVocabularyTags("carefully carefully", 1), []);

  // Plurals and simple inflections still count.
  const hits = proposeVocabularyTags("goals goal scored scoring", 1);
  assert.ok(hits.some((tag) => tag.name === "sports"));
});

test("every vocabulary keyword group is a seeded tag", () => {
  const seeded = new Set(VOCABULARY_TAG_SEEDS.map((seed) => seed.name));
  for (const name of Object.keys(VOCABULARY_KEYWORDS)) {
    assert.ok(seeded.has(name), `unseeded vocabulary tag: ${name}`);
  }
});
