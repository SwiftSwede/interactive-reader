import { z } from "zod";
import { isTeacherEmail } from "@/lib/auth";
import type { PhonemeAggregate } from "@/lib/pronunciation/aggregatePhonemes";
import {
  SPEAKING_DAILY_CAP,
  SPEAKING_LEVEL,
  SPEAKING_PROMPT,
  SPEAKING_TIME_ZONE,
} from "@/lib/pronunciation/speakingFeedbackConfig";

const SpecialistError = z.object({
  heard: z.string().min(1).max(400),
  corrected: z.string().min(1).max(400),
  rule: z.string().min(1).max(300),
  severity: z.string().max(40).optional(),
});

export const GrammarAgentSchema = z.object({
  ok: z.boolean(),
  errors: z.array(SpecialistError).max(4),
});

export const VocabularyAgentSchema = z.object({
  ok: z.boolean(),
  suggestions: z
    .array(
      z.object({
        heard: z.string().min(1).max(200),
        better: z.string().min(1).max(200),
        why: z.string().min(1).max(300),
      })
    )
    .max(2),
});

export const PronunciationAgentSchema = z.object({
  ok: z.boolean(),
  patterns: z
    .array(
      z.object({
        pattern: z.string().min(1).max(80),
        friendlyName: z.string().min(1).max(160),
        examples: z.array(z.string().min(1).max(80)).max(3),
        tip: z.string().min(1).max(400),
      })
    )
    .max(2),
  mangledWords: z.array(z.string().min(1).max(80)).max(3),
});

const CardPattern = z.object({
  name: z.string().min(1).max(160),
  ipa: z.string().max(40).optional(),
  examples: z.array(z.string().min(1).max(80)).max(3),
  tip: z.string().min(1).max(400),
});

const CardGrammar = z.object({
  heard: z.string().min(1).max(400),
  corrected: z.string().min(1).max(400),
  rule: z.string().min(1).max(300),
});

const CardVocabulary = z.object({
  heard: z.string().min(1).max(200),
  better: z.string().min(1).max(200),
  why: z.string().min(1).max(300),
});

export const FeedbackCardSchema = z.object({
  transcript: z.string().max(4000),
  patterns: z.array(CardPattern).max(2),
  grammarFixes: z.array(CardGrammar).max(4),
  vocabularyTip: CardVocabulary.nullable(),
  closingLine: z.string().min(1).max(300),
});

export type GrammarAgentResult = z.infer<typeof GrammarAgentSchema>;
export type VocabularyAgentResult = z.infer<typeof VocabularyAgentSchema>;
export type PronunciationAgentResult = z.infer<typeof PronunciationAgentSchema>;
export type FeedbackCard = z.infer<typeof FeedbackCardSchema>;

export type AgentOutputs = {
  grammar: GrammarAgentResult;
  vocabulary: VocabularyAgentResult;
  pronunciation: PronunciationAgentResult;
};

const SHARED_RULES = [
  "Report only real errors.",
  "If the English is correct, set ok to true and return an empty list.",
  "Do not invent issues to be helpful.",
  "This is speech. Ignore punctuation and capitalization.",
  "Spanish meta-commentary uses written accents. English example sentences stay in English.",
  "No scores, no percentages, no praise, no em dashes.",
  "Return JSON only.",
].join(" ");

export function grammarPrompt(transcript: string): string {
  return [
    `Level: ${SPEAKING_LEVEL}. Prompt: ${SPEAKING_PROMPT}`,
    SHARED_RULES,
    "You are the grammar specialist.",
    'Shape: {"ok": boolean, "errors": [{"heard": string, "corrected": string, "rule": string, "severity": "low"|"high"}]}',
    "heard and corrected are the student's English, not a rewrite into a fancier sentence.",
    "rule is one short Spanish line.",
    `Transcript: ${transcript}`,
  ].join("\n");
}

export function vocabularyPrompt(transcript: string): string {
  return [
    `Level: ${SPEAKING_LEVEL}. Prompt: ${SPEAKING_PROMPT}`,
    SHARED_RULES,
    "You are the vocabulary specialist for an intermediate Spanish speaker.",
    "Cognate synonyms are intentional. Do not flag them.",
    "Suggest at most one clearer word or phrase, and only when their word hides the meaning.",
    'Shape: {"ok": boolean, "suggestions": [{"heard": string, "better": string, "why": string}]}',
    "why is one short Spanish line.",
    `Transcript: ${transcript}`,
  ].join("\n");
}

export function pronunciationPrompt(
  transcript: string,
  aggregate: PhonemeAggregate
): string {
  return [
    `Level: ${SPEAKING_LEVEL}. Prompt: ${SPEAKING_PROMPT}`,
    SHARED_RULES,
    "You write for a student whose pronunciation is still forming.",
    "Use only the patterns and mangled words given. Do not add sounds.",
    "friendlyName and tip are Spanish. examples are the English words given.",
    'Shape: {"ok": boolean, "patterns": [{"pattern": string, "friendlyName": string, "examples": string[], "tip": string}], "mangledWords": string[]}',
    `Patterns: ${JSON.stringify(aggregate.patterns)}`,
    `Mangled words: ${JSON.stringify(aggregate.mangledWords)}`,
    `Transcript: ${transcript}`,
  ].join("\n");
}

export function synthesizerPrompt(input: {
  transcript: string;
  grammar: GrammarAgentResult;
  vocabulary: VocabularyAgentResult;
  pronunciation: PronunciationAgentResult;
}): string {
  return [
    "Write the student card from the specialist notes. Do not add errors they did not report.",
    "If a specialist set ok to true, leave that section empty.",
    "transcript must be copied exactly.",
    "closingLine is one Spanish next step taken from a real pattern or grammar note. No praise. No 'bien hecho'. No 'good job'.",
    "No scores. No em dashes. Spanish accents on. English stays English inside heard, corrected, better, and examples.",
    'Shape: {"transcript": string, "patterns": [{"name": string, "ipa": string, "examples": string[], "tip": string}], "grammarFixes": [{"heard": string, "corrected": string, "rule": string}], "vocabularyTip": {"heard": string, "better": string, "why": string} | null, "closingLine": string}',
    `Transcript: ${input.transcript}`,
    `Grammar: ${JSON.stringify(input.grammar)}`,
    `Vocabulary: ${JSON.stringify(input.vocabulary)}`,
    `Pronunciation: ${JSON.stringify(input.pronunciation)}`,
  ].join("\n");
}

export function stripSpeechDashes(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function clean<T>(value: T): T {
  if (typeof value === "string") return stripSpeechDashes(value) as T;
  if (Array.isArray(value)) return value.map((item) => clean(item)) as T;
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = clean(item);
    }
    return next as T;
  }
  return value;
}

function looseMatch(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const a = normalize(left);
  const b = normalize(right);
  return a.length > 0 && (a === b || a.includes(b) || b.includes(a));
}

/** Keeps the card inside what the specialists actually reported. */
export function clampFeedbackCard(
  card: FeedbackCard,
  agents: AgentOutputs,
  transcript: string,
  aggregate: PhonemeAggregate
): FeedbackCard {
  const grammarFixes = agents.grammar.ok
    ? []
    : card.grammarFixes.filter((fix) =>
        agents.grammar.errors.some(
          (error) =>
            looseMatch(fix.heard, error.heard) ||
            looseMatch(fix.corrected, error.corrected)
        )
      );

  const patterns = agents.pronunciation.ok
    ? []
    : card.patterns.slice(0, agents.pronunciation.patterns.length).map(
        (pattern, index) => {
          const source = aggregate.patterns[index];
          const fromAgent = agents.pronunciation.patterns[index];
          return {
            name: pattern.name || fromAgent?.friendlyName || source?.ipaDisplay || "",
            ipa: source?.ipaDisplay,
            examples: source?.exampleWords.length
              ? source.exampleWords
              : pattern.examples,
            tip: pattern.tip || fromAgent?.tip || "",
          };
        }
      ).filter((pattern) => pattern.name && pattern.tip);

  const suggestion = agents.vocabulary.ok
    ? null
    : agents.vocabulary.suggestions[0] ?? null;
  const vocabularyTip =
    suggestion && card.vocabularyTip
      ? {
          heard: suggestion.heard,
          better: suggestion.better,
          why: card.vocabularyTip.why || suggestion.why,
        }
      : suggestion
        ? {
            heard: suggestion.heard,
            better: suggestion.better,
            why: suggestion.why,
          }
        : null;

  return clean({
    transcript,
    patterns,
    grammarFixes,
    vocabularyTip,
    closingLine: card.closingLine,
  });
}

export function speakingPrototypeEmails(): string[] {
  return (process.env.SPEAKING_PROTOTYPE_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function canUseSpeakingPrototype(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  if (isTeacherEmail(email)) return true;
  return speakingPrototypeEmails().includes(email.trim().toLowerCase());
}

export function isSpeakingOwner(email: string | null | undefined): boolean {
  return isTeacherEmail(email);
}

/** Midnight of the Mexico City calendar day that contains `now`, as a UTC Date. */
export function startOfMexicoCityDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SPEAKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second")
  );
  const offsetMs = wallAsUtc - now.getTime();
  const midnightWall = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    0,
    0,
    0
  );
  return new Date(midnightWall - offsetMs);
}

export function remainingAttempts(completedToday: number, owner: boolean): number | null {
  if (owner) return null;
  return Math.max(0, SPEAKING_DAILY_CAP - completedToday);
}
