import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentRef,
  ContentTag,
  ContentType,
  CoverageLevel,
  LanguageTag,
  TagType,
} from "@/types";

// ── Knowledge graph reads (Phase 4, slice 36) ──────────────
// Tags are catalog data: world-readable, written only by seed scripts.
//
// content_id is polymorphic and has no foreign key, so the table each tag row
// points at is decided here rather than by Postgres.

export const TAG_TYPES: readonly TagType[] = [
  "grammar",
  "vocabulary",
  "phonetic",
];

export const CONTENT_TYPES: readonly ContentType[] = [
  "story",
  "writing_prompt",
  "exam_prompt",
];

const TAG_TABLES: Record<TagType, string> = {
  grammar: "grammar_tags",
  vocabulary: "vocabulary_tags",
  phonetic: "phonetic_tags",
};

/** Table that owns content_id for a given content_type. */
const CONTENT_TABLES: Record<ContentType, string> = {
  story: "stories",
  writing_prompt: "writing_prompts",
  exam_prompt: "exam_prompts",
};

export function tagTableFor(tagType: TagType): string {
  return TAG_TABLES[tagType];
}

export function contentTableFor(contentType: ContentType): string {
  return CONTENT_TABLES[contentType];
}

export function isTagType(value: unknown): value is TagType {
  return typeof value === "string" && TAG_TYPES.includes(value as TagType);
}

export function isContentType(value: unknown): value is ContentType {
  return (
    typeof value === "string" && CONTENT_TYPES.includes(value as ContentType)
  );
}

type ContentTagRow = {
  id: string;
  content_type: string;
  content_id: string;
  tag_type: string;
  tag_id: string;
  coverage_level: string;
};

type TagRow = {
  id: string;
  name: string;
  display_name: string;
  prerequisites?: string[] | null;
};

function mapContentTag(row: ContentTagRow): ContentTag | null {
  if (!isContentType(row.content_type) || !isTagType(row.tag_type)) return null;

  return {
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    tagType: row.tag_type,
    tagId: row.tag_id,
    coverageLevel: row.coverage_level as CoverageLevel,
  };
}

function mapTag(tagType: TagType, row: TagRow): LanguageTag {
  return {
    id: row.id,
    tagType,
    name: row.name,
    displayName: row.display_name,
    prerequisites: row.prerequisites ?? [],
  };
}

/**
 * Every tag on one catalog item.
 * Returns an empty list on failure so a missing knowledge graph never breaks
 * the reader.
 */
export async function getTagsForContent(
  supabase: SupabaseClient,
  ref: ContentRef
): Promise<ContentTag[]> {
  const { data, error } = await supabase
    .from("content_tags")
    .select("id, content_type, content_id, tag_type, tag_id, coverage_level")
    .eq("content_type", ref.contentType)
    .eq("content_id", ref.contentId);

  if (error) {
    console.error("getTagsForContent failed:", error.message);
    return [];
  }

  return ((data ?? []) as ContentTagRow[])
    .map(mapContentTag)
    .filter((tag): tag is ContentTag => tag !== null);
}

/** Shorthand for the only content type Phase 4 tags. */
export async function getTagsForStory(
  supabase: SupabaseClient,
  storyId: string
): Promise<ContentTag[]> {
  return getTagsForContent(supabase, {
    contentType: "story",
    contentId: storyId,
  });
}

/**
 * "Which content covers present_perfect?"
 *
 * Returns content refs, not story ids, so writing prompts and exams answer the
 * same question later without a signature change.
 */
export async function getContentForTag(
  supabase: SupabaseClient,
  tagType: TagType,
  tagId: string,
  options: { contentType?: ContentType } = {}
): Promise<ContentRef[]> {
  let query = supabase
    .from("content_tags")
    .select("content_type, content_id")
    .eq("tag_type", tagType)
    .eq("tag_id", tagId);

  if (options.contentType) {
    query = query.eq("content_type", options.contentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getContentForTag failed:", error.message);
    return [];
  }

  const refs: ContentRef[] = [];
  for (const row of (data ?? []) as Pick<
    ContentTagRow,
    "content_type" | "content_id"
  >[]) {
    if (!isContentType(row.content_type)) continue;
    refs.push({ contentType: row.content_type, contentId: row.content_id });
  }
  return refs;
}

/** Same question by stable tag name, so callers don't need to hold a UUID. */
export async function getContentForTagName(
  supabase: SupabaseClient,
  tagType: TagType,
  tagName: string,
  options: { contentType?: ContentType } = {}
): Promise<ContentRef[]> {
  const tag = await getTagByName(supabase, tagType, tagName);
  if (!tag) return [];
  return getContentForTag(supabase, tagType, tag.id, options);
}

export async function getTagByName(
  supabase: SupabaseClient,
  tagType: TagType,
  name: string
): Promise<LanguageTag | null> {
  const { data, error } = await supabase
    .from(tagTableFor(tagType))
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    console.error("getTagByName failed:", error.message);
    return null;
  }
  if (!data) return null;

  return mapTag(tagType, data as TagRow);
}

/** Whole catalog for one tag type, ordered by display name. */
export async function listTags(
  supabase: SupabaseClient,
  tagType: TagType
): Promise<LanguageTag[]> {
  const { data, error } = await supabase
    .from(tagTableFor(tagType))
    .select("*")
    .order("display_name");

  if (error) {
    console.error("listTags failed:", error.message);
    return [];
  }

  return ((data ?? []) as TagRow[]).map((row) => mapTag(tagType, row));
}

/**
 * Tag id to tag for every tag type at once. Used by the dashboard and the
 * recommender to label evidence rows without one query per tag.
 */
export async function loadTagIndex(
  supabase: SupabaseClient
): Promise<Map<string, LanguageTag>> {
  const index = new Map<string, LanguageTag>();

  const results = await Promise.all(
    TAG_TYPES.map(async (tagType) => ({
      tagType,
      tags: await listTags(supabase, tagType),
    }))
  );

  for (const { tags } of results) {
    for (const tag of tags) {
      index.set(tag.id, tag);
    }
  }

  return index;
}

/**
 * Confirms a content_id really exists in the table for its content_type.
 * Postgres can't enforce this on a polymorphic column, so seed scripts call
 * this before writing.
 */
export async function contentExists(
  supabase: SupabaseClient,
  ref: ContentRef
): Promise<boolean> {
  const { data, error } = await supabase
    .from(contentTableFor(ref.contentType))
    .select("id")
    .eq("id", ref.contentId)
    .maybeSingle();

  if (error) {
    console.error("contentExists failed:", error.message);
    return false;
  }

  return data !== null;
}
