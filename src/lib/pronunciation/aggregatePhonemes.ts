import { azurePhonemeToIpa } from "./azure-ipa";
import {
  MAX_MANGLED_WORDS_SHOWN,
  MAX_PATTERNS_SHOWN,
  PATTERN_MIN_INSTANCES,
  PHONEME_ERROR_THRESHOLD,
  WORD_MANGLE_THRESHOLD,
} from "./speakingFeedbackConfig";

export type SpokenPhoneme = {
  phoneme: string;
  accuracy: number;
};

export type SpokenWord = {
  word: string;
  accuracy: number;
  phonemes: SpokenPhoneme[];
};

export type PhonemePattern = {
  phoneme: string;
  ipaDisplay: string;
  instanceCount: number;
  avgAccuracy: number;
  exampleWords: string[];
};

export type PhonemeAggregate = {
  patterns: PhonemePattern[];
  mangledWords: string[];
};

function cleanWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function aggregatePhonemePatterns(
  words: SpokenWord[]
): PhonemeAggregate {
  const groups = new Map<
    string,
    { phoneme: string; scores: number[]; words: string[] }
  >();

  for (const entry of words) {
    const word = cleanWord(entry.word);
    if (!word) continue;
    for (const phoneme of entry.phonemes) {
      if (phoneme.accuracy > PHONEME_ERROR_THRESHOLD) continue;
      const ipa = azurePhonemeToIpa(phoneme.phoneme);
      if (!ipa) continue;
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

  const patterns = [...groups.entries()]
    .filter(([, group]) => group.scores.length >= PATTERN_MIN_INSTANCES)
    .map(([ipaDisplay, group]) => {
      const sum = group.scores.reduce((total, score) => total + score, 0);
      return {
        phoneme: group.phoneme,
        ipaDisplay,
        instanceCount: group.scores.length,
        avgAccuracy: Math.round(sum / group.scores.length),
        exampleWords: group.words,
      };
    })
    .sort((a, b) => {
      if (b.instanceCount !== a.instanceCount) {
        return b.instanceCount - a.instanceCount;
      }
      return a.avgAccuracy - b.avgAccuracy;
    })
    .slice(0, MAX_PATTERNS_SHOWN);

  const worstByWord = new Map<string, number>();
  for (const entry of words) {
    const word = cleanWord(entry.word);
    if (!word || entry.accuracy > WORD_MANGLE_THRESHOLD) continue;
    const previous = worstByWord.get(word);
    if (previous === undefined || entry.accuracy < previous) {
      worstByWord.set(word, entry.accuracy);
    }
  }

  const mangledWords = [...worstByWord.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX_MANGLED_WORDS_SHOWN)
    .map(([word]) => word);

  return { patterns, mangledWords };
}
