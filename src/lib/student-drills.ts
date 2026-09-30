import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { toSessionItem, collectionCountOf, type SessionItem } from "@/lib/drill-session";
import {
  buildDeck,
  ITEM_COLUMNS,
  mapItemRow,
  mapStateRow,
  STATE_COLUMNS,
  type DrillItem,
  type DrillItemState,
  type DrillLevel,
  type ItemRow,
  type StateRow,
} from "@/lib/drills";
import {
  getOrCreateActiveMission,
  graduateMission,
  listIntroCompletedTags,
  loadMissionCatalog,
  rankMissionCandidates,
  type MissionEvidenceRow,
  type StudentMission,
} from "@/lib/missions";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagTableFor } from "@/lib/content-tags";

export type PracticeSessionKind = "intro" | "review";

export type StudentPractice = {
  intro: {
    missionId: string;
    tagId: string;
    displayName: string;
    dismissedUntil: string | null;
  } | null;
  deck: SessionItem[];
  collectionCount: number;
  reviewCount: number;
  sessionKind: PracticeSessionKind;
};

async function loadEvidence(
  client: SupabaseClient,
  userId: string,
): Promise<MissionEvidenceRow[]> {
  const { data, error } = await client
    .from("user_topic_evidence")
    .select("tag_type, tag_id, source_type, updated_at")
    .eq("user_id", userId)
    .eq("status", "needs_more_practice");

  if (error) {
    console.error("loadStudentPractice evidence failed:", error.message);
    throw new AppError("No pude cargar la práctica.", "DRILL_LAB_READ_FAILED", 500);
  }

  return ((data ?? []) as Array<{
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
}

async function loadCatalogItems(
  client: SupabaseClient,
  userId: string,
): Promise<{ items: DrillItem[]; state: Map<string, DrillItemState> }> {
  const [itemsResult, stateResult] = await Promise.all([
    client.from("drill_items").select(ITEM_COLUMNS).eq("active", true),
    client.from("drill_item_state").select(STATE_COLUMNS).eq("user_id", userId),
  ]);

  if (itemsResult.error || stateResult.error) {
    console.error(
      "loadStudentPractice catalog failed:",
      itemsResult.error?.message ?? stateResult.error?.message,
    );
    throw new AppError("No pude cargar la práctica.", "DRILL_LAB_READ_FAILED", 500);
  }

  const items = ((itemsResult.data ?? []) as ItemRow[])
    .map(mapItemRow)
    .filter((item): item is DrillItem => item !== null);
  const state = new Map<string, DrillItemState>();
  for (const row of (stateResult.data ?? []) as StateRow[]) {
    const mapped = mapStateRow(row);
    state.set(mapped.itemId, mapped);
  }
  return { items, state };
}

async function displayNameFor(
  client: SupabaseClient,
  mission: StudentMission,
): Promise<string | null> {
  const { data, error } = await client
    .from(tagTableFor(mission.tagType))
    .select("display_name")
    .eq("id", mission.tagId)
    .maybeSingle();

  if (error) {
    console.error("intro display name failed:", error.message);
    throw new AppError("No pude leer la misión.", "MISSION_READ_FAILED", 500);
  }
  const name = typeof data?.display_name === "string" ? data.display_name.trim() : "";
  return name || null;
}

function reviewTagIds(
  evidence: MissionEvidenceRow[],
  catalog: Awaited<ReturnType<typeof loadMissionCatalog>>,
  introCompletedAtByTagId: Map<string, string>,
): string[] {
  return rankMissionCandidates(evidence, catalog)
    .filter((candidate) => introCompletedAtByTagId.has(candidate.tagId))
    .map((candidate) => candidate.tagId);
}

async function completeEmptyIntro(
  client: SupabaseClient,
  userId: string,
  mission: StudentMission,
  items: DrillItem[],
  state: Map<string, DrillItemState>,
  now: Date,
  level: DrillLevel,
  introCompletedAtByTagId: Map<string, string>,
): Promise<StudentMission | null> {
  const introDeck = buildDeck({
    items,
    state,
    now,
    level,
    introTagId: mission.tagId,
    reviewTagIds: [],
    introCompletedAtByTagId,
  });
  if (introDeck.length > 0) return mission;

  try {
    await graduateMission(
      createAdminClient(),
      userId,
      mission.id,
      "intro_complete",
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "MISSION_NOT_ACTIVE") {
      return getOrCreateActiveMission(client, userId);
    }
    throw error;
  }
  introCompletedAtByTagId.set(mission.tagId, now.toISOString());
  return getOrCreateActiveMission(client, userId);
}

export async function loadStudentPractice(
  client: SupabaseClient,
  input: {
    userId: string;
    level: DrillLevel;
    now?: Date;
    preferReview?: boolean;
  },
): Promise<StudentPractice> {
  const now = input.now ?? new Date();
  let mission = await getOrCreateActiveMission(client, input.userId);
  const [evidence, introCompleted, catalog, catalogItems] = await Promise.all([
    loadEvidence(client, input.userId),
    listIntroCompletedTags(client, input.userId),
    loadMissionCatalog(client),
    loadCatalogItems(client, input.userId),
  ]);
  const { items, state } = catalogItems;
  const introCompletedAtByTagId = new Map(
    introCompleted.map((row) => [row.tagId, row.completedAt]),
  );

  if (mission) {
    mission = await completeEmptyIntro(
      client,
      input.userId,
      mission,
      items,
      state,
      now,
      input.level,
      introCompletedAtByTagId,
    );
  }

  const rankedReview = reviewTagIds(evidence, catalog, introCompletedAtByTagId);
  const reviewDeck = buildDeck({
    items,
    state,
    now,
    level: input.level,
    introTagId: null,
    reviewTagIds: rankedReview,
    introCompletedAtByTagId,
  });

  const introDeck = mission
    ? buildDeck({
        items,
        state,
        now,
        level: input.level,
        introTagId: mission.tagId,
        reviewTagIds: [],
        introCompletedAtByTagId,
      })
    : [];

  const useIntro = Boolean(mission && introDeck.length > 0 && !input.preferReview);
  const rawDeck = useIntro ? introDeck : reviewDeck;
  const deck = rawDeck
    .map((item) => toSessionItem(item, state.get(item.id)))
    .filter((item): item is SessionItem => item !== null);

  let intro: StudentPractice["intro"] = null;
  if (mission && introDeck.length > 0) {
    const displayName = await displayNameFor(client, mission);
    if (displayName) {
      intro = {
        missionId: mission.id,
        tagId: mission.tagId,
        displayName,
        dismissedUntil: mission.dismissedUntil,
      };
    }
  }

  return {
    intro,
    deck,
    collectionCount: collectionCountOf(state.values()),
    reviewCount: reviewDeck.length,
    sessionKind: useIntro ? "intro" : "review",
  };
}
