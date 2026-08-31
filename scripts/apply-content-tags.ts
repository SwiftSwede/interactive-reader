// Write reviewed ContentTag rows into the database (Phase 4, slice 36).
//
//   npx tsx scripts/apply-content-tags.ts
//   npx tsx scripts/apply-content-tags.ts --all   (skip the approved gate)
//
// Reads tools/knowledge-graph/proposed-content-tags.json. Only entries marked
// approved: true are written unless --all is passed. Validates content_id and
// tag_id first, because content_tags.content_id is polymorphic and Postgres
// cannot enforce it.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createAdminClient } from "../src/lib/supabase/admin";
import { contentExists, isTagType, tagTableFor } from "../src/lib/content-tags";
import type { ContentType, CoverageLevel, TagType } from "../src/types";

const INPUT_FILE = join(
  "tools",
  "knowledge-graph",
  "proposed-content-tags.json"
);

type ReviewFile = {
  stories: Array<{
    contentType: ContentType;
    contentId: string;
    slug: string;
    approved?: boolean;
    tags: Array<{
      tagType: string;
      tagName: string;
      coverageLevel: CoverageLevel;
    }>;
  }>;
};

async function main() {
  const applyAll = process.argv.includes("--all");
  const admin = createAdminClient();

  let review: ReviewFile;
  try {
    review = JSON.parse(readFileSync(INPUT_FILE, "utf8")) as ReviewFile;
  } catch {
    console.error(`Cannot read ${INPUT_FILE}.`);
    console.error("Run scripts/propose-content-tags.ts first.");
    process.exit(1);
  }

  const probe = await admin.from("content_tags").select("id").limit(1);
  if (probe.error) {
    console.error(
      "content_tags missing. Run supabase/schema-phase4a.sql in the SQL Editor first."
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  // Tag name to id, per tag type.
  const tagIds = new Map<string, string>();
  for (const tagType of ["grammar", "vocabulary", "phonetic"] as TagType[]) {
    const { data, error } = await admin
      .from(tagTableFor(tagType))
      .select("id, name");

    if (error) {
      console.error(`${tagTableFor(tagType)} read failed:`, error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      tagIds.set(`${tagType}:${row.name as string}`, row.id as string);
    }
  }

  if (tagIds.size === 0) {
    console.error("No tags found. Run scripts/seed-knowledge-tags.ts first.");
    process.exit(1);
  }

  const entries = review.stories.filter(
    (entry) => applyAll || entry.approved === true
  );

  if (entries.length === 0) {
    console.error(
      "Nothing approved. Set approved: true on reviewed stories, or pass --all."
    );
    process.exit(1);
  }

  let written = 0;
  let skipped = 0;

  for (const entry of entries) {
    const exists = await contentExists(admin, {
      contentType: entry.contentType,
      contentId: entry.contentId,
    });

    if (!exists) {
      console.warn(
        `  ${entry.slug}: content_id not found in ${entry.contentType} table, skipped`
      );
      skipped += entry.tags.length;
      continue;
    }

    const rows: Array<{
      content_type: string;
      content_id: string;
      tag_type: string;
      tag_id: string;
      coverage_level: string;
    }> = [];

    for (const tag of entry.tags) {
      if (!isTagType(tag.tagType)) {
        console.warn(`  ${entry.slug}: unknown tag_type "${tag.tagType}"`);
        skipped += 1;
        continue;
      }

      const tagId = tagIds.get(`${tag.tagType}:${tag.tagName}`);
      if (!tagId) {
        console.warn(
          `  ${entry.slug}: unknown ${tag.tagType} tag "${tag.tagName}"`
        );
        skipped += 1;
        continue;
      }

      rows.push({
        content_type: entry.contentType,
        content_id: entry.contentId,
        tag_type: tag.tagType,
        tag_id: tagId,
        coverage_level: tag.coverageLevel,
      });
    }

    if (rows.length === 0) continue;

    const { error } = await admin.from("content_tags").upsert(rows, {
      onConflict: "content_type,content_id,tag_type,tag_id",
    });

    if (error) {
      console.error(`  ${entry.slug}: upsert failed:`, error.message);
      process.exit(1);
    }

    written += rows.length;
    console.log(`  ${entry.slug}: ${rows.length} tags`);
  }

  console.log(`\nWrote ${written} content_tags rows. Skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
