import { createHash } from "node:crypto";
import type { SessionType } from "@/lib/activities";
import type { EgpLevel, ItemFormat, ItemStatus, StructureKind, Track } from "./types";

export type SeedItem = {
  format: ItemFormat;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
  source: string;
  /** Overrides the structure rule when this item needs its own line. */
  rule?: string;
};

export type SeedStructure = {
  id: string;
  track: Track;
  kind: StructureKind;
  nameEs: string;
  egpRef: string | null;
  egpLevel: EgpLevel;
  l1Focus: boolean;
  classType: SessionType;
  rule: string;
  placement: SeedItem;
  confirmation: SeedItem;
};

export type StructureRow = {
  id: string;
  track: Track;
  kind: StructureKind;
  display_name_es: string;
  egp_ref: string | null;
  egp_level: EgpLevel;
  l1_focus: boolean;
  class_type: SessionType;
  position: number;
};

/** Content columns the seeder owns. `status` is Kyle's and is only set on insert. */
export type ItemContentRow = {
  id: string;
  structure_id: string;
  role: "placement" | "confirmation";
  format: ItemFormat;
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  rule_text: string;
  source: string;
};

export const DEFAULT_SEED_STATUS: ItemStatus = "draft";

/** Opaque, stable option ids so the browser cannot read the key from them. */
export function optionId(itemId: string, text: string): string {
  return `o${createHash("sha256").update(`${itemId}|${text}`).digest("hex").slice(0, 8)}`;
}

function itemRow(
  structure: SeedStructure,
  role: "placement" | "confirmation",
  item: SeedItem,
): ItemContentRow {
  const id = `${structure.id}.${role === "placement" ? "p1" : "c1"}`;
  const texts = [item.correct, ...item.wrong];
  return {
    id,
    structure_id: structure.id,
    role,
    format: item.format,
    prompt: item.prompt,
    options: texts.map((text) => ({ id: optionId(id, text), text })),
    correct_option_id: optionId(id, item.correct),
    rule_text: item.rule ?? structure.rule,
    source: item.source,
  };
}

export function toRows(bank: SeedStructure[]): {
  structures: StructureRow[];
  items: ItemContentRow[];
} {
  const positions = new Map<Track, number>();
  const structures: StructureRow[] = [];
  const items: ItemContentRow[] = [];
  for (const structure of bank) {
    const position = (positions.get(structure.track) ?? 0) + 1;
    positions.set(structure.track, position);
    structures.push({
      id: structure.id,
      track: structure.track,
      kind: structure.kind,
      display_name_es: structure.nameEs,
      egp_ref: structure.egpRef,
      egp_level: structure.egpLevel,
      l1_focus: structure.l1Focus,
      class_type: structure.classType,
      position,
    });
    items.push(itemRow(structure, "placement", structure.placement));
    items.push(itemRow(structure, "confirmation", structure.confirmation));
  }
  return { structures, items };
}

const EM_DASH = "\u2014";

/** Problems that would make an item unfair or unsafe to serve. Empty = clean. */
export function validateBank(bank: SeedStructure[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const structure of bank) {
    if (ids.has(structure.id)) problems.push(`${structure.id}: duplicate structure id`);
    ids.add(structure.id);
    if (!/^[a-z0-9_]+$/.test(structure.id)) problems.push(`${structure.id}: id must be a slug`);
    if (!structure.rule.trim()) problems.push(`${structure.id}: missing rule`);
    for (const [role, item] of [
      ["placement", structure.placement],
      ["confirmation", structure.confirmation],
    ] as const) {
      const label = `${structure.id}.${role}`;
      const texts = [item.correct, ...item.wrong];
      if (new Set(texts.map((text) => text.trim().toLowerCase())).size !== 4) {
        problems.push(`${label}: options must be 4 distinct texts`);
      }
      if (texts.some((text) => !text.trim())) problems.push(`${label}: empty option`);
      if (texts.some((text) => text.trim().toLowerCase() === "no sé")) {
        problems.push(`${label}: "No sé" is added by code, not authored`);
      }
      if (item.format === "fill_blank" && !item.prompt.includes("_____")) {
        problems.push(`${label}: fill_blank prompt needs _____`);
      }
      const allText = [item.prompt, ...texts, item.rule ?? structure.rule, structure.nameEs];
      if (allText.some((text) => text.includes(EM_DASH))) problems.push(`${label}: em dash`);
      if (allText.some((text) => /&#?\w+;/.test(text))) problems.push(`${label}: HTML entity`);
    }
  }
  return problems;
}
