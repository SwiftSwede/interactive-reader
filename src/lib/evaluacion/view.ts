import { orderedOptions } from "./draw";
import { trackIndex } from "./engine";
import { PAIR_OPTION_IDS, type PairVerdict } from "./pairs";
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

export type QuestionFormat = ItemFormat | "minimal_pair";

/** What the client may see before the quiz ends: no key, no rule, no played word. */
export type QuestionView = {
  itemId: string;
  format: QuestionFormat;
  prompt: string;
  options: EvalOption[];
  /** Minimal pairs only. Served by the API so the file name can't give the word away. */
  audioUrl: string | null;
  isDraft: boolean;
};

export type PassProgress = {
  passKind: PassKind;
  track: Track;
  answered: number;
  total: number;
  passNumber: number;
};

export type Transition = "promote" | "demote" | "confirmation" | "pairs";

export type EvalView =
  | {
      screen: "question";
      question: QuestionView;
      progress: PassProgress;
      transition: Transition | null;
    }
  | {
      screen: "result";
      result: EvalResult;
      listening: PairVerdict[];
      emailCaptured: boolean;
    }
  | { screen: "redirected"; url: string };

export const PAIR_AUDIO_ROUTE = "/api/evaluacion/pair-audio";

/** How the latest pass was reached. `null` for the first pass. */
export function transitionInto(journey: JourneyPass[]): Transition | null {
  const current = journey[journey.length - 1];
  if (!current || journey.length < 2) return null;
  if (current.kind === "pairs") return "pairs";
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

function pairQuestion(pass: JourneyPass, itemId: string): QuestionView | null {
  const item = pass.pairItems?.find((pairItem) => pairItem.id === itemId);
  if (!item) return null;
  return {
    itemId: item.id,
    format: "minimal_pair",
    prompt: "",
    options: item.options.map((text, index) => ({ id: PAIR_OPTION_IDS[index], text })),
    audioUrl: `${PAIR_AUDIO_ROUTE}?item=${encodeURIComponent(item.id)}`,
    isDraft: false,
  };
}

function bankQuestion(
  item: EvalItem | undefined,
  seed: number,
  showDraftBadge: boolean,
): QuestionView | null {
  if (!item) return null;
  return {
    itemId: item.id,
    format: item.format,
    prompt: item.prompt,
    options: orderedOptions(item, seed),
    audioUrl: null,
    isDraft: showDraftBadge && item.status === "draft",
  };
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
  if (!current || !itemId) return null;

  const question =
    current.kind === "pairs"
      ? pairQuestion(current, itemId)
      : bankQuestion(itemsById.get(itemId), seed, showDraftBadge);
  if (!question) return null;

  const answered = current.itemIds.filter((id) => answers.has(id)).length;
  return {
    screen: "question",
    question,
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
