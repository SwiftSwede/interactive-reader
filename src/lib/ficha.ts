import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceSourceType, TagType } from "@/types";
import { tagTableFor } from "@/lib/content-tags";
import { AppError } from "@/lib/errors";

const FICHA_TAG_TYPES: readonly TagType[] = [
  "grammar",
  "vocabulary",
  "phonetic",
  "error",
];

export const FICHA_TEXT_MAX = 500;
export const FICHA_ERROR_EVENT_LIMIT = 10;
export const FICHA_OBSERVATION_LIMIT = 20;
export const FICHA_FLAGGED_WORD_LIMIT = 10;
export const FICHA_WEAK_SOUND_ATTEMPTS = 20;
export const FICHA_WEAK_SOUND_LIMIT = 6;

export type FichaFamilyLabel = "Error" | "Sonido" | "Gramática" | "Vocabulario";
export type FichaSourceLabel = "tú" | "sistema";

export type TagDisplay = {
  tagType: TagType;
  name: string;
  displayName: string;
};

export type TagDisplayIndex = {
  byId: Map<string, TagDisplay>;
  byName: Map<string, TagDisplay>;
};

export type ActiveFlagRow = {
  tagType: TagType;
  tagId: string;
  sourceType: EvidenceSourceType;
  updatedAt: string;
};

export type FichaFlag = {
  tagType: TagType;
  displayName: string;
  familyLabel: FichaFamilyLabel;
  sourceLabel: FichaSourceLabel;
  updatedAt: string;
};

export type ErrorEventRow = {
  occurredAt: string;
  errorTags: string[];
  answer: string;
  corrected: string;
};

export type FichaErrorEvent = {
  occurredAt: string;
  tagDisplayNames: string[];
  answer: string;
  corrected: string;
};

export type ObservationEventRow = {
  occurredAt: string;
  flags: string[];
  clears: string[];
  note: string;
};

export type FichaObservation = {
  occurredAt: string;
  flags: string[];
  clears: string[];
  note: string;
};

export type FlaggedWordRow = {
  flagText: string;
  timesRequested: number;
  lastRequestedAt: string;
};

export type WeakSound = {
  ipa: string;
  count: number;
};

export type Ficha = {
  flags: FichaFlag[];
  errorEvents: FichaErrorEvent[];
  flaggedWords: FlaggedWordRow[];
  weakSounds: WeakSound[];
  observations: FichaObservation[];
};

const FAMILY_LABEL: Record<TagType, FichaFamilyLabel> = {
  error: "Error",
  phonetic: "Sonido",
  grammar: "Gramática",
  vocabulary: "Vocabulario",
};

function isTagType(value: unknown): value is TagType {
  return (
    value === "grammar" ||
    value === "vocabulary" ||
    value === "phonetic" ||
    value === "error"
  );
}

function isEvidenceSourceType(value: unknown): value is EvidenceSourceType {
  return (
    value === "reading" ||
    value === "word_lookup" ||
    value === "comprehension" ||
    value === "personal_response" ||
    value === "dictation" ||
    value === "pronunciation" ||
    value === "writing" ||
    value === "exam" ||
    value === "teacher_observation"
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function truncateFichaText(
  value: string,
  max: number = FICHA_TEXT_MAX
): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function familyLabelFor(tagType: TagType): FichaFamilyLabel {
  return FAMILY_LABEL[tagType];
}

export function sourceLabelFor(sourceType: EvidenceSourceType): FichaSourceLabel {
  return sourceType === "teacher_observation" ? "tú" : "sistema";
}

function resolveById(index: TagDisplayIndex, tagId: string): string {
  return index.byId.get(tagId)?.displayName ?? tagId;
}

function resolveByName(
  index: TagDisplayIndex,
  name: string,
  preferredType?: TagType
): string {
  if (preferredType) {
    const preferred = index.byName.get(`${preferredType}:${name}`);
    if (preferred) return preferred.displayName;
  }
  for (const tagType of FICHA_TAG_TYPES) {
    const hit = index.byName.get(`${tagType}:${name}`);
    if (hit) return hit.displayName;
  }
  return name;
}

export function emptyTagIndex(): TagDisplayIndex {
  return { byId: new Map(), byName: new Map() };
}

export async function loadTagDisplayNames(
  supabase: SupabaseClient
): Promise<TagDisplayIndex> {
  const index = emptyTagIndex();

  const groups = await Promise.all(
    FICHA_TAG_TYPES.map(async (tagType) => {
      const { data, error } = await supabase
        .from(tagTableFor(tagType))
        .select("id, name, display_name");

      if (error) {
        console.error("loadTagDisplayNames failed:", error.message);
        return { tagType, rows: [] as Array<{ id: string; name: string; displayName: string }> };
      }

      return {
        tagType,
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          displayName: row.display_name as string,
        })),
      };
    })
  );

  for (const { tagType, rows } of groups) {
    for (const row of rows) {
      const display: TagDisplay = {
        tagType,
        name: row.name,
        displayName: row.displayName,
      };
      index.byId.set(row.id, display);
      index.byName.set(`${tagType}:${row.name}`, display);
    }
  }

  return index;
}

export async function loadActiveFlags(
  supabase: SupabaseClient,
  studentId: string
): Promise<ActiveFlagRow[]> {
  const { data, error } = await supabase
    .from("user_topic_evidence")
    .select("tag_type, tag_id, source_type, updated_at")
    .eq("user_id", studentId)
    .eq("status", "needs_more_practice")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("loadActiveFlags failed:", error.message);
    throw new AppError("No pude cargar las marcas.", "FLAG_READ_FAILED", 500);
  }

  const flags: ActiveFlagRow[] = [];
  for (const row of data ?? []) {
    if (!isTagType(row.tag_type)) continue;
    const sourceType = isEvidenceSourceType(row.source_type)
      ? row.source_type
      : "reading";
    flags.push({
      tagType: row.tag_type,
      tagId: row.tag_id as string,
      sourceType,
      updatedAt: row.updated_at as string,
    });
  }
  return flags;
}

export async function loadRecentErrorEvents(
  supabase: SupabaseClient,
  studentId: string,
  limit: number = FICHA_ERROR_EVENT_LIMIT
): Promise<ErrorEventRow[]> {
  const { data, error } = await supabase
    .from("learning_events")
    .select("occurred_at, detail")
    .eq("user_id", studentId)
    .eq("event_type", "check_answer_error")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("loadRecentErrorEvents failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const detail =
      row.detail && typeof row.detail === "object"
        ? (row.detail as Record<string, unknown>)
        : {};
    return {
      occurredAt: row.occurred_at as string,
      errorTags: asStringArray(detail.error_tags),
      answer: truncateFichaText(
        typeof detail.answer === "string" ? detail.answer : ""
      ),
      corrected: truncateFichaText(
        typeof detail.corrected === "string" ? detail.corrected : ""
      ),
    };
  });
}

export async function loadTeacherObservationHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit: number = FICHA_OBSERVATION_LIMIT
): Promise<ObservationEventRow[]> {
  const { data, error } = await supabase
    .from("learning_events")
    .select("occurred_at, detail")
    .eq("user_id", studentId)
    .eq("event_type", "teacher_observation")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("loadTeacherObservationHistory failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const detail =
      row.detail && typeof row.detail === "object"
        ? (row.detail as Record<string, unknown>)
        : {};
    return {
      occurredAt: row.occurred_at as string,
      flags: asStringArray(detail.flags),
      clears: asStringArray(detail.clears),
      note: typeof detail.note === "string" ? detail.note : "",
    };
  });
}

export function mergeFlaggedWords(
  rows: FlaggedWordRow[],
  limit: number = FICHA_FLAGGED_WORD_LIMIT
): FlaggedWordRow[] {
  const byText = new Map<string, FlaggedWordRow>();
  for (const row of rows) {
    const existing = byText.get(row.flagText);
    if (!existing) {
      byText.set(row.flagText, { ...row });
      continue;
    }
    existing.timesRequested += row.timesRequested;
    if (row.lastRequestedAt > existing.lastRequestedAt) {
      existing.lastRequestedAt = row.lastRequestedAt;
    }
  }

  return [...byText.values()]
    .sort((a, b) => {
      if (b.timesRequested !== a.timesRequested) {
        return b.timesRequested - a.timesRequested;
      }
      return b.lastRequestedAt.localeCompare(a.lastRequestedAt);
    })
    .slice(0, limit);
}

export async function loadTopFlaggedWords(
  supabase: SupabaseClient,
  studentId: string,
  limit: number = FICHA_FLAGGED_WORD_LIMIT
): Promise<FlaggedWordRow[]> {
  const { data, error } = await supabase
    .from("word_flag_request_rollup")
    .select("flag_text, times_requested, last_requested_at")
    .eq("user_id", studentId);

  if (error) {
    console.error("loadTopFlaggedWords failed:", error.message);
    return [];
  }

  const rows: FlaggedWordRow[] = (data ?? []).map((row) => ({
    flagText: row.flag_text as string,
    timesRequested: Number(row.times_requested) || 0,
    lastRequestedAt: row.last_requested_at as string,
  }));

  return mergeFlaggedWords(rows, limit);
}

export function countWeakSounds(
  attempts: Array<{ weakSounds: string[] }>,
  limit: number = FICHA_WEAK_SOUND_LIMIT
): WeakSound[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    for (const ipa of attempt.weakSounds) {
      if (!ipa) continue;
      counts.set(ipa, (counts.get(ipa) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([ipa, count]) => ({ ipa, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.ipa.localeCompare(b.ipa);
    })
    .slice(0, limit);
}

export async function loadWeakSoundSummary(
  supabase: SupabaseClient,
  studentId: string
): Promise<WeakSound[]> {
  const { data, error } = await supabase
    .from("pronunciation_attempts")
    .select("weak_sounds")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(FICHA_WEAK_SOUND_ATTEMPTS);

  if (error) {
    console.error("loadWeakSoundSummary failed:", error.message);
    return [];
  }

  const attempts = (data ?? []).map((row) => ({
    weakSounds: Array.isArray(row.weak_sounds)
      ? (row.weak_sounds as string[])
      : [],
  }));

  return countWeakSounds(attempts);
}

export type BuildFichaInput = {
  tagIndex: TagDisplayIndex;
  flags: ActiveFlagRow[];
  errorEvents: ErrorEventRow[];
  observations: ObservationEventRow[];
  flaggedWords: FlaggedWordRow[];
  weakSounds: WeakSound[];
};

export function buildFicha(input: BuildFichaInput): Ficha {
  return {
    flags: input.flags.map((flag) => ({
      tagType: flag.tagType,
      displayName: resolveById(input.tagIndex, flag.tagId),
      familyLabel: familyLabelFor(flag.tagType),
      sourceLabel: sourceLabelFor(flag.sourceType),
      updatedAt: flag.updatedAt,
    })),
    errorEvents: input.errorEvents.map((event) => ({
      occurredAt: event.occurredAt,
      tagDisplayNames: event.errorTags.map((name) =>
        resolveByName(input.tagIndex, name, "error")
      ),
      answer: event.answer,
      corrected: event.corrected,
    })),
    flaggedWords: input.flaggedWords,
    weakSounds: input.weakSounds,
    observations: input.observations.map((event) => ({
      occurredAt: event.occurredAt,
      flags: event.flags.map((name) => resolveByName(input.tagIndex, name)),
      clears: event.clears.map((name) => resolveByName(input.tagIndex, name)),
      note: event.note,
    })),
  };
}

export async function loadFicha(
  supabase: SupabaseClient,
  studentId: string
): Promise<Ficha> {
  const [tagIndex, flags, errorEvents, observations, flaggedWords, weakSounds] =
    await Promise.all([
      loadTagDisplayNames(supabase),
      loadActiveFlags(supabase, studentId),
      loadRecentErrorEvents(supabase, studentId),
      loadTeacherObservationHistory(supabase, studentId),
      loadTopFlaggedWords(supabase, studentId),
      loadWeakSoundSummary(supabase, studentId),
    ]);

  return buildFicha({
    tagIndex,
    flags,
    errorEvents,
    observations,
    flaggedWords,
    weakSounds,
  });
}
