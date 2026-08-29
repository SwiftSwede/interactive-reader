import guideFile from "./latam-enus-sounds-guide.v1.json";
import { azurePhonemeToIpa } from "./azure-ipa";
import type { PhonemeEntry } from "./types";
import { WEAK_SOUND_MAX } from "./thresholds";

type GuideTarget = {
  id?: string;
  ipa?: string;
};

const BUILTIN_FOCUS: Record<string, string> = {
  r_sound: "ɹ",
  v_b: "v",
  vowel_i: "ɪ",
  vowel_ae: "æ",
  vowel_uh: "ʌ",
  schwa_reduction: "ə",
  sh_sound: "ʃ",
};

function guideTargets(): GuideTarget[] {
  const guide = guideFile as {
    targets?: { vowels?: GuideTarget[]; consonants?: GuideTarget[] };
  };
  return [...(guide.targets?.vowels ?? []), ...(guide.targets?.consonants ?? [])];
}

function ipaCandidates(raw: string): string[] {
  return raw
    .split(/[/,]/)
    .map((part) => azurePhonemeToIpa(part.trim()))
    .filter((part) => part.length > 0);
}

function weakestMatching(
  phonemes: PhonemeEntry[],
  candidates: string[]
): string | null {
  const matches = phonemes
    .filter((entry) => candidates.includes(entry.phoneme))
    .sort((a, b) => a.accuracy - b.accuracy);
  return matches[0]?.phoneme ?? null;
}

function ipaFromGuideReason(
  reasonCode: string,
  phonemes: PhonemeEntry[]
): string | null {
  if (!reasonCode.startsWith("guide_")) return null;
  const id = reasonCode.slice("guide_".length);
  const target = guideTargets().find((item) => item.id === id);
  if (!target?.ipa) return null;
  const candidates = ipaCandidates(target.ipa);
  return weakestMatching(phonemes, candidates) ?? candidates[0] ?? null;
}

export function focusPhonemeAccuracy(
  phonemes: PhonemeEntry[],
  reasonCodes: string[] | undefined
): number | null {
  const ipa = focusIpaForIssue(reasonCodes, phonemes);
  if (!ipa) return null;
  const scores = phonemes
    .filter((entry) => entry.phoneme === ipa)
    .map((entry) => entry.accuracy);
  if (scores.length === 0) return null;
  return Math.min(...scores);
}

export function isActionableIssue(word: {
  accuracy: number;
  errorType?: string;
  phonemes: PhonemeEntry[];
  reasonCodes?: string[];
}): boolean {
  const errorType = word.errorType ?? "None";
  if (errorType === "Omission" || errorType === "Insertion") return true;

  const focusAcc = focusPhonemeAccuracy(word.phonemes, word.reasonCodes);
  if (focusAcc != null) return focusAcc <= WEAK_SOUND_MAX;

  return errorType === "Mispronunciation" && word.accuracy < 80;
}

export function focusIpaForIssue(
  reasonCodes: string[] | undefined,
  phonemes: PhonemeEntry[]
): string {
  for (const code of reasonCodes ?? []) {
    const fromGuide = ipaFromGuideReason(code, phonemes);
    if (fromGuide) return fromGuide;

    if (code === "th_sound") {
      const th = weakestMatching(phonemes, ["θ", "ð"]);
      if (th) return th;
    }

    const builtin = BUILTIN_FOCUS[code];
    if (builtin) {
      return weakestMatching(phonemes, [builtin]) ?? builtin;
    }
  }

  const weakest = [...phonemes].sort((a, b) => a.accuracy - b.accuracy)[0];
  return weakest?.phoneme ?? "";
}
