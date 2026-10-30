import type { SessionType } from "@/lib/activities";

export const TRACKS = ["beginner", "pre_int", "int", "upper"] as const;
export type Track = (typeof TRACKS)[number];

export const OPENERS = [
  "no_se_nada",
  "principiante",
  "armo_oraciones",
  "converso",
  "pulir",
] as const;
export type Opener = (typeof OPENERS)[number];

export const EGP_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type EgpLevel = (typeof EGP_LEVELS)[number];

export type StructureKind = "grammar" | "vocabulary";
export type ItemRole = "placement" | "confirmation" | "rotation";
export type ItemFormat = "translation" | "fill_blank" | "mc";
export type ItemStatus = "draft" | "approved" | "retired";

export const NO_SE_OPTION_ID = "no_se";

export type EvalStructure = {
  id: string;
  track: Track;
  kind: StructureKind;
  displayNameEs: string;
  egpRef: string | null;
  egpLevel: EgpLevel;
  l1Focus: boolean;
  classType: SessionType;
  position: number;
};

export type EvalOption = { id: string; text: string };

export type EvalItem = {
  id: string;
  structureId: string;
  role: ItemRole;
  format: ItemFormat;
  prompt: string;
  options: EvalOption[];
  correctOptionId: string;
  ruleText: string;
  status: ItemStatus;
};

export type PassKind = "placement" | "confirmation";

export type JourneyPass = {
  kind: PassKind;
  track: Track;
  itemIds: string[];
};

export type Band = "promote" | "settle" | "demote";

export type Outcome = "settled" | "top" | "gentle";

/** One answered item, as the engine sees it. */
export type AnswerRecord = {
  itemId: string;
  selectedOptionId: string;
  isCorrect: boolean;
};

export type HoleStatus = "candidate" | "confirmed";
