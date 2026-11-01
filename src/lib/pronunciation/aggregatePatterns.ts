import {
  aggregatePhonemePatterns,
  type PhonemePattern,
  type SpokenWord,
} from "./aggregatePhonemes";
import { azurePhonemeToIpa } from "./azure-ipa";
import {
  MAX_PATTERNS_SHOWN,
  QUALITY_MIN_INSTANCES,
  REFERENCE_GAP_POINTS,
  REFERENCE_MIN_INSTANCES,
  RELATIVE_SAG_POINTS,
} from "./speakingFeedbackConfig";

/** Vowels the Spanish lens treats as close to a Spanish vowel. Quality feedback, not a swap. */
const SPANISH_NEAR_VOWELS = new Set([
  "æ",
  "ɛ",
  "ɪ",
  "ʊ",
  "ɑ",
  "ʌ",
  "ə",
  "iː",
  "uː",
  "eɪ",
  "oʊ",
  "aɪ",
  "aʊ",
  "ɔɪ",
]);

export type PatternSignal = "sag" | "reference" | "both" | "absolute";

export type SpeakingPattern = PhonemePattern & {
  signal: PatternSignal;
  gap: number;
  feedbackShape: "quality" | "substitution";
};

export type SpeakingAggregate = {
  patterns: SpeakingPattern[];
  mangledWords: string[];
  baseline: number;
};

type PhonemeBucket = {
  phoneme: string;
  scores: number[];
  words: string[];
};

function cleanWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function collect(words: SpokenWord[]): {
  baseline: number;
  groups: Map<string, PhonemeBucket>;
} {
  const groups = new Map<string, PhonemeBucket>();
  const scores: number[] = [];
  for (const entry of words) {
    const word = cleanWord(entry.word);
    if (!word) continue;
    for (const phoneme of entry.phonemes) {
      const ipa = azurePhonemeToIpa(phoneme.phoneme);
      if (!ipa) continue;
      scores.push(phoneme.accuracy);
      const group = groups.get(ipa) ?? {
        phoneme: phoneme.phoneme,
        scores: [],
        words: [],
      };
      group.scores.push(phoneme.accuracy);
      if (!group.words.includes(word) && group.words.length < 3) {
        group.words.push(word);
      }
      groups.set(ipa, group);
    }
  }
  const baseline =
    scores.length === 0
      ? 0
      : scores.reduce((total, score) => total + score, 0) / scores.length;
  return { baseline, groups };
}

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function phonemeGaps(
  words: SpokenWord[],
  referenceWords: SpokenWord[]
): { ipa: string; gap: number; studentCount: number; referenceCount: number }[] {
  const student = collect(words);
  const reference = collect(referenceWords);
  const rows = [];
  for (const [ipa, group] of student.groups) {
    const ref = reference.groups.get(ipa);
    if (!ref) continue;
    rows.push({
      ipa,
      gap: average(ref.scores) - average(group.scores),
      studentCount: group.scores.length,
      referenceCount: ref.scores.length,
    });
  }
  return rows.sort((a, b) => b.gap - a.gap);
}

export function selectSpeakingPatterns(
  words: SpokenWord[],
  referenceWords: SpokenWord[] | null
): SpeakingAggregate {
  const student = collect(words);
  const reference = referenceWords ? collect(referenceWords) : null;
  const merged = new Map<string, SpeakingPattern>();

  for (const [ipa, group] of student.groups) {
    if (group.scores.length < QUALITY_MIN_INSTANCES) continue;
    const avg = average(group.scores);
    const sag = student.baseline - avg;
    if (sag < RELATIVE_SAG_POINTS) continue;
    merged.set(ipa, patternFrom(ipa, group, avg, "sag", sag));
  }

  if (reference) {
    for (const [ipa, group] of student.groups) {
      if (group.scores.length < REFERENCE_MIN_INSTANCES) continue;
      const ref = reference.groups.get(ipa);
      if (!ref || ref.scores.length < REFERENCE_MIN_INSTANCES) continue;
      const gap = average(ref.scores) - average(group.scores);
      if (gap < REFERENCE_GAP_POINTS) continue;
      const existing = merged.get(ipa);
      const avg = average(group.scores);
      if (existing && existing.signal === "sag") {
        merged.set(ipa, {
          ...patternFrom(ipa, group, avg, "both", Math.max(existing.gap, gap)),
        });
      } else if (!existing) {
        merged.set(ipa, patternFrom(ipa, group, avg, "reference", gap));
      }
    }
  }

  const quality = [...merged.values()].sort((a, b) => {
    if (b.gap !== a.gap) return b.gap - a.gap;
    return b.instanceCount - a.instanceCount;
  });

  const severe = aggregatePhonemePatterns(words).patterns.map((item) =>
    patternFrom(
      item.ipaDisplay,
      {
        phoneme: item.phoneme,
        scores: Array.from({ length: item.instanceCount }, () => item.avgAccuracy),
        words: item.exampleWords,
      },
      item.avgAccuracy,
      "absolute",
      Math.max(0, 60 - item.avgAccuracy)
    )
  );

  const chosen = new Set(quality.map((item) => item.ipaDisplay));
  const patterns = [
    ...quality,
    ...severe.filter((item) => !chosen.has(item.ipaDisplay)),
  ].slice(0, MAX_PATTERNS_SHOWN);

  return {
    patterns,
    mangledWords: aggregatePhonemePatterns(words).mangledWords,
    baseline: Math.round(student.baseline),
  };
}

function patternFrom(
  ipa: string,
  group: PhonemeBucket,
  avg: number,
  signal: PatternSignal,
  gap: number
): SpeakingPattern {
  const quality =
    signal !== "absolute" && SPANISH_NEAR_VOWELS.has(ipa);
  return {
    phoneme: group.phoneme,
    ipaDisplay: ipa,
    instanceCount: group.scores.length,
    avgAccuracy: Math.round(avg),
    exampleWords: group.words,
    signal,
    gap: Math.round(gap * 10) / 10,
    feedbackShape: quality ? "quality" : "substitution",
  };
}
