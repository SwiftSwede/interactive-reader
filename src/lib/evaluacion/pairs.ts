import { seededRandom } from "./draw";
import type { HoleStatus, PairItem } from "./types";

export type { PairItem };

/**
 * Minimal-pair listening bank (Slice 97b). Word pairs are Kyle's list,
 * verbatim, from docs/PRD-slice-97-evaluacion.md. The spec header says 14
 * pairs; the list has 11 (7 consonant + 4 vowel). Add rows here when Kyle
 * sends the other three.
 */
export type PairKind = "consonant" | "vowel";

export type MinimalPair = {
  id: string;
  kind: PairKind;
  /** IPA, shown on the report. */
  sounds: [string, string];
  words: [string, string][];
};

function split(list: string): [string, string][] {
  return list.split(", ").map((pair) => {
    const [a, b] = pair.split("/");
    return [a.trim(), b.trim()];
  });
}

export const MINIMAL_PAIRS: MinimalPair[] = [
  {
    id: "bv",
    kind: "consonant",
    sounds: ["b", "v"],
    words: split("van/ban, live/lib, vat/bat, vowel/bowel, vole/bowl, vest/best, very/berry, dove/dub"),
  },
  {
    id: "sz",
    kind: "consonant",
    sounds: ["s", "z"],
    words: split("sit/zit, bus/buzz, ass/as, floss/flaws, sue/zoo, loose/lose, face/phase"),
  },
  {
    id: "dTH",
    kind: "consonant",
    sounds: ["d", "ð"],
    words: split("den/then, sued/soothe, breed/breathe, dare/their, does/those, diss/this, laid/lathe"),
  },
  {
    id: "tTH",
    kind: "consonant",
    sounds: ["t", "θ"],
    words: split("tin/thin, wit/with, boat/both, clot/cloth, tore/Thor, pat/path"),
  },
  {
    id: "chSH",
    kind: "consonant",
    sounds: ["tʃ", "ʃ"],
    words: split("much/mush, chore/shore, march/marsh, chalk/shock, chop/shop, witch/wish"),
  },
  {
    id: "yJ",
    kind: "consonant",
    sounds: ["j", "dʒ"],
    words: split("yellow/jello, yawn/John, yam/jam, you/Jew, yolk/joke, yak/Jack, yell/gel"),
  },
  {
    id: "nNG",
    kind: "consonant",
    sounds: ["n", "ŋ"],
    words: split("sinner/singer, sun/sung, win/wing, sit in/sitting, ran/rang, thin/thing, ban/bang"),
  },
  {
    id: "ShortUvsShortA",
    kind: "vowel",
    sounds: ["ʌ", "æ"],
    words: split(
      "sunned/sand, bus/bass, but/bat, uncle/ankle, much/match, tummy/Tammy, rut/rat, cut/cat",
    ),
  },
  {
    id: "LongEvsShorti",
    kind: "vowel",
    sounds: ["i", "ɪ"],
    words: split("sheet/shit, beach/bitch, leave/live, seen/sin, peace/piss, ween/win, sheen/shin"),
  },
  {
    id: "LongUvsAngryMonkey",
    kind: "vowel",
    sounds: ["u", "ʊ"],
    words: split("pool/pull, Luke/look, wooed/would, shooed/should, fool/full, cooed/could, suit/soot"),
  },
  {
    id: "LongOvsListerine",
    kind: "vowel",
    sounds: ["oʊ", "ɑ"],
    words: split(
      "stoke/stalk, coat/caught, phoned/fawned, note/not, boat/bought, joke/jock, shoal/shawl, won't/want",
    ),
  },
];

export const PAIRS_PER_KIND = 2;
export const ITEMS_PER_PAIR = 3;
export const PAIR_OPTION_IDS = ["pa", "pb"] as const;
export type PairOptionId = (typeof PAIR_OPTION_IDS)[number];

const PAIR_ITEM_PREFIX = "pair.";

const pairsById = new Map(MINIMAL_PAIRS.map((pair) => [pair.id, pair]));

export function getPair(pairId: string): MinimalPair | undefined {
  return pairsById.get(pairId);
}

export function pairItemId(pairId: string, index: number): string {
  return `${PAIR_ITEM_PREFIX}${pairId}.${index}`;
}

export function isPairItemId(itemId: string): boolean {
  return itemId.startsWith(PAIR_ITEM_PREFIX);
}

export function pairIdOf(itemId: string): string | null {
  if (!isPairItemId(itemId)) return null;
  return itemId.slice(PAIR_ITEM_PREFIX.length).split(".")[0] || null;
}

/** `public/audio/minimal-pairs/{pair_id}/{word}.mp3`, word lowercased, spaces to dashes, no apostrophes. */
export function pairAudioPath(pairId: string, word: string): string {
  const file = word.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, "-");
  return `/audio/minimal-pairs/${pairId}/${file}.mp3`;
}

function shuffled<T>(list: T[], random: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 2 consonant + 2 vowel pairs. Unseen pairs first; seen ones only fill a gap. */
export function samplePairs(seenPairIds: Set<string>, seedKey: string): string[] {
  const random = seededRandom(`${seedKey}:pairs`);
  const chosen: string[] = [];
  for (const kind of ["consonant", "vowel"] as const) {
    const pool = shuffled(
      MINIMAL_PAIRS.filter((pair) => pair.kind === kind),
      random,
    );
    const fresh = pool.filter((pair) => !seenPairIds.has(pair.id));
    const seen = pool.filter((pair) => seenPairIds.has(pair.id));
    chosen.push(...[...fresh, ...seen].slice(0, PAIRS_PER_KIND).map((pair) => pair.id));
  }
  return chosen;
}

/** Three different word pairs per sound pair; which word plays is random. */
export function drawPairItems(pairIds: string[], seedKey: string): PairItem[] {
  const random = seededRandom(`${seedKey}:pair-items`);
  const items: PairItem[] = [];
  for (const pairId of pairIds) {
    const pair = getPair(pairId);
    if (!pair) continue;
    shuffled(pair.words, random)
      .slice(0, ITEMS_PER_PAIR)
      .forEach(([a, b], index) => {
        items.push({
          id: pairItemId(pairId, index),
          pairId,
          options: [a, b],
          word: random() < 0.5 ? a : b,
        });
      });
  }
  return items;
}

export function pairOptionText(item: PairItem, optionId: string): string | null {
  const index = PAIR_OPTION_IDS.indexOf(optionId as PairOptionId);
  return index === -1 ? null : item.options[index];
}

export function correctPairOption(item: PairItem): PairOptionId {
  return item.options[0] === item.word ? "pa" : "pb";
}

export type PairAnswer = { itemId: string; selectedWord: string; isCorrect: boolean };

export type PairVerdict = {
  pairId: string;
  sounds: [string, string];
  /** null = heard them all right. */
  status: HoleStatus | null;
  wrong: number;
  total: number;
  /** First miss: "dije said, escuchaste heard". */
  said: string | null;
  heard: string | null;
};

/** 2+ wrong of 3 = confirmed listening gap (a guesser passes 1/8); 1 wrong = candidate. */
export function pairVerdicts(items: PairItem[], answers: Map<string, PairAnswer>): PairVerdict[] {
  const order: string[] = [];
  const byPair = new Map<string, PairItem[]>();
  for (const item of items) {
    if (!byPair.has(item.pairId)) order.push(item.pairId);
    byPair.set(item.pairId, [...(byPair.get(item.pairId) ?? []), item]);
  }

  return order.flatMap((pairId) => {
    const pair = getPair(pairId);
    if (!pair) return [];
    const pairItems = byPair.get(pairId) ?? [];
    const answered = pairItems.filter((item) => answers.has(item.id));
    const misses = answered.filter((item) => !answers.get(item.id)?.isCorrect);
    const first = misses[0];
    return [
      {
        pairId,
        sounds: pair.sounds,
        status: misses.length >= 2 ? "confirmed" : misses.length === 1 ? "candidate" : null,
        wrong: misses.length,
        total: answered.length,
        said: first ? first.word : null,
        heard: first ? (answers.get(first.id)?.selectedWord ?? null) : null,
      },
    ];
  });
}
