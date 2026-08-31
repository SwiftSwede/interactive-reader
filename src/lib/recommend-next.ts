import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentRef,
  ContentType,
  CoverageLevel,
  EvidenceStatus,
  StoryLevel,
  TagType,
} from "@/types";
import { getEvidenceForUser } from "./topic-evidence";

// ── N+1 activity routing (Phase 4, slice 38) ───────────────
//
// Returns { contentType, contentId }, never a bare story id. Phase 4 only
// puts stories in the pool. Writing prompts and exams join later by adding
// rows to content_tags, not by changing this signature.
//
// The rule is boring on purpose:
//   1. Reuse language the student has already seen or practiced.
//   2. Allow one or two new or struggling topics, not a pile of both.
//   3. If a phonetic topic is sticky, prefer a story that reinforces it.

export const MAX_NEW_OR_STRUGGLE = 2;

export type RecommendableItem = {
  contentType: ContentType;
  contentId: string;
  level: StoryLevel;
  title: string;
  slug: string;
  isFree: boolean;
  tags: Array<{
    tagId: string;
    tagType: TagType;
    coverageLevel: CoverageLevel;
  }>;
};

export type RecommendInput = {
  items: RecommendableItem[];
  completedContentIds: Set<string>;
  evidenceByTagId: Map<string, EvidenceStatus>;
  preferredLevel: StoryLevel | null;
};

export type ScoredRecommendation = {
  ref: ContentRef;
  score: number;
  newOrStruggle: number;
  familiar: number;
};

const LEVELS: readonly StoryLevel[] = [
  "beginner",
  "pre-intermediate",
  "intermediate",
];

export function isStoryLevel(value: unknown): value is StoryLevel {
  return typeof value === "string" && LEVELS.includes(value as StoryLevel);
}

function isFamiliar(status: EvidenceStatus | undefined): boolean {
  return status === "seen" || status === "practiced";
}

function stickyPhoneticIds(
  evidenceByTagId: Map<string, EvidenceStatus>,
  items: RecommendableItem[]
): Set<string> {
  const phoneticIds = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) {
      if (tag.tagType === "phonetic") phoneticIds.add(tag.tagId);
    }
  }

  const sticky = new Set<string>();
  for (const [tagId, status] of evidenceByTagId) {
    if (status === "needs_more_practice" && phoneticIds.has(tagId)) {
      sticky.add(tagId);
    }
  }
  return sticky;
}

function scoreItem(
  item: RecommendableItem,
  evidenceByTagId: Map<string, EvidenceStatus>,
  sticky: Set<string>
): ScoredRecommendation {
  let familiar = 0;
  let newOrStruggle = 0;

  for (const tag of item.tags) {
    if (isFamiliar(evidenceByTagId.get(tag.tagId))) {
      familiar += 1;
    } else {
      newOrStruggle += 1;
    }
  }

  const tagCount = item.tags.length;
  let score = tagCount === 0 ? 0 : familiar / tagCount;

  // Empty-evidence first pick: the free story is the one they already know.
  if (evidenceByTagId.size === 0 && item.isFree) {
    score += 0.15;
  }

  for (const tag of item.tags) {
    if (!sticky.has(tag.tagId)) continue;
    score += 0.25;
    if (tag.coverageLevel === "reinforced") score += 0.15;
  }

  return {
    ref: { contentType: item.contentType, contentId: item.contentId },
    score,
    newOrStruggle,
    familiar,
  };
}

/**
 * Picks the next activity from an in-memory pool.
 * Pure so the N+1 rule can be tested without Azure, Supabase, or a browser.
 */
export function pickNextActivity(
  input: RecommendInput
): ContentRef | null {
  const remaining = input.items.filter(
    (item) => !input.completedContentIds.has(item.contentId)
  );
  if (remaining.length === 0) return null;

  const leveled = input.preferredLevel
    ? remaining.filter((item) => item.level === input.preferredLevel)
    : remaining;
  const pool = leveled.length > 0 ? leveled : remaining;

  const sticky = stickyPhoneticIds(input.evidenceByTagId, pool);
  const scored = pool.map((item) =>
    scoreItem(item, input.evidenceByTagId, sticky)
  );

  const withinBudget = scored.filter(
    (row) => row.newOrStruggle <= MAX_NEW_OR_STRUGGLE
  );
  const candidates = withinBudget.length > 0 ? withinBudget : scored;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.newOrStruggle !== b.newOrStruggle) {
      return a.newOrStruggle - b.newOrStruggle;
    }
    return a.ref.contentId.localeCompare(b.ref.contentId);
  });

  return candidates[0]?.ref ?? null;
}

type StoryPoolRow = {
  id: string;
  title: string;
  slug: string;
  level: string;
  is_free: boolean;
};

type ContentTagPoolRow = {
  content_id: string;
  tag_type: string;
  tag_id: string;
  coverage_level: string;
};

/**
 * Loads the Phase 4 pool (stories only), the student's completed reading, and
 * their current topic status, then returns one recommendation.
 */
export async function recommendNextActivity(
  supabase: SupabaseClient,
  userId: string,
  preferredLevel: StoryLevel | null
): Promise<ContentRef | null> {
  const [{ data: stories, error: storyError }, { data: tags, error: tagError }] =
    await Promise.all([
      supabase
        .from("stories")
        .select("id, title, slug, level, is_free")
        .order("title"),
      supabase
        .from("content_tags")
        .select("content_id, tag_type, tag_id, coverage_level")
        .eq("content_type", "story"),
    ]);

  if (storyError) {
    console.error("recommendNextActivity stories failed:", storyError.message);
    return null;
  }
  if (tagError) {
    console.error("recommendNextActivity tags failed:", tagError.message);
    return null;
  }

  const tagsByStory = new Map<string, RecommendableItem["tags"]>();
  for (const row of (tags ?? []) as ContentTagPoolRow[]) {
    const list = tagsByStory.get(row.content_id) ?? [];
    list.push({
      tagId: row.tag_id,
      tagType: row.tag_type as TagType,
      coverageLevel: row.coverage_level as CoverageLevel,
    });
    tagsByStory.set(row.content_id, list);
  }

  const items: RecommendableItem[] = ((stories ?? []) as StoryPoolRow[])
    .filter((story) => isStoryLevel(story.level))
    .map((story) => ({
      contentType: "story" as const,
      contentId: story.id,
      level: story.level as StoryLevel,
      title: story.title,
      slug: story.slug,
      isFree: story.is_free,
      tags: tagsByStory.get(story.id) ?? [],
    }));

  const [{ data: progress }, evidence] = await Promise.all([
    supabase
      .from("user_progress")
      .select("story_id")
      .eq("user_id", userId)
      .eq("status", "completed"),
    getEvidenceForUser(supabase, userId),
  ]);

  const completedContentIds = new Set(
    (progress ?? []).map((row) => row.story_id as string)
  );
  const evidenceByTagId = new Map<string, EvidenceStatus>();
  for (const row of evidence) {
    evidenceByTagId.set(row.tagId, row.status);
  }

  return pickNextActivity({
    items,
    completedContentIds,
    evidenceByTagId,
    preferredLevel,
  });
}

/** Turns a content ref into a path the student can open. */
export async function resolveContentHref(
  supabase: SupabaseClient,
  ref: ContentRef
): Promise<{ href: string; title: string } | null> {
  if (ref.contentType === "story") {
    const { data, error } = await supabase
      .from("stories")
      .select("slug, title")
      .eq("id", ref.contentId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      href: `/story/${data.slug as string}`,
      title: data.title as string,
    };
  }

  // Writing and exam resolvers land when those content types enter the pool.
  return null;
}
