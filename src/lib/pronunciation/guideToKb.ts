import guideFile from "./latam-enus-sounds-guide.v1.json";
import type { WordCoaching } from "./types";

type GuideTarget = {
  id: string;
  targetPhonemeRegex: string;
  excludeFromAutoRuleGeneration?: boolean;
  coachEs: {
    shortWhyEs: string;
    tipEs: string;
    practiceEs: string;
  };
};

type GuideFile = {
  targets?: {
    vowels?: GuideTarget[];
    consonants?: GuideTarget[];
  };
};

export type GeneratedWordRule = {
  id: string;
  kind: "word";
  reasonCode: string;
  when: {
    phonemeIncludes: Array<{
      regex: string;
      maxAccuracy: number;
    }>;
  };
  coaching: WordCoaching;
};

function toRule(
  target: GuideTarget,
  phonemeAccuracyMax: number
): GeneratedWordRule | null {
  if (!target || typeof target !== "object") return null;
  if (target.excludeFromAutoRuleGeneration === true) return null;
  if (typeof target.id !== "string" || target.id.trim().length === 0) return null;
  if (
    typeof target.targetPhonemeRegex !== "string" ||
    target.targetPhonemeRegex.trim().length === 0
  ) {
    return null;
  }
  if (!target.coachEs || typeof target.coachEs !== "object") return null;
  if (typeof target.coachEs.shortWhyEs !== "string") return null;
  if (typeof target.coachEs.tipEs !== "string") return null;
  if (typeof target.coachEs.practiceEs !== "string") return null;

  return {
    id: `guide_${target.id}`,
    kind: "word",
    reasonCode: `guide_${target.id}`,
    when: {
      phonemeIncludes: [
        { regex: target.targetPhonemeRegex, maxAccuracy: phonemeAccuracyMax },
      ],
    },
    coaching: {
      shortWhyEs: target.coachEs.shortWhyEs,
      tipEs: target.coachEs.tipEs,
      practiceEs: target.coachEs.practiceEs,
    },
  };
}

export function generateGuideWordRules(opts?: {
  phonemeAccuracyMax?: number;
  vowelPhonemeAccuracyMax?: number;
  consonantPhonemeAccuracyMax?: number;
}): GeneratedWordRule[] {
  const defaultMax =
    typeof opts?.phonemeAccuracyMax === "number" ? opts.phonemeAccuracyMax : 69;
  const vowelMax =
    typeof opts?.vowelPhonemeAccuracyMax === "number"
      ? opts.vowelPhonemeAccuracyMax
      : defaultMax;
  const consonantMax =
    typeof opts?.consonantPhonemeAccuracyMax === "number"
      ? opts.consonantPhonemeAccuracyMax
      : defaultMax;

  const guide = guideFile as GuideFile;
  if (!guide?.targets) return [];
  if (!Array.isArray(guide.targets.vowels) || !Array.isArray(guide.targets.consonants)) {
    return [];
  }

  const rules: GeneratedWordRule[] = [];

  for (const target of guide.targets.vowels) {
    const rule = toRule(target, vowelMax);
    if (rule) rules.push(rule);
  }

  for (const target of guide.targets.consonants) {
    const rule = toRule(target, consonantMax);
    if (rule) rules.push(rule);
  }

  return rules;
}
