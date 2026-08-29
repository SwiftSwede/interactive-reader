import coachRulesFile from "./coachRules.es-LatAm.en-US.json";
import type { WordCoaching } from "./types";
import type { WordEntry } from "./azurePronunciation";
import { generateGuideWordRules } from "./guideToKb";

type PhonemeCond = {
  regex: string;
  minAccuracy?: number;
  maxAccuracy?: number;
};

type WordWhen = {
  wordRegex?: string;
  minWordAccuracy?: number;
  maxWordAccuracy?: number;
  phonemeIncludes?: PhonemeCond[];
  phonemeExcludes?: { regex: string }[];
  errorTypes?: string[];
};

type PairWhen = {
  leftWordRegex?: string;
  rightWordRegex?: string;
  rightUnexpectedBreakMin?: number;
  minLeftAccuracy?: number;
  maxLeftAccuracy?: number;
  minRightAccuracy?: number;
  maxRightAccuracy?: number;
};

type WordRule = {
  id: string;
  kind: "word";
  reasonCode: string;
  when: WordWhen;
  coaching: WordCoaching;
};

type PairRule = {
  id: string;
  kind: "pair";
  reasonCode: string;
  when: PairWhen;
  coaching: WordCoaching;
};

type KB = {
  version: number;
  locale: string;
  rules: Array<WordRule | PairRule>;
};

type Match = {
  reasonCode: string;
  coaching: WordCoaching;
};

let kbCache: KB | null = null;

function compileRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = vars[key];
    return typeof value === "string" ? value : "";
  });
}

function interpolateCoaching(
  coaching: WordCoaching,
  vars: Record<string, string>
): WordCoaching {
  return {
    shortWhyEs: interpolateTemplate(coaching.shortWhyEs ?? "", vars),
    tipEs: interpolateTemplate(coaching.tipEs ?? "", vars),
    practiceEs: interpolateTemplate(coaching.practiceEs ?? "", vars),
  };
}

function getUnexpectedBreakConfidence(word: WordEntry): number {
  return word.breakFeedback?.unexpectedBreakConfidence ?? 0;
}

function loadKB(): KB | null {
  if (kbCache) return kbCache;
  try {
    const parsed = coachRulesFile as { kb?: KB };
    const kb = parsed?.kb;
    if (!kb || typeof kb !== "object" || !Array.isArray(kb.rules)) {
      kbCache = null;
      return null;
    }

    const rules = kb.rules
      .filter((rule) => rule && typeof rule === "object")
      .filter(
        (rule) =>
          typeof rule.id === "string" &&
          typeof rule.kind === "string" &&
          typeof rule.reasonCode === "string"
      )
      .filter((rule) => rule.kind === "word" || rule.kind === "pair")
      .filter((rule) => rule.when && typeof rule.when === "object")
      .filter((rule) => rule.coaching && typeof rule.coaching === "object")
      .filter(
        (rule) =>
          typeof rule.coaching.shortWhyEs === "string" &&
          typeof rule.coaching.tipEs === "string" &&
          typeof rule.coaching.practiceEs === "string"
      );

    const existingReasonCodes = new Set(rules.map((rule) => rule.reasonCode));
    const guideRules = generateGuideWordRules({
      vowelPhonemeAccuracyMax: 69,
      consonantPhonemeAccuracyMax: 69,
    }).filter((rule) => !existingReasonCodes.has(rule.reasonCode));

    kbCache = {
      version: typeof kb.version === "number" ? kb.version : 1,
      locale: typeof kb.locale === "string" ? kb.locale : "en-US",
      rules: [...rules, ...guideRules],
    };
    return kbCache;
  } catch (err) {
    console.warn(
      "[coachRules] Failed to load coach rules JSON; using built-in rules only.",
      err
    );
    kbCache = null;
    return null;
  }
}

function wordRuleMatches(rule: WordRule, word: WordEntry): boolean {
  const when = rule.when ?? {};
  if (typeof when.wordRegex === "string") {
    const re = compileRegex(when.wordRegex);
    if (!re) return false;
    if (!re.test(word.word)) return false;
  }

  const minAcc = asNumber(when.minWordAccuracy);
  const maxAcc = asNumber(when.maxWordAccuracy);
  if (minAcc != null && word.accuracy < minAcc) return false;
  if (maxAcc != null && word.accuracy > maxAcc) return false;

  if (Array.isArray(when.errorTypes) && when.errorTypes.length > 0) {
    const err = word.errorType ?? "";
    if (!when.errorTypes.includes(err)) return false;
  }

  const hasExplicitAccuracyGate =
    asNumber(when.minWordAccuracy) != null || asNumber(when.maxWordAccuracy) != null;
  const hasExplicitErrorGate =
    Array.isArray(when.errorTypes) && when.errorTypes.length > 0;
  const errType = word.errorType ?? "None";
  if (!hasExplicitAccuracyGate && !hasExplicitErrorGate) {
    if (errType === "None" && word.accuracy >= 90) return false;
  }

  if (Array.isArray(when.phonemeIncludes) && when.phonemeIncludes.length > 0) {
    for (const inc of when.phonemeIncludes) {
      if (!inc || typeof inc.regex !== "string") return false;
      const re = compileRegex(inc.regex);
      if (!re) return false;
      const min = asNumber(inc.minAccuracy) ?? 0;
      const max = asNumber(inc.maxAccuracy);
      const ok = word.phonemes.some((phoneme) => {
        if (!re.test(phoneme.phoneme)) return false;
        if (phoneme.accuracy < min) return false;
        if (max != null && phoneme.accuracy > max) return false;
        return true;
      });
      if (!ok) return false;
    }
  }

  if (Array.isArray(when.phonemeExcludes) && when.phonemeExcludes.length > 0) {
    for (const ex of when.phonemeExcludes) {
      if (!ex || typeof ex.regex !== "string") continue;
      const re = compileRegex(ex.regex);
      if (!re) continue;
      if (word.phonemes.some((phoneme) => re.test(phoneme.phoneme))) return false;
    }
  }

  return true;
}

function pairRuleMatches(
  rule: PairRule,
  left: WordEntry,
  right: WordEntry
): boolean {
  const when = rule.when ?? {};

  if (typeof when.leftWordRegex === "string") {
    const re = compileRegex(when.leftWordRegex);
    if (!re) return false;
    if (!re.test(left.word)) return false;
  }
  if (typeof when.rightWordRegex === "string") {
    const re = compileRegex(when.rightWordRegex);
    if (!re) return false;
    if (!re.test(right.word)) return false;
  }

  const breakMin = asNumber(when.rightUnexpectedBreakMin);
  if (breakMin != null && getUnexpectedBreakConfidence(right) < breakMin) {
    return false;
  }

  const minLA = asNumber(when.minLeftAccuracy);
  const maxLA = asNumber(when.maxLeftAccuracy);
  const minRA = asNumber(when.minRightAccuracy);
  const maxRA = asNumber(when.maxRightAccuracy);

  if (minLA != null && left.accuracy < minLA) return false;
  if (maxLA != null && left.accuracy > maxLA) return false;
  if (minRA != null && right.accuracy < minRA) return false;
  if (maxRA != null && right.accuracy > maxRA) return false;

  return true;
}

export function matchCoachWordRule(word: WordEntry): Match | null {
  const kb = loadKB();
  if (!kb) return null;

  for (const rule of kb.rules) {
    if (rule.kind !== "word") continue;
    if (!wordRuleMatches(rule, word)) continue;
    return {
      reasonCode: rule.reasonCode,
      coaching: interpolateCoaching(rule.coaching, { word: word.word }),
    };
  }

  return null;
}

export function matchCoachPairRule(
  left: WordEntry,
  right: WordEntry
): Match | null {
  const kb = loadKB();
  if (!kb) return null;

  for (const rule of kb.rules) {
    if (rule.kind !== "pair") continue;
    if (!pairRuleMatches(rule, left, right)) continue;
    const pair = `${left.word} ${right.word}`;
    return {
      reasonCode: rule.reasonCode,
      coaching: interpolateCoaching(rule.coaching, {
        leftWord: left.word,
        rightWord: right.word,
        pair,
      }),
    };
  }

  return null;
}
