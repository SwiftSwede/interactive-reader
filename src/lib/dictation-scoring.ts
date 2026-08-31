// ── Dictation scoring (Phase 4, slice 37) ──────────────────
//
// Word-level comparison between what the learner typed and the reference
// sentence. Practice guidance, never a grade: the number exists so the app can
// tell "this sound needs more practice" from "this one landed".
//
// Pure and server-side. The client sends text, never an accuracy number.

export type DictationWordResult = {
  expected: string;
  typed: string | null;
  correct: boolean;
};

export type DictationScore = {
  accuracy: number; // 0 to 1
  correctCount: number;
  totalCount: number;
  missedWords: string[];
  words: DictationWordResult[];
};

/**
 * Lowercase, strip punctuation, keep inner apostrophes so "don't" stays one
 * token. The exercise tests listening, not typing punctuation.
 */
export function normalizeDictationWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/[^a-z0-9']/g, "");
}

export function tokenizeDictation(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeDictationWord)
    .filter((word) => word.length > 0);
}

/**
 * Aligns the typed sentence against the reference with a longest-common-
 * subsequence match, so one missing word does not mark every later word wrong.
 */
export function scoreDictation(
  referenceText: string,
  typedText: string
): DictationScore {
  const expected = tokenizeDictation(referenceText);
  const typed = tokenizeDictation(typedText);

  if (expected.length === 0) {
    return {
      accuracy: 0,
      correctCount: 0,
      totalCount: 0,
      missedWords: [],
      words: [],
    };
  }

  // lcs[i][j] = matches between expected[i..] and typed[j..]
  const lcs: number[][] = Array.from({ length: expected.length + 1 }, () =>
    new Array<number>(typed.length + 1).fill(0)
  );

  for (let i = expected.length - 1; i >= 0; i -= 1) {
    for (let j = typed.length - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        expected[i] === typed[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const words: DictationWordResult[] = [];
  const missedWords: string[] = [];
  let i = 0;
  let j = 0;

  while (i < expected.length) {
    if (j < typed.length && expected[i] === typed[j]) {
      words.push({ expected: expected[i], typed: typed[j], correct: true });
      i += 1;
      j += 1;
      continue;
    }

    // Advance whichever side the alignment says to skip.
    if (j < typed.length && lcs[i][j + 1] > lcs[i + 1][j]) {
      j += 1;
      continue;
    }

    words.push({ expected: expected[i], typed: null, correct: false });
    missedWords.push(expected[i]);
    i += 1;
  }

  const correctCount = words.filter((word) => word.correct).length;

  return {
    accuracy: correctCount / expected.length,
    correctCount,
    totalCount: expected.length,
    missedWords,
    words,
  };
}

/**
 * Below this share of words matched, the story's sounds go to
 * needs_more_practice. Chosen so a single slip in a short sentence does not
 * flag the learner, but half a sentence missed does.
 */
export const DICTATION_PRACTICE_THRESHOLD = 0.8;

export function dictationNeedsMorePractice(score: DictationScore): boolean {
  return score.totalCount > 0 && score.accuracy < DICTATION_PRACTICE_THRESHOLD;
}
