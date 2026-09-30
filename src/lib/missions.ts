import type { SupabaseClient } from "@supabase/supabase-js";
import { tagTableFor } from "@/lib/content-tags";
import { AppError } from "@/lib/errors";
import { GRAMMAR_TAG_SEEDS } from "@/lib/knowledge-tags";
import { createAdminClient } from "@/lib/supabase/admin";

// One active mission per student. Ranking runs only when that row is missing.
// userId must be the caller's session user, never a value taken from a payload.

export const MISSION_TAG_TYPES = ["grammar", "phonetic", "error"] as const;

export type MissionTagType = (typeof MISSION_TAG_TYPES)[number];

export type MissionGraduationReason = "teacher_clear" | "intro_complete";

export type MissionEvidenceRow = {
  tagType: string;
  tagId: string;
  sourceType: string;
  updatedAt: string;
};

export type MissionCatalog = {
  /** Key is `${tagType}:${tagId}`. Value is the stable catalog name. */
  nameByKey: Map<string, string>;
  /** Grammar seed names to their direct prerequisite names. */
  prerequisitesByName: Map<string, readonly string[]>;
};

export type RankedMissionCandidate = {
  tagType: MissionTagType;
  tagId: string;
  name: string;
  sourceType: string;
  updatedAt: string;
};

export type StudentMission = {
  id: string;
  userId: string;
  tagType: MissionTagType;
  tagId: string;
  status: "active" | "graduated";
  startedAt: string;
  graduatedAt: string | null;
  dismissedUntil: string | null;
  graduationReason: MissionGraduationReason | null;
  updatedAt: string;
};

export type ClearedMissionTag = {
  tagType: string;
  tagId: string;
};

const MISSION_COLUMNS =
  "id, user_id, tag_type, tag_id, status, started_at, graduated_at, dismissed_until, graduation_reason, updated_at";

type MissionRow = {
  id: string;
  user_id: string;
  tag_type: string;
  tag_id: string;
  status: string;
  started_at: string;
  graduated_at: string | null;
  dismissed_until: string | null;
  graduation_reason: string | null;
  updated_at: string;
};

function isMissionTagType(value: string): value is MissionTagType {
  return (MISSION_TAG_TYPES as readonly string[]).includes(value);
}

function catalogKey(tagType: string, tagId: string): string {
  return `${tagType}:${tagId}`;
}

function prerequisiteBroken(
  candidate: { tagType: MissionTagType; name: string },
  catalog: MissionCatalog,
  flaggedGrammarNames: ReadonlySet<string>,
): boolean {
  if (candidate.tagType !== "grammar") return false;
  const prerequisites = catalog.prerequisitesByName.get(candidate.name) ?? [];
  return prerequisites.some((name) => flaggedGrammarNames.has(name));
}

/**
 * Lowest-hanging eligible flag. Vocabulary is ignored. A row with no catalog
 * name is ignored. Teacher judgment outranks machines, then a grammar tag
 * whose direct prerequisite is also flagged, then the oldest flag, then tag id.
 */
export function rankMissionCandidates(
  rows: readonly MissionEvidenceRow[],
  catalog: MissionCatalog,
): RankedMissionCandidate[] {
  const eligible: RankedMissionCandidate[] = [];
  const flaggedGrammarNames = new Set<string>();

  for (const row of rows) {
    if (!isMissionTagType(row.tagType)) continue;
    const name = catalog.nameByKey.get(catalogKey(row.tagType, row.tagId));
    if (!name) continue;
    if (row.tagType === "grammar") flaggedGrammarNames.add(name);
    eligible.push({
      tagType: row.tagType,
      tagId: row.tagId,
      name,
      sourceType: row.sourceType,
      updatedAt: row.updatedAt,
    });
  }

  eligible.sort((a, b) => {
    const teacherA = a.sourceType === "teacher_observation" ? 0 : 1;
    const teacherB = b.sourceType === "teacher_observation" ? 0 : 1;
    if (teacherA !== teacherB) return teacherA - teacherB;

    const brokenA = prerequisiteBroken(a, catalog, flaggedGrammarNames) ? 1 : 0;
    const brokenB = prerequisiteBroken(b, catalog, flaggedGrammarNames) ? 1 : 0;
    if (brokenA !== brokenB) return brokenA - brokenB;

    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1;
    if (a.tagId !== b.tagId) return a.tagId < b.tagId ? -1 : 1;
    return 0;
  });

  return eligible;
}

function mapMission(row: MissionRow): StudentMission {
  if (!isMissionTagType(row.tag_type)) {
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }
  if (row.status !== "active" && row.status !== "graduated") {
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }
  const reason = row.graduation_reason ?? null;
  if (
    reason != null &&
    reason !== "teacher_clear" &&
    reason !== "intro_complete"
  ) {
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }
  return {
    id: row.id,
    userId: row.user_id,
    tagType: row.tag_type,
    tagId: row.tag_id,
    status: row.status,
    startedAt: row.started_at,
    graduatedAt: row.graduated_at,
    dismissedUntil: row.dismissed_until,
    graduationReason: reason,
    updatedAt: row.updated_at,
  };
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

async function readActiveMission(
  client: SupabaseClient,
  userId: string,
): Promise<StudentMission | null> {
  const { data, error } = await client
    .from("student_missions")
    .select(MISSION_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("readActiveMission failed:", error.message);
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }
  if (!data) return null;
  return mapMission(data as MissionRow);
}

export type IntroCompletedTag = {
  tagId: string;
  completedAt: string;
};

/** Tags whose intro sitting already finished. The topic flag may still be on. */
export async function listIntroCompletedTags(
  client: SupabaseClient,
  userId: string,
): Promise<IntroCompletedTag[]> {
  const { data, error } = await client
    .from("student_missions")
    .select("tag_id, graduated_at")
    .eq("user_id", userId)
    .eq("graduation_reason", "intro_complete");

  if (error) {
    console.error("listIntroCompletedTags failed:", error.message);
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }

  const rows = (data ?? []) as Array<{
    tag_id: string;
    graduated_at: string | null;
  }>;
  return rows
    .filter((row) => row.graduated_at)
    .map((row) => ({ tagId: row.tag_id, completedAt: row.graduated_at! }));
}

export async function loadMissionCatalog(client: SupabaseClient): Promise<MissionCatalog> {
  const groups = await Promise.all(
    MISSION_TAG_TYPES.map(async (tagType) => {
      const { data, error } = await client
        .from(tagTableFor(tagType))
        .select("id, name");

      if (error) {
        console.error("loadMissionCatalog failed:", error.message);
        throw new AppError(
          "No pude cargar las etiquetas.",
          "TAG_CATALOG_READ_FAILED",
          500,
        );
      }

      return {
        tagType,
        rows: (data ?? []) as Array<{ id: string; name: string }>,
      };
    }),
  );

  const nameByKey = new Map<string, string>();
  for (const group of groups) {
    for (const row of group.rows) {
      nameByKey.set(catalogKey(group.tagType, row.id), row.name);
    }
  }

  const prerequisitesByName = new Map<string, readonly string[]>();
  for (const seed of GRAMMAR_TAG_SEEDS) {
    prerequisitesByName.set(seed.name, seed.prerequisites ?? []);
  }

  return { nameByKey, prerequisitesByName };
}

async function appendMissionEvent(
  adminClient: SupabaseClient,
  row: {
    userId: string;
    eventType: "mission_started" | "mission_graduated";
    detail: Record<string, string>;
  },
): Promise<void> {
  const { error } = await adminClient.from("learning_events").insert({
    user_id: row.userId,
    event_type: row.eventType,
    course_session_id: null,
    detail: row.detail,
  });

  if (error) {
    console.error(`${row.eventType} event failed:`, error.message);
    throw new AppError("No pude registrar la misión.", "MISSION_EVENT_FAILED", 500);
  }
}

/**
 * Returns the active mission, including one dismissed until a later instant.
 * When none exists, inserts the ranking winner. A unique-index race returns
 * the row that won the insert and does not write a second start event.
 * `adminClient` defaults to the service role and exists so tests can supply
 * the diary writer. Callers pass the session user id.
 */
export async function getOrCreateActiveMission(
  client: SupabaseClient,
  userId: string,
  adminClient?: SupabaseClient,
): Promise<StudentMission | null> {
  const existing = await readActiveMission(client, userId);
  if (existing) return existing;

  const { data, error } = await client
    .from("user_topic_evidence")
    .select("tag_type, tag_id, source_type, updated_at")
    .eq("user_id", userId)
    .eq("status", "needs_more_practice");

  if (error) {
    console.error("getOrCreateActiveMission evidence read failed:", error.message);
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }

  const evidence: MissionEvidenceRow[] = ((data ?? []) as Array<{
    tag_type: string;
    tag_id: string;
    source_type: string;
    updated_at: string;
  }>).map((row) => ({
    tagType: row.tag_type,
    tagId: row.tag_id,
    sourceType: row.source_type,
    updatedAt: row.updated_at,
  }));

  if (!evidence.some((row) => isMissionTagType(row.tagType))) return null;

  const introCompleted = await listIntroCompletedTags(client, userId);
  const catalog = await loadMissionCatalog(client);
  const skip = new Set(introCompleted.map((row) => row.tagId));
  const [winner] = rankMissionCandidates(evidence, catalog).filter(
    (candidate) => !skip.has(candidate.tagId),
  );
  if (!winner) return null;

  const { data: inserted, error: insertError } = await client
    .from("student_missions")
    .insert({
      user_id: userId,
      tag_type: winner.tagType,
      tag_id: winner.tagId,
      status: "active",
    })
    .select(MISSION_COLUMNS)
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      const raced = await readActiveMission(client, userId);
      if (!raced) {
        throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
      }
      return raced;
    }
    console.error("getOrCreateActiveMission insert failed:", insertError.message);
    throw new AppError("No pude guardar la misión.", "MISSION_WRITE_FAILED", 500);
  }

  const mission = mapMission(inserted as MissionRow);

  try {
    await appendMissionEvent(adminClient ?? createAdminClient(), {
      userId,
      eventType: "mission_started",
      detail: {
        tag_type: winner.tagType,
        tag_id: winner.tagId,
        name: winner.name,
      },
    });
  } catch (eventError) {
    if (!(eventError instanceof AppError)) {
      console.error(
        "mission_started event failed:",
        eventError instanceof Error ? eventError.message : eventError,
      );
    }
  }

  return mission;
}

/** Stores the instant the future card action computed. Does not pick a new mission. */
export async function snoozeMission(
  client: SupabaseClient,
  userId: string,
  missionId: string,
  untilIso: string,
): Promise<StudentMission> {
  const { data, error } = await client
    .from("student_missions")
    .update({
      dismissed_until: untilIso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", missionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select(MISSION_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("snoozeMission failed:", error.message);
    throw new AppError("No pude guardar la misión.", "MISSION_WRITE_FAILED", 500);
  }
  if (!data) {
    throw new AppError("Esa misión ya no está activa.", "MISSION_NOT_ACTIVE", 404);
  }
  return mapMission(data as MissionRow);
}

export async function graduateMission(
  adminClient: SupabaseClient,
  userId: string,
  missionId: string,
  reason: MissionGraduationReason,
): Promise<StudentMission> {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from("student_missions")
    .update({
      status: "graduated",
      graduated_at: now,
      graduation_reason: reason,
      updated_at: now,
    })
    .eq("id", missionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select(MISSION_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("graduateMission failed:", error.message);
    throw new AppError("No pude guardar la misión.", "MISSION_WRITE_FAILED", 500);
  }
  if (!data) {
    throw new AppError("Esa misión ya no está activa.", "MISSION_NOT_ACTIVE", 404);
  }

  const mission = mapMission(data as MissionRow);
  await appendMissionEvent(adminClient, {
    userId,
    eventType: "mission_graduated",
    detail: { reason },
  });
  return mission;
}

/**
 * After a teacher clear removes the active mission's tag, graduate it.
 * A clear of any other tag does nothing. Does not assign the next mission.
 */
export async function graduateClearedMission(
  adminClient: SupabaseClient,
  userId: string,
  cleared: readonly ClearedMissionTag[],
): Promise<StudentMission | null> {
  if (cleared.length === 0) return null;
  const active = await readActiveMission(adminClient, userId);
  if (!active) return null;
  const matches = cleared.some(
    (tag) => tag.tagType === active.tagType && tag.tagId === active.tagId,
  );
  if (!matches) return null;
  return graduateMission(adminClient, userId, active.id, "teacher_clear");
}
