import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentTag,
  EvidenceSourceType,
  EvidenceStatus,
  TagType,
  UserTopicEvidence,
} from "@/types";
import { AppError } from "@/lib/errors";
import { getTagsForStory, tagTableFor } from "./content-tags";
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
  "teacher_observation",
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
  "teacher_observation",
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
  // Teacher judgment overwrites every previous status, including a sticky flag.
  if (candidate.sourceType === "teacher_observation") return candidate.status;

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
  teacher_observation: ["grammar", "vocabulary", "phonetic", "error"],
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

const OBSERVATION_FAILED =
  "No pude guardar la observación. Inténtalo de nuevo.";

export type TeacherObservationAction = "flag" | "clear";

export type TeacherObservationInput = {
  studentId: string;
  sessionId?: string | null;
  observations: Array<{
    tagType: TagType;
    tagName: string;
    action: TeacherObservationAction;
  }>;
  note?: string;
};

export type TeacherObservationResult = {
  written: number;
  flags: string[];
  clears: string[];
  note: string;
};

/**
 * Writes teacher judgment for one student.
 *
 * The caller must already have checked that this teacher owns the student
 * (and the session, when there is one). Unknown tag names are not errors:
 * they drop out of the evidence rows and are appended to the note.
 */
export async function recordTeacherObservation(
  supabase: SupabaseClient,
  input: TeacherObservationInput
): Promise<TeacherObservationResult> {
  const byKey = new Map<
    string,
    { tagType: TagType; tagName: string; action: TeacherObservationAction }
  >();
  for (const observation of input.observations) {
    const tagName = observation.tagName.trim();
    if (!tagName) continue;
    byKey.set(`${observation.tagType}:${tagName}`, {
      tagType: observation.tagType,
      tagName,
      action: observation.action,
    });
  }

  const resolved = await Promise.all(
    [...byKey.values()].map(async (observation) => {
      const { data, error } = await supabase
        .from(tagTableFor(observation.tagType))
        .select("id")
        .eq("name", observation.tagName)
        .maybeSingle();

      if (error) {
        console.error("recordTeacherObservation tag lookup failed:", error.message);
        throw new AppError(OBSERVATION_FAILED, "TAG_LOOKUP_FAILED", 500);
      }

      return {
        ...observation,
        tagId: (data?.id as string | undefined) ?? null,
      };
    })
  );

  const flags: string[] = [];
  const clears: string[] = [];
  const misses: string[] = [];
  const writes: EvidenceWrite[] = [];

  for (const row of resolved) {
    if (!row.tagId) {
      misses.push(row.tagName);
      continue;
    }
    if (row.action === "flag") flags.push(row.tagName);
    else clears.push(row.tagName);
    writes.push({
      tagType: row.tagType,
      tagId: row.tagId,
      status: row.action === "flag" ? "needs_more_practice" : "practiced",
    });
  }

  const result = await recordTopicEvidence(supabase, {
    userId: input.studentId,
    sourceType: "teacher_observation",
    sourceId: input.sessionId ?? null,
    writes,
  });

  if (writes.length > 0 && result.written !== writes.length) {
    throw new AppError(OBSERVATION_FAILED, "EVIDENCE_WRITE_FAILED", 500);
  }

  return {
    written: result.written,
    flags,
    clears,
    note: noteWithMisses(input.note ?? "", misses),
  };
}

function noteWithMisses(note: string, misses: string[]): string {
  const trimmed = note.trim();
  if (misses.length === 0) return trimmed;
  const line = `No está en la lista: ${misses.join(", ")}`;
  return trimmed ? `${trimmed}\n${line}` : line;
}

export type ObservationTagChoice = {
  tagType: "error" | "phonetic" | "grammar";
  group: "Errores comunes" | "Sonidos" | "Gramática";
  name: string;
  displayName: string;
};

const PICKER_GROUPS: Array<{
  tagType: ObservationTagChoice["tagType"];
  group: ObservationTagChoice["group"];
}> = [
  { tagType: "error", group: "Errores comunes" },
  { tagType: "phonetic", group: "Sonidos" },
  { tagType: "grammar", group: "Gramática" },
];

export async function loadObservationVocabulary(
  supabase: SupabaseClient
): Promise<ObservationTagChoice[]> {
  const groups = await Promise.all(
    PICKER_GROUPS.map(async ({ tagType, group }) => {
      const { data, error } = await supabase
        .from(tagTableFor(tagType))
        .select("name, display_name")
        .order("display_name");

      if (error) {
        console.error("loadObservationVocabulary failed:", error.message);
        throw new AppError(
          "No pude cargar las etiquetas.",
          "TAG_CATALOG_READ_FAILED",
          500
        );
      }

      return (data ?? []).map((row) => ({
        tagType,
        group,
        name: row.name as string,
        displayName: row.display_name as string,
      }));
    })
  );

  return groups.flat();
}

export type StudentOpenFlag = {
  studentId: string;
  tagType: TagType;
  tagName: string;
  displayName: string;
};

/** Current sticky flags for these students, with catalog names attached. */
export async function loadOpenFlags(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<StudentOpenFlag[]> {
  const ids = [...new Set(studentIds)];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("user_topic_evidence")
    .select("user_id, tag_type, tag_id")
    .eq("status", "needs_more_practice")
    .in("user_id", ids);

  if (error) {
    console.error("loadOpenFlags failed:", error.message);
    throw new AppError("No pude cargar las marcas.", "FLAG_READ_FAILED", 500);
  }

  const rows = data ?? [];
  const idsByType = new Map<TagType, Set<string>>();
  for (const row of rows) {
    const tagType = row.tag_type as TagType;
    const set = idsByType.get(tagType) ?? new Set<string>();
    set.add(row.tag_id as string);
    idsByType.set(tagType, set);
  }

  const nameByKey = new Map<string, { name: string; displayName: string }>();
  await Promise.all(
    [...idsByType.entries()].map(async ([tagType, tagIds]) => {
      const { data: tags, error: tagError } = await supabase
        .from(tagTableFor(tagType))
        .select("id, name, display_name")
        .in("id", [...tagIds]);

      if (tagError) {
        console.error("loadOpenFlags catalog failed:", tagError.message);
        throw new AppError("No pude cargar las marcas.", "FLAG_READ_FAILED", 500);
      }

      for (const tag of tags ?? []) {
        nameByKey.set(`${tagType}:${tag.id}`, {
          name: tag.name as string,
          displayName: tag.display_name as string,
        });
      }
    })
  );

  const flags: StudentOpenFlag[] = [];
  for (const row of rows) {
    const meta = nameByKey.get(`${row.tag_type}:${row.tag_id}`);
    if (!meta) continue;
    flags.push({
      studentId: row.user_id as string,
      tagType: row.tag_type as TagType,
      tagName: meta.name,
      displayName: meta.displayName,
    });
  }
  return flags;
}
