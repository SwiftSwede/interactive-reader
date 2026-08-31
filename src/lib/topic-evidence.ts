import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentTag,
  EvidenceSourceType,
  EvidenceStatus,
  TagType,
  UserTopicEvidence,
} from "@/types";
import { getTagsForStory } from "./content-tags";
import { phoneticTagsFromIpa } from "./knowledge-tags";

// ── Topic evidence writer (Phase 4, slice 37) ──────────────
//
// One row per student per topic. The latest source overwrites, except that a
// struggle signal is sticky: passive exposure can never erase it.
//
// Every write derives user_id from the caller's session. Nothing here accepts a
// user id from a browser payload.

/** Activities where the learner produced language, not just read it. */
export const PRACTICE_SOURCES: readonly EvidenceSourceType[] = [
  "comprehension",
  "personal_response",
  "dictation",
  "pronunciation",
  "writing",
  "exam",
];

/** Passive exposure. May seed an empty row, never overwrite one. */
export const PASSIVE_SOURCES: readonly EvidenceSourceType[] = [
  "reading",
  "word_lookup",
];

/**
 * Only these may clear a sticky `needs_more_practice`. A personal response is
 * practice, but its signal is a whole-sentence AI correction, too coarse to
 * declare a specific topic recovered.
 */
export const CLEARING_SOURCES: readonly EvidenceSourceType[] = [
  "comprehension",
  "dictation",
  "pronunciation",
  "writing",
  "exam",
];

const STATUS_RANK: Record<EvidenceStatus, number> = {
  seen: 0,
  practiced: 1,
  needs_more_practice: 2,
};

export type EvidenceCandidate = {
  status: EvidenceStatus;
  sourceType: EvidenceSourceType;
};

export type ExistingEvidence = {
  status: EvidenceStatus;
};

/**
 * The status to store, or null when the candidate must not touch the row.
 *
 * Pure so the transition rule can be tested without a database. This is the
 * single definition of the sticky rule.
 */
export function nextEvidenceStatus(
  existing: ExistingEvidence | null,
  candidate: EvidenceCandidate
): EvidenceStatus | null {
  if (existing === null) return candidate.status;

  // Passive exposure never rewrites an existing judgement.
  if (PASSIVE_SOURCES.includes(candidate.sourceType)) return null;

  if (existing.status === "needs_more_practice") {
    if (candidate.status === "needs_more_practice") return null;
    return CLEARING_SOURCES.includes(candidate.sourceType)
      ? candidate.status
      : null;
  }

  // A struggle from any practice activity is always recorded.
  if (candidate.status === "needs_more_practice") return candidate.status;

  // Never downgrade practiced back to seen.
  return STATUS_RANK[candidate.status] >= STATUS_RANK[existing.status]
    ? candidate.status
    : null;
}

type EvidenceWrite = {
  tagType: TagType;
  tagId: string;
  status: EvidenceStatus;
};

export type RecordEvidenceInput = {
  userId: string;
  sourceType: EvidenceSourceType;
  sourceId?: string | null;
  evidenceDetail?: Record<string, unknown>;
  writes: EvidenceWrite[];
};

/**
 * Applies the sticky rule to each topic and upserts the survivors.
 *
 * Reads current state, decides, then writes. Two activities finishing in the
 * same instant could race, and the later write wins; that is acceptable here
 * because a struggle signal is written unconditionally, so the outcome of a
 * race is at worst a delayed clear, never a silently erased struggle.
 */
export async function recordTopicEvidence(
  supabase: SupabaseClient,
  input: RecordEvidenceInput
): Promise<{ written: number }> {
  const { userId, sourceType, writes } = input;
  if (writes.length === 0) return { written: 0 };

  const tagIds = [...new Set(writes.map((write) => write.tagId))];

  const { data: existingRows, error: readError } = await supabase
    .from("user_topic_evidence")
    .select("tag_type, tag_id, status")
    .eq("user_id", userId)
    .in("tag_id", tagIds);

  if (readError) {
    // A missing knowledge graph must never break the activity the student is
    // doing. Log and move on.
    console.error("recordTopicEvidence read failed:", readError.message);
    return { written: 0 };
  }

  const existingByKey = new Map<string, ExistingEvidence>();
  for (const row of existingRows ?? []) {
    existingByKey.set(`${row.tag_type}:${row.tag_id}`, {
      status: row.status as EvidenceStatus,
    });
  }

  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];
  const seenKeys = new Set<string>();

  for (const write of writes) {
    const key = `${write.tagType}:${write.tagId}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const status = nextEvidenceStatus(existingByKey.get(key) ?? null, {
      status: write.status,
      sourceType,
    });

    if (status === null) continue;

    rows.push({
      user_id: userId,
      tag_type: write.tagType,
      tag_id: write.tagId,
      status,
      source_type: sourceType,
      source_id: input.sourceId ?? null,
      evidence_detail: input.evidenceDetail ?? {},
      updated_at: now,
    });
  }

  if (rows.length === 0) return { written: 0 };

  const { error: writeError } = await supabase
    .from("user_topic_evidence")
    .upsert(rows, { onConflict: "user_id,tag_type,tag_id" });

  if (writeError) {
    console.error("recordTopicEvidence write failed:", writeError.message);
    return { written: 0 };
  }

  return { written: rows.length };
}

// ── Activity to topic mapping ──────────────────────────────
// Each activity only speaks to the tag types it can actually judge. Reading a
// story says nothing about the student's pronunciation of it.

/** Tag types an activity is allowed to write. */
const SOURCE_TAG_TYPES: Record<EvidenceSourceType, readonly TagType[]> = {
  reading: ["grammar", "vocabulary", "phonetic"],
  word_lookup: ["vocabulary"],
  comprehension: ["grammar", "vocabulary"],
  personal_response: ["grammar"],
  dictation: ["phonetic"],
  pronunciation: ["phonetic"],
  writing: ["grammar", "vocabulary"],
  exam: ["grammar", "vocabulary"],
};

export function tagTypesForSource(
  sourceType: EvidenceSourceType
): readonly TagType[] {
  return SOURCE_TAG_TYPES[sourceType];
}

/**
 * Turns a story's tags into the topics one activity may judge.
 * `focusTagIds` marks the topics the activity found weak; everything else it
 * touched gets the positive status.
 */
export function buildWritesFromTags(options: {
  tags: ContentTag[];
  sourceType: EvidenceSourceType;
  positiveStatus: EvidenceStatus;
  focusTagIds?: string[];
}): EvidenceWrite[] {
  const allowed = tagTypesForSource(options.sourceType);
  const focus = new Set(options.focusTagIds ?? []);

  return options.tags
    .filter((tag) => allowed.includes(tag.tagType))
    .map((tag) => ({
      tagType: tag.tagType,
      tagId: tag.tagId,
      status: focus.has(tag.tagId)
        ? ("needs_more_practice" as EvidenceStatus)
        : options.positiveStatus,
    }));
}

/**
 * Phonetic tag ids for the sounds Azure scored low, limited to tags the story
 * actually covers. Weak sounds outside the story's tags are ignored: the
 * knowledge graph should only claim what the content teaches.
 */
export function focusTagIdsForWeakSounds(
  tags: ContentTag[],
  weakSoundIpa: string[],
  tagNameById: Map<string, string>
): string[] {
  if (weakSoundIpa.length === 0) return [];

  const weakTagNames = new Set(phoneticTagsFromIpa(weakSoundIpa.join(" ")));
  if (weakTagNames.size === 0) return [];

  return tags
    .filter((tag) => tag.tagType === "phonetic")
    .filter((tag) => {
      const name = tagNameById.get(tag.tagId);
      return name !== undefined && weakTagNames.has(name);
    })
    .map((tag) => tag.tagId);
}

/**
 * Records evidence for one story activity.
 * Safe to call from any server action: it resolves the story's tags itself and
 * returns quietly when the story has none yet.
 */
export async function recordStoryActivityEvidence(
  supabase: SupabaseClient,
  input: {
    userId: string;
    storyId: string;
    sourceType: EvidenceSourceType;
    positiveStatus: EvidenceStatus;
    sourceId?: string | null;
    focusTagIds?: string[];
    evidenceDetail?: Record<string, unknown>;
  }
): Promise<{ written: number }> {
  const tags = await getTagsForStory(supabase, input.storyId);
  if (tags.length === 0) return { written: 0 };

  const writes = buildWritesFromTags({
    tags,
    sourceType: input.sourceType,
    positiveStatus: input.positiveStatus,
    focusTagIds: input.focusTagIds,
  });

  return recordTopicEvidence(supabase, {
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    evidenceDetail: input.evidenceDetail,
    writes,
  });
}

/** Every evidence row for one student, newest first. */
export async function getEvidenceForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<UserTopicEvidence[]> {
  const { data, error } = await supabase
    .from("user_topic_evidence")
    .select(
      "id, user_id, tag_type, tag_id, status, source_type, source_id, evidence_detail, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getEvidenceForUser failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    tagType: row.tag_type as TagType,
    tagId: row.tag_id as string,
    status: row.status as EvidenceStatus,
    sourceType: row.source_type as EvidenceSourceType,
    sourceId: (row.source_id as string | null) ?? null,
    evidenceDetail: (row.evidence_detail as Record<string, unknown>) ?? {},
    updatedAt: row.updated_at as string,
  }));
}
