import {
  EGP_LEVELS,
  TRACKS,
  type AnswerRecord,
  type Band,
  type EvalItem,
  type EvalStructure,
  type HoleStatus,
  type JourneyPass,
  type Opener,
  type Outcome,
  type Track,
} from "./types";

/**
 * Bands are exact fractions of the original 15-item design: promote at 12/15
 * (80%), settle at 7/15 (labelled 47%). Cross-multiplied so no rounding ever
 * moves a student across a band edge.
 */
const BAND_DENOMINATOR = 15;
const PROMOTE_NUMERATOR = 12;
const SETTLE_NUMERATOR = 7;

export const MAX_CONFIRM_STRUCTURES_PER_TRACK = 3;

export function bandFor(correct: number, total: number): Band {
  if (total <= 0) return "settle";
  if (correct * BAND_DENOMINATOR >= PROMOTE_NUMERATOR * total) return "promote";
  if (correct * BAND_DENOMINATOR >= SETTLE_NUMERATOR * total) return "settle";
  return "demote";
}

const OPENER_TRACK: Record<Opener, Track | null> = {
  no_se_nada: null,
  principiante: "beginner",
  armo_oraciones: "pre_int",
  converso: "int",
  pulir: "int",
};

/** `null` means the instant Superpack redirect: no quiz. */
export function trackForOpener(opener: Opener): Track | null {
  return OPENER_TRACK[opener];
}

export function trackIndex(track: Track): number {
  return TRACKS.indexOf(track);
}

export const TOP_TRACK: Track = TRACKS[TRACKS.length - 1];
export const BOTTOM_TRACK: Track = TRACKS[0];

export type PlacementResult = {
  track: Track;
  correct: number;
  total: number;
  band: Band;
  missedStructureIds: string[];
};

export type JourneyDecision =
  | { type: "placement"; track: Track; transition: "promote" | "demote" }
  | {
      type: "settle";
      track: Track;
      top: boolean;
      settledPass: PlacementResult;
      promotedFrom: PlacementResult | null;
    }
  | { type: "gentle"; placedTrack: Track };

/**
 * Walk the ladder after the latest placement pass. Promote climbs one track;
 * demote drops one track at most and never loops back to a track already tried.
 */
export function decideAfterPlacement(history: PlacementResult[]): JourneyDecision {
  const last = history[history.length - 1];
  if (!last) throw new Error("decideAfterPlacement needs at least one pass");
  const earlier = history.slice(0, -1);
  const index = trackIndex(last.track);
  const passAt = (i: number) => earlier.findLast((pass) => trackIndex(pass.track) === i);

  const settleAt = (settledPass: PlacementResult, top: boolean): JourneyDecision => {
    const position = history.lastIndexOf(settledPass);
    const before = position > 0 ? history[position - 1] : null;
    const promotedFrom =
      before &&
      before.band === "promote" &&
      trackIndex(before.track) === trackIndex(settledPass.track) - 1
        ? before
        : null;
    return { type: "settle", track: settledPass.track, top, settledPass, promotedFrom };
  };

  if (last.band === "promote") {
    if (last.track === TOP_TRACK) return settleAt(last, true);
    if (passAt(index + 1)) return settleAt(last, false);
    return { type: "placement", track: TRACKS[index + 1], transition: "promote" };
  }

  if (last.band === "settle") return settleAt(last, false);

  if (index === 0) return { type: "gentle", placedTrack: BOTTOM_TRACK };
  const below = passAt(index - 1);
  if (below && below.band !== "demote") return settleAt(below, false);
  if (earlier.some((pass) => pass.band === "demote")) {
    return { type: "gentle", placedTrack: TRACKS[index - 1] };
  }
  return { type: "placement", track: TRACKS[index - 1], transition: "demote" };
}

function levelRank(structure: EvalStructure | undefined): number {
  return structure ? EGP_LEVELS.indexOf(structure.egpLevel) : EGP_LEVELS.length;
}

/** Most foundational misses first (EGP level, then track position). Deterministic. */
export function foundationalFirst(
  structureIds: string[],
  structuresById: Map<string, EvalStructure>,
  limit: number,
): string[] {
  return [...new Set(structureIds)]
    .sort((a, b) => {
      const left = structuresById.get(a);
      const right = structuresById.get(b);
      const byLevel = levelRank(left) - levelRank(right);
      if (byLevel !== 0) return byLevel;
      return (left?.position ?? 0) - (right?.position ?? 0);
    })
    .slice(0, limit);
}

/** Settled track misses, then the promoted-from track's misses. Max 3 each. */
export function confirmationStructureIds(
  decision: Extract<JourneyDecision, { type: "settle" }>,
  structuresById: Map<string, EvalStructure>,
): string[] {
  const settled = foundationalFirst(
    decision.settledPass.missedStructureIds,
    structuresById,
    MAX_CONFIRM_STRUCTURES_PER_TRACK,
  );
  const promoted = decision.promotedFrom
    ? foundationalFirst(
        decision.promotedFrom.missedStructureIds,
        structuresById,
        MAX_CONFIRM_STRUCTURES_PER_TRACK,
      )
    : [];
  return [...new Set([...settled, ...promoted])];
}

export function placementResults(
  journey: JourneyPass[],
  answers: Map<string, AnswerRecord>,
  itemsById: Map<string, EvalItem>,
): PlacementResult[] {
  return journey
    .filter((pass) => pass.kind === "placement")
    .map((pass) => {
      let correct = 0;
      const missed: string[] = [];
      for (const itemId of pass.itemIds) {
        const answer = answers.get(itemId);
        if (answer?.isCorrect) {
          correct += 1;
        } else {
          const structureId = itemsById.get(itemId)?.structureId;
          if (structureId) missed.push(structureId);
        }
      }
      const total = pass.itemIds.length;
      return {
        track: pass.track,
        correct,
        total,
        band: bandFor(correct, total),
        missedStructureIds: missed,
      };
    });
}

export type NextStep =
  | { type: "continue" }
  | { type: "placement"; track: Track; transition: "promote" | "demote" }
  | { type: "confirmation"; track: Track; structureIds: string[] }
  | { type: "finish"; outcome: Outcome; placedTrack: Track };

function finishFrom(decision: JourneyDecision): NextStep {
  if (decision.type === "gentle") {
    return { type: "finish", outcome: "gentle", placedTrack: decision.placedTrack };
  }
  if (decision.type === "settle") {
    return {
      type: "finish",
      outcome: decision.top ? "top" : "settled",
      placedTrack: decision.track,
    };
  }
  throw new Error("finishFrom called with an open placement decision");
}

/**
 * What happens after the current pass. The service draws items for
 * confirmation; if none can be drawn it finishes with `finalStep`.
 */
export function planNext(args: {
  journey: JourneyPass[];
  answers: Map<string, AnswerRecord>;
  itemsById: Map<string, EvalItem>;
  structuresById: Map<string, EvalStructure>;
}): NextStep {
  const { journey, answers, itemsById, structuresById } = args;
  const current = journey[journey.length - 1];
  if (!current) throw new Error("planNext needs a started journey");
  if (current.itemIds.some((itemId) => !answers.has(itemId))) return { type: "continue" };

  const decision = decideAfterPlacement(placementResults(journey, answers, itemsById));
  if (current.kind === "confirmation") return finishFrom(decision);
  if (decision.type === "placement") return decision;
  if (decision.type === "gentle") return finishFrom(decision);

  const structureIds = confirmationStructureIds(decision, structuresById);
  if (structureIds.length === 0) return finishFrom(decision);
  return { type: "confirmation", track: decision.track, structureIds };
}

/** The final outcome for a journey whose passes are all answered. */
export function finalStep(
  journey: JourneyPass[],
  answers: Map<string, AnswerRecord>,
  itemsById: Map<string, EvalItem>,
): Extract<NextStep, { type: "finish" }> {
  const decision = decideAfterPlacement(placementResults(journey, answers, itemsById));
  return finishFrom(decision) as Extract<NextStep, { type: "finish" }>;
}

/**
 * Two misses on the same structure confirm a hole. A single miss stays a
 * candidate (worth watching, never a verdict).
 */
export function computeHoles(
  journey: JourneyPass[],
  answers: Map<string, AnswerRecord>,
  itemsById: Map<string, EvalItem>,
): Map<string, HoleStatus> {
  const misses = new Map<string, number>();
  for (const pass of journey) {
    for (const itemId of pass.itemIds) {
      const answer = answers.get(itemId);
      if (!answer || answer.isCorrect) continue;
      const structureId = itemsById.get(itemId)?.structureId;
      if (!structureId) continue;
      misses.set(structureId, (misses.get(structureId) ?? 0) + 1);
    }
  }
  const holes = new Map<string, HoleStatus>();
  for (const [structureId, count] of misses) {
    holes.set(structureId, count >= 2 ? "confirmed" : "candidate");
  }
  return holes;
}
