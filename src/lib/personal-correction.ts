import { diffArrays } from "diff";

export type CorrectionType =
  | "correct"
  | "added"
  | "deleted"
  | "moved"
  | "placed";

export type CorrectionSegment = {
  text: string;
  type: CorrectionType;
};

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Letters/digits only, case kept. So "time." matches "time" but "Always" does not match "always". */
function coreWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function sameAlignmentWord(a: string, b: string): boolean {
  const left = coreWord(a);
  const right = coreWord(b);
  if (!left || !right) return a === b;
  return left === right;
}

function normalizeWord(word: string): string {
  return coreWord(word).toLowerCase();
}

function hasKeptBetween(
  raw: { kind: "kept" | "added" | "deleted" }[],
  from: number,
  to: number
): boolean {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  for (let i = lo + 1; i < hi; i++) {
    if (raw[i].kind === "kept") return true;
  }
  return false;
}

function mergeSameType(segments: CorrectionSegment[]): CorrectionSegment[] {
  const merged: CorrectionSegment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && last.type === segment.type) {
      last.text = `${last.text} ${segment.text}`;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

/**
 * Build inline correction marks from the student's original answer and the
 * fully corrected sentence. The AI is good at writing a correct sentence;
 * it is unreliable at tagging each word. We compute the visual here.
 *
 * A word that disappears in one place and reappears in another is a move:
 * amber at the old spot, underline only at the new spot. A local swap
 * like "at time" → "on time" is not a move: strike "at", insert "on"
 * right after it, leave "time" in place.
 */
export function buildCorrectionSegments(
  original: string,
  corrected: string
): CorrectionSegment[] {
  const originalTokens = tokenize(original);
  const correctedTokens = tokenize(corrected);
  if (originalTokens.length === 0) return [];

  const parts = diffArrays(originalTokens, correctedTokens, {
    comparator: sameAlignmentWord,
  });
  const raw: { text: string; kind: "kept" | "added" | "deleted" }[] = [];
  for (const part of parts) {
    const kind = part.added ? "added" : part.removed ? "deleted" : "kept";
    for (const word of part.value) {
      raw.push({ text: word, kind });
    }
  }

  const addedIndexes = raw
    .map((token, index) => (token.kind === "added" ? index : -1))
    .filter((index) => index >= 0);
  const usedAdded = new Set<number>();

  const segments: CorrectionSegment[] = raw.map((token) => ({
    text: token.text,
    type:
      token.kind === "kept"
        ? "correct"
        : token.kind === "added"
          ? "added"
          : "deleted",
  }));

  for (let i = 0; i < raw.length; i++) {
    if (raw[i].kind !== "deleted") continue;
    const key = normalizeWord(raw[i].text);
    if (!key) continue;
    const match = addedIndexes.find(
      (index) =>
        !usedAdded.has(index) && normalizeWord(raw[index].text) === key
    );
    if (match === undefined) continue;
    // Same word in a local substitution ("at time" → "on time") is not a move.
    if (!hasKeptBetween(raw, i, match)) continue;
    usedAdded.add(match);
    segments[i].type = "moved";
    segments[match].type = "placed";
  }

  return mergeSameType(segments);
}

const CORRECTION_TYPES = new Set<CorrectionType>([
  "correct",
  "added",
  "deleted",
  "moved",
  "placed",
]);

export type StoredPersonalFeedback = {
  corrections: CorrectionSegment[];
  note: string;
};

export function parseStoredFeedback(json: unknown): StoredPersonalFeedback | null {
  if (!json || typeof json !== "object") return null;
  const rec = json as Record<string, unknown>;
  if (!Array.isArray(rec.corrections)) return null;

  const corrections: CorrectionSegment[] = [];
  for (const item of rec.corrections) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.text !== "string") continue;
    if (typeof row.type !== "string" || !CORRECTION_TYPES.has(row.type as CorrectionType)) {
      continue;
    }
    corrections.push({
      text: row.text.slice(0, 200),
      type: row.type as CorrectionType,
    });
  }

  if (corrections.length === 0) return null;

  return {
    corrections,
    note: typeof rec.note === "string" ? rec.note.slice(0, 1000) : "",
  };
}
