import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { countCollection } from "@/lib/drill-session";
import {
  isCorrectAnswer,
  ITEM_COLUMNS,
  mapItemRow,
  recordDrillAttempt,
  storedAnswer,
  type DrillItemState,
  type ItemRow,
} from "@/lib/drills";
import { getOrCreateActiveMission } from "@/lib/missions";

// Student-facing result. Only these fields ever leave the server: no tag,
// no state row, no score (ADR 015 Decision 11).
export type DrillAttemptResult =
  | { correct: true; graduated: boolean; collectionCount: number }
  | { correct: false; graduated: false; collectionCount: number; expected: string };

/** True only on the attempt that moved the item into graduated. */
export function graduatedThisAttempt(stored: DrillItemState): boolean {
  if (stored.status !== "graduated" || !stored.graduatedAt) return false;
  return new Date(stored.graduatedAt).getTime() === new Date(stored.updatedAt).getTime();
}

export async function submitDrillAttempt(input: {
  client: SupabaseClient;
  adminClient: SupabaseClient;
  userId: string;
  itemId: string;
  answer: string;
  now?: Date;
}): Promise<DrillAttemptResult> {
  const { client, userId, itemId } = input;
  const now = input.now ?? new Date();

  const { data: itemRow, error: itemError } = await client
    .from("drill_items")
    .select(ITEM_COLUMNS)
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    console.error("submitDrillAttempt item read failed:", itemError.message);
    throw new AppError("No pude leer la práctica.", "DRILL_ITEM_READ_FAILED", 500);
  }
  const item = itemRow ? mapItemRow(itemRow as ItemRow) : null;
  if (!item || !item.active) {
    throw new AppError("No encontré esa práctica.", "DRILL_ITEM_NOT_FOUND", 404);
  }

  const expected = storedAnswer(item);
  if (!expected) {
    throw new AppError("Esa tarjeta no lleva respuesta.", "DRILL_NOT_ANSWERABLE", 422);
  }

  const mission = await getOrCreateActiveMission(client, userId);
  if (!mission) {
    throw new AppError("Ahora no tienes nada que practicar.", "NO_ACTIVE_MISSION", 409);
  }

  if (item.tagId !== mission.tagId) {
    const { data: existing, error: stateError } = await client
      .from("drill_item_state")
      .select("id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();
    if (stateError) {
      console.error("submitDrillAttempt state read failed:", stateError.message);
      throw new AppError("No pude leer la práctica.", "DRILL_STATE_READ_FAILED", 500);
    }
    if (!existing) {
      throw new AppError("Esa práctica no es para hoy.", "DRILL_ITEM_NOT_IN_DECK", 403);
    }
  }

  const correct = isCorrectAnswer(item, input.answer);
  const stored = await recordDrillAttempt(
    input.adminClient,
    { userId, itemId, correct },
    now,
  );
  const collectionCount = await countCollection(client, userId);

  if (!correct) {
    return { correct: false, graduated: false, collectionCount, expected };
  }
  return { correct: true, graduated: graduatedThisAttempt(stored), collectionCount };
}
