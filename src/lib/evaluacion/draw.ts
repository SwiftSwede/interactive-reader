import {
  NO_SE_OPTION_ID,
  type EvalItem,
  type EvalOption,
  type EvalStructure,
  type ItemRole,
  type ItemStatus,
  type Track,
} from "./types";

export const NO_SE_LABEL = "No sé";

/** Production serves approved items only; dev also serves drafts. */
export function servableStatuses(env: {
  nodeEnv?: string;
  includeDrafts?: string;
}): Set<ItemStatus> {
  const production = env.nodeEnv === "production" && env.includeDrafts !== "1";
  return new Set<ItemStatus>(production ? ["approved"] : ["approved", "draft"]);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic [0, 1) stream for a string key. */
export function seededRandom(key: string): () => number {
  return mulberry32(hashString(key));
}

/** Same attempt seed + item id always gives the same order. "No sé" is last. */
export function orderedOptions(item: Pick<EvalItem, "id" | "options">, seed: number): EvalOption[] {
  const random = seededRandom(`${seed}:${item.id}`);
  const shuffled = [...item.options];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [...shuffled, { id: NO_SE_OPTION_ID, text: NO_SE_LABEL }];
}

const PLACEMENT_ROLES: ItemRole[] = ["placement", "rotation"];
const CONFIRMATION_ROLES: ItemRole[] = ["confirmation", "rotation"];

function pickItem(
  items: EvalItem[],
  roles: ItemRole[],
  servable: Set<ItemStatus>,
  excluded: Set<string>,
): EvalItem | null {
  for (const role of roles) {
    const match = items.find(
      (item) => item.role === role && servable.has(item.status) && !excluded.has(item.id),
    );
    if (match) return match;
  }
  return null;
}

export type BankIndex = {
  structuresByTrack: Map<Track, EvalStructure[]>;
  itemsByStructure: Map<string, EvalItem[]>;
};

export function indexBank(structures: EvalStructure[], items: EvalItem[]): BankIndex {
  const structuresByTrack = new Map<Track, EvalStructure[]>();
  for (const structure of [...structures].sort((a, b) => a.position - b.position)) {
    const list = structuresByTrack.get(structure.track) ?? [];
    list.push(structure);
    structuresByTrack.set(structure.track, list);
  }
  const itemsByStructure = new Map<string, EvalItem[]>();
  for (const item of [...items].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = itemsByStructure.get(item.structureId) ?? [];
    list.push(item);
    itemsByStructure.set(item.structureId, list);
  }
  return { structuresByTrack, itemsByStructure };
}

/**
 * One item per structure in track order. A retake gets the rotation item when
 * the placement item was already seen; with no fresh item left, the placement
 * item repeats rather than skipping the structure.
 */
export function drawPlacementPass(
  bank: BankIndex,
  track: Track,
  servable: Set<ItemStatus>,
  seen: Set<string>,
): string[] {
  const itemIds: string[] = [];
  for (const structure of bank.structuresByTrack.get(track) ?? []) {
    const items = bank.itemsByStructure.get(structure.id) ?? [];
    const item =
      pickItem(items, PLACEMENT_ROLES, servable, seen) ??
      pickItem(items, PLACEMENT_ROLES, servable, new Set());
    if (item) itemIds.push(item.id);
  }
  return itemIds;
}

/** Fresh items only: a structure with nothing unseen is skipped, never repeated. */
export function drawConfirmationPass(
  bank: BankIndex,
  structureIds: string[],
  servable: Set<ItemStatus>,
  excluded: Set<string>,
): string[] {
  const itemIds: string[] = [];
  for (const structureId of structureIds) {
    const item = pickItem(
      bank.itemsByStructure.get(structureId) ?? [],
      CONFIRMATION_ROLES,
      servable,
      excluded,
    );
    if (item) itemIds.push(item.id);
  }
  return itemIds;
}

export function hasServableBank(bank: BankIndex, servable: Set<ItemStatus>): boolean {
  for (const items of bank.itemsByStructure.values()) {
    if (items.some((item) => item.role === "placement" && servable.has(item.status))) return true;
  }
  return false;
}
