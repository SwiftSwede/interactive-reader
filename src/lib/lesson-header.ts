export function cefrFromLevel(level: string): string | null {
  if (level === "beginner") return "A1/A2";
  if (level === "pre-intermediate") return "A2/B1";
  if (level === "intermediate") return "B1/B2";
  return null;
}

export function lessonHeaderWordCount(
  kind: string | null | undefined,
  wordCount: number | null | undefined
): number | undefined {
  if (kind !== "story" && kind !== "dialogue") return undefined;
  if (wordCount == null || wordCount < 1) return undefined;
  return wordCount;
}

export function formatLessonMeta(
  level: string,
  wordCount?: number | null
): string | null {
  const cefr = cefrFromLevel(level);
  if (!cefr) return null;
  if (wordCount != null && wordCount > 0) {
    const noun = wordCount === 1 ? "palabra" : "palabras";
    return `${cefr} · ${wordCount} ${noun}`;
  }
  return cefr;
}
