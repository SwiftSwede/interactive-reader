import {
  isMovieTalkSceneBreak,
  isMovieTalkStageDirection,
  MOVIE_TALK_SPEAKER_RE,
  speakerOfLine,
} from "@/lib/movietalk";

export type SentenceHighlightKind = "story" | "dialogue" | "movie_talk" | "song";

export function audioHighlightMode(
  kind: SentenceHighlightKind | undefined
): "sentence" | "none" {
  if (kind === "song") return "none";
  return "sentence";
}

export function endsSpokenSentence(token: string): boolean {
  return /[.!?…]["'"”)\]\)]*$/u.test(token);
}

export function spokenTokenLines(
  bodyText: string,
  kind: SentenceHighlightKind
): { tokens: string[]; perLine: boolean }[] {
  const lyricLayout = kind === "song";
  const paragraphs = lyricLayout
    ? bodyText.split("\n")
    : bodyText.split("\n").filter((paragraph) => paragraph.trim());
  const perLine = kind === "dialogue" || kind === "movie_talk" || lyricLayout;
  const lines: { tokens: string[]; perLine: boolean }[] = [];

  for (const paragraph of paragraphs) {
    if (lyricLayout && !paragraph.trim()) continue;
    if (kind === "movie_talk" && isMovieTalkSceneBreak(paragraph)) continue;
    if (
      (kind === "dialogue" || kind === "movie_talk") &&
      isMovieTalkStageDirection(paragraph)
    ) {
      continue;
    }

    const movieTalkName =
      kind === "movie_talk" ? speakerOfLine(paragraph) : null;
    const dialogueName =
      kind === "dialogue"
        ? paragraph.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+):/)?.[1]
        : null;
    const speakerName = movieTalkName ?? dialogueName;
    const tokens = speakerName
      ? paragraph
          .replace(
            movieTalkName
              ? new RegExp(MOVIE_TALK_SPEAKER_RE.source + "\\s*")
              : /^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+):\s*/,
            ""
          )
          .split(/\s+/)
          .filter((token) => token)
      : paragraph.split(/\s+/).filter((token) => token);

    lines.push({ tokens, perLine });
  }

  return lines;
}

export function sentenceIdsForSpokenTokens(
  lines: { tokens: string[]; perLine: boolean }[]
): number[] {
  const ids: number[] = [];
  let sentence = 0;
  for (const line of lines) {
    if (line.perLine) {
      for (const _token of line.tokens) ids.push(sentence);
      if (line.tokens.length > 0) sentence += 1;
      continue;
    }
    for (const token of line.tokens) {
      ids.push(sentence);
      if (endsSpokenSentence(token)) sentence += 1;
    }
  }
  return ids;
}

export function sentenceIdsForBody(
  bodyText: string,
  kind: SentenceHighlightKind
): number[] {
  return sentenceIdsForSpokenTokens(spokenTokenLines(bodyText, kind));
}

/** 1-based label for every 5th sentence (5, 10, 15…); null otherwise. */
export function sentenceRefLabel(sentenceId: number): number | null {
  const n = sentenceId + 1;
  return n > 0 && n % 5 === 0 ? n : null;
}

export function lookedUpPositions(
  words: { id: string; position: number }[],
  lookedUpWordIds: Iterable<string>
): Set<number> {
  const ids = new Set(lookedUpWordIds);
  const positions = new Set<number>();
  for (const word of words) {
    if (ids.has(word.id)) positions.add(word.position);
  }
  return positions;
}
