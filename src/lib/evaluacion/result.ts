import { computeHoles } from "./engine";
import {
  EGP_LEVELS,
  NO_SE_OPTION_ID,
  type AnswerRecord,
  type EvalItem,
  type EvalStructure,
  type HoleStatus,
  type ItemFormat,
  type JourneyPass,
  type Outcome,
  type PassKind,
  type StructureKind,
  type Track,
} from "./types";
import type { SessionType } from "@/lib/activities";
import { NO_SE_LABEL } from "./draw";

export type HoleSummary = {
  structureId: string;
  nameEs: string;
  kind: StructureKind;
  classType: SessionType;
  status: HoleStatus;
};

export type ReviewEntry = {
  itemId: string;
  passKind: PassKind;
  format: ItemFormat;
  prompt: string;
  structureName: string;
  selectedText: string;
  correctText: string;
  isCorrect: boolean;
  choseNoSe: boolean;
  ruleText: string;
};

export type EvalResult = {
  outcome: Outcome;
  placedTrack: Track;
  confirmed: HoleSummary[];
  candidates: HoleSummary[];
  review: ReviewEntry[];
};

function byFoundation(structuresById: Map<string, EvalStructure>) {
  return (a: HoleSummary, b: HoleSummary) => {
    const left = structuresById.get(a.structureId);
    const right = structuresById.get(b.structureId);
    const level =
      EGP_LEVELS.indexOf(left?.egpLevel ?? "C2") - EGP_LEVELS.indexOf(right?.egpLevel ?? "C2");
    return level !== 0 ? level : (left?.position ?? 0) - (right?.position ?? 0);
  };
}

/** Result + review for a finished attempt. Wrong answers come first. No score. */
export function buildResult(args: {
  journey: JourneyPass[];
  answers: Map<string, AnswerRecord>;
  itemsById: Map<string, EvalItem>;
  structuresById: Map<string, EvalStructure>;
  outcome: Outcome;
  placedTrack: Track;
}): EvalResult {
  const { journey, answers, itemsById, structuresById } = args;
  const holes = computeHoles(journey, answers, itemsById);

  const summaries: HoleSummary[] = [];
  for (const [structureId, status] of holes) {
    const structure = structuresById.get(structureId);
    if (!structure) continue;
    summaries.push({
      structureId,
      nameEs: structure.displayNameEs,
      kind: structure.kind,
      classType: structure.classType,
      status,
    });
  }
  const order = byFoundation(structuresById);

  const wrong: ReviewEntry[] = [];
  const right: ReviewEntry[] = [];
  for (const pass of journey) {
    for (const itemId of pass.itemIds) {
      const answer = answers.get(itemId);
      const item = itemsById.get(itemId);
      if (!answer || !item) continue;
      const optionText = (id: string) =>
        id === NO_SE_OPTION_ID ? NO_SE_LABEL : item.options.find((o) => o.id === id)?.text ?? "";
      const entry: ReviewEntry = {
        itemId,
        passKind: pass.kind,
        format: item.format,
        prompt: item.prompt,
        structureName: structuresById.get(item.structureId)?.displayNameEs ?? "",
        selectedText: optionText(answer.selectedOptionId),
        correctText: optionText(item.correctOptionId),
        isCorrect: answer.isCorrect,
        choseNoSe: answer.selectedOptionId === NO_SE_OPTION_ID,
        ruleText: item.ruleText,
      };
      (answer.isCorrect ? right : wrong).push(entry);
    }
  }

  return {
    outcome: args.outcome,
    placedTrack: args.placedTrack,
    confirmed: summaries.filter((hole) => hole.status === "confirmed").sort(order),
    candidates: summaries.filter((hole) => hole.status === "candidate").sort(order),
    review: [...wrong, ...right],
  };
}
