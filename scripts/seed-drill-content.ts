// Seed authored drill items from docs/drill-content/*.md.
//
//   npx tsx scripts/seed-drill-content.ts
//
// Idempotent: teach by (tag_id, format); cloze/translation by stem/prompt.
// Tags must already exist (run seed-knowledge-tags.ts first). Never invents a tag.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import { tagTableFor } from "../src/lib/content-tags";
import {
  EXPECTED_SEED_COUNTS,
  matchExistingDrillItem,
  parseDrillMarkdown,
  teachSeedContent,
  type ParsedCloze,
  type ParsedDrillFile,
  type ParsedTranslation,
} from "../src/lib/parse-drill-content";

type ExistingRow = {
  id: string;
  format: string;
  content: Record<string, unknown> | null;
};

type SeedPayload = {
  tag_type: string;
  tag_id: string;
  format: "teach" | "cloze" | "translation";
  level: string;
  content: Record<string, unknown>;
  active: boolean;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function contentEquals(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  return stableJson(left) === stableJson(right);
}

function clozeContent(item: ParsedCloze, sourceUrl: string): Record<string, unknown> {
  const content: Record<string, unknown> = {
    text: item.text,
    answer: item.answer,
    sourceUrl,
  };
  if (item.mcq) content.mcq = item.mcq;
  if (item.note) content.note = item.note;
  return content;
}

function translationContent(
  item: ParsedTranslation,
  sourceUrl: string,
): Record<string, unknown> {
  const content: Record<string, unknown> = {
    prompt: item.prompt,
    answer: item.answer,
    sourceUrl,
  };
  if (item.note) content.note = item.note;
  return content;
}

function payloadsForFile(
  parsed: ParsedDrillFile,
  tagId: string,
): SeedPayload[] {
  const sourceUrl = parsed.teach.sourceUrl;
  const teachContent = teachSeedContent(parsed.teach);

  const rows: SeedPayload[] = [
    {
      tag_type: parsed.tagType,
      tag_id: tagId,
      format: "teach",
      level: "int",
      content: teachContent,
      active: true,
    },
  ];

  for (const cloze of parsed.clozes) {
    rows.push({
      tag_type: parsed.tagType,
      tag_id: tagId,
      format: "cloze",
      level: cloze.level,
      content: clozeContent(cloze, sourceUrl),
      active: true,
    });
  }

  for (const translation of parsed.translations) {
    rows.push({
      tag_type: parsed.tagType,
      tag_id: tagId,
      format: "translation",
      level: translation.level,
      content: translationContent(translation, sourceUrl),
      active: true,
    });
  }

  return rows;
}

function findExisting(
  existing: ExistingRow[],
  payload: SeedPayload,
): ExistingRow | undefined {
  return matchExistingDrillItem(existing, payload);
}

async function resolveTagId(
  admin: ReturnType<typeof createAdminClient>,
  parsed: ParsedDrillFile,
  fileLabel: string,
): Promise<string> {
  const table = tagTableFor(parsed.tagType);
  const { data, error } = await admin
    .from(table)
    .select("id, name")
    .eq("name", parsed.tagName)
    .maybeSingle();

  if (error) {
    console.error(`${fileLabel}: ${table} lookup failed:`, error.message);
    process.exit(1);
  }
  if (!data) {
    console.error(
      `${fileLabel}: tag "${parsed.tagName}" not found in ${table}. Run npx tsx scripts/seed-knowledge-tags.ts first. Never invents a tag.`,
    );
    process.exit(1);
  }
  return data.id as string;
}

async function main() {
  const admin = createAdminClient();
  const dir = path.join(process.cwd(), "docs/drill-content");
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (names.length === 0) {
    console.error("No markdown files in docs/drill-content/");
    process.exit(1);
  }

  const totals = { teach: 0, cloze: 0, translation: 0 };
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const name of names) {
    const fileLabel = name;
    const markdown = await readFile(path.join(dir, name), "utf8");
    const parsed = parseDrillMarkdown(markdown, fileLabel);
    const tagId = await resolveTagId(admin, parsed, fileLabel);
    const payloads = payloadsForFile(parsed, tagId);

    totals.teach += payloads.filter((row) => row.format === "teach").length;
    totals.cloze += payloads.filter((row) => row.format === "cloze").length;
    totals.translation += payloads.filter((row) => row.format === "translation")
      .length;

    console.log(
      `${name}: ${parsed.teach ? 1 : 0} teach, ${parsed.clozes.length} cloze, ${parsed.translations.length} translation`,
    );

    const { data: existingRows, error: existingError } = await admin
      .from("drill_items")
      .select("id, format, content")
      .eq("tag_id", tagId);

    if (existingError) {
      console.error(`${fileLabel}: existing-row lookup failed:`, existingError.message);
      process.exit(1);
    }

    const existing = (existingRows ?? []) as ExistingRow[];

    for (const payload of payloads) {
      const match = findExisting(existing, payload);
      if (!match) {
        const { error } = await admin.from("drill_items").insert(payload);
        if (error) {
          console.error(`${fileLabel}: insert failed:`, error.message);
          process.exit(1);
        }
        inserted += 1;
        continue;
      }
      if (contentEquals(match.content ?? {}, payload.content)) {
        unchanged += 1;
        continue;
      }
      const { error } = await admin
        .from("drill_items")
        .update({
          content: payload.content,
          level: payload.level,
          tag_type: payload.tag_type,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (error) {
        console.error(`${fileLabel}: update failed:`, error.message);
        process.exit(1);
      }
      updated += 1;
    }
  }

  console.log(
    `Total: ${totals.teach} teach, ${totals.cloze} cloze, ${totals.translation} translation`,
  );
  console.log(`Inserted: ${inserted}  Updated: ${updated}  Unchanged: ${unchanged}`);

  if (
    totals.teach !== EXPECTED_SEED_COUNTS.teach ||
    totals.cloze !== EXPECTED_SEED_COUNTS.cloze ||
    totals.translation !== EXPECTED_SEED_COUNTS.translation
  ) {
    console.error("Count mismatch vs the content files (the spec):");
    console.error(
      `  expected ${EXPECTED_SEED_COUNTS.teach} teach + ${EXPECTED_SEED_COUNTS.cloze} cloze + ${EXPECTED_SEED_COUNTS.translation} translation`,
    );
    console.error(
      `  parsed   ${totals.teach} teach + ${totals.cloze} cloze + ${totals.translation} translation`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
