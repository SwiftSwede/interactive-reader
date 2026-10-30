import { orderedOptions } from "./draw";
import { trackIndex } from "./engine";
import type { EvalResult } from "./result";
import type {
  AnswerRecord,
  EvalItem,
  EvalOption,
  ItemFormat,
  JourneyPass,
  PassKind,
  Track,
} from "./types";

/** What the client may see before the quiz ends: no key, no rule. */
export type QuestionView = {
  itemId: string;
  format: ItemFormat;
  prompt: string;
  options: EvalOption[];
  isDraft: boolean;
};

export type PassProgress = {
  passKind: PassKind;
  track: Track;
  answered: number;
  total: number;
  passNumber: number;
};

export type Transition = "promote" | "demote" | "confirmation";

export type EvalView =
  | {
      screen: "question";
      question: QuestionView;
      progress: PassProgress;
      transition: Transition | null;
    }
  | { screen: "result"; result: EvalResult; emailCaptured: boolean }
  | { screen: "redirected"; url: string };

/** How the latest pass was reached. `null` for the first pass. */
export function transitionInto(journey: JourneyPass[]): Transition | null {
  const current = journey[journey.length - 1];
  if (!current || journey.length < 2) return null;
  if (current.kind === "confirmation") return "confirmation";
  const previous = journey
    .slice(0, -1)
    .findLast((pass) => pass.kind === "placement");
  if (!previous) return null;
  return trackIndex(current.track) > trackIndex(previous.track) ? "promote" : "demote";
}

/** The first unanswered item of the latest pass, or null when the pass is done. */
export function currentItemId(
  journey: JourneyPass[],
  answers: Map<string, AnswerRecord>,
): string | null {
  const current = journey[journey.length - 1];
  return current?.itemIds.find((itemId) => !answers.has(itemId)) ?? null;
}

export function questionView(args: {
  journey: JourneyPass[];
  answers: Map<string, AnswerRecord>;
  itemsById: Map<string, EvalItem>;
  seed: number;
  showDraftBadge: boolean;
}): Extract<EvalView, { screen: "question" }> | null {
  const { journey, answers, itemsById, seed, showDraftBadge } = args;
  const current = journey[journey.length - 1];
  const itemId = currentItemId(journey, answers);
  const item = itemId ? itemsById.get(itemId) : undefined;
  if (!current || !item) return null;

  const answered = current.itemIds.filter((id) => answers.has(id)).length;
  return {
    screen: "question",
    question: {
      itemId: item.id,
      format: item.format,
      prompt: item.prompt,
      options: orderedOptions(item, seed),
      isDraft: showDraftBadge && item.status === "draft",
    },
    progress: {
      passKind: current.kind,
      track: current.track,
      answered,
      total: current.itemIds.length,
      passNumber: journey.length,
    },
    transition: answered === 0 ? transitionInto(journey) : null,
  };
}
