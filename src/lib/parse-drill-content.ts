import type { TagType } from "@/types";

export const HEADING_RE =
  /^# Drill content — .+ \((\w+) family, tag: `([^`]+)`\)\s*$/m;

export const CLOZE_LINE_RE =
  /^(\d+)\.\s+\*\*(P|I)\*\*\s+[—–]\s+(.+?)\s+→\s+\*\*(.+?)\*\*(.*)$/;

export const TRANSLATION_LINE_RE =
  /^(\d+)\.\s+\*\*(P|I)\*\*\s+[—–]\s+(.+?)\s+→\s+\*(.+?)\*(.*)$/;

export const HOOK_RE =
  /\*\*HOOK \((?:from|PROVISIONAL)[\s\S]*?\):\*\*\s*\n(.+)/;

export const SOURCE_URL_RE = /\*Source:\s+(https?:\S+)/;

export const EXPECTED_SEED_COUNTS = {
  teach: 3,
  cloze: 26,
  translation: 12,
} as const;

export type DrillLevel = "pre_int" | "int";

export type ParsedWordBank = {
  make: string[];
  do: string[];
};

export type ParsedTeach = {
  hook: string;
  sourceUrl: string;
  wordBank: ParsedWordBank | null;
};

export type ParsedCloze = {
  level: DrillLevel;
  text: string;
  answer: string;
  mcq: string[] | null;
  note: string | null;
};

export type ParsedTranslation = {
  level: DrillLevel;
  prompt: string;
  answer: string;
  note: string | null;
};

export type ParsedDrillFile = {
  tagName: string;
  tagType: Exclude<TagType, "vocabulary">;
  teach: ParsedTeach;
  clozes: ParsedCloze[];
  translations: ParsedTranslation[];
};

const FAMILY_TO_TAG_TYPE: Record<string, Exclude<TagType, "vocabulary">> = {
  grammar: "grammar",
  phonetic: "phonetic",
  error: "error",
};

function levelFromMark(mark: string): DrillLevel {
  return mark === "P" ? "pre_int" : "int";
}

function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const header = raw.match(/^##\s+(.+)$/);
    if (header) {
      current = header[1];
      sections.set(current, []);
      continue;
    }
    if (current) sections.get(current)!.push(raw);
  }
  const joined = new Map<string, string>();
  for (const [key, lines] of sections) {
    joined.set(key, lines.join("\n"));
  }
  return joined;
}

function sectionStartingWith(
  sections: Map<string, string>,
  prefix: string,
): string | undefined {
  for (const [key, body] of sections) {
    if (key.startsWith(prefix)) return body;
  }
  return undefined;
}

function stripOuterParens(value: string): string {
  return value.replace(/^\(+/, "").replace(/\)+\s*$/, "").trim();
}

export function parseTrailing(trailing: string): {
  mcq: string[] | null;
  note: string | null;
} {
  const trimmed = trailing.trim();
  if (!trimmed) return { mcq: null, note: null };

  const mcqIdx = trimmed.search(/MCQ:\s*/i);
  const noteParts: string[] = [];
  let mcq: string[] | null = null;

  if (mcqIdx >= 0) {
    const before = stripOuterParens(trimmed.slice(0, mcqIdx))
      .replace(/[;:,\s]+$/, "")
      .trim();
    if (before) noteParts.push(before);

    const inner = stripOuterParens(
      trimmed.slice(mcqIdx).replace(/^MCQ:\s*/i, ""),
    );
    const rawOptions = inner
      .split(" / ")
      .map((option) => option.trim())
      .filter(Boolean);
    if (rawOptions.length > 0) {
      const last = rawOptions[rawOptions.length - 1]!;
      const dash = last.search(/\s+[—–]\s+/);
      if (dash >= 0) {
        rawOptions[rawOptions.length - 1] = last.slice(0, dash).trim();
        const rest = last.slice(dash).replace(/^\s+[—–]\s+/, "").trim();
        if (rest) noteParts.push(rest);
      }
      mcq = rawOptions.filter(Boolean);
    }
  } else {
    const note = stripOuterParens(trimmed);
    if (note) noteParts.push(note);
  }

  const note = noteParts.join(" ").trim() || null;
  return { mcq, note };
}

export function parseClozeLine(line: string): ParsedCloze | null {
  const match = line.match(CLOZE_LINE_RE);
  if (!match) return null;
  const trailing = parseTrailing(match[5] ?? "");
  return {
    level: levelFromMark(match[2]!),
    text: match[3]!.trim(),
    answer: match[4]!.trim(),
    mcq: trailing.mcq,
    note: trailing.note,
  };
}

export function parseTranslationLine(line: string): ParsedTranslation | null {
  const match = line.match(TRANSLATION_LINE_RE);
  if (!match) return null;
  const trailing = parseTrailing(match[5] ?? "");
  return {
    level: levelFromMark(match[2]!),
    prompt: match[3]!.trim(),
    answer: match[4]!.trim(),
    note: trailing.note,
  };
}

function parseWordBank(body: string | undefined): ParsedWordBank | null {
  if (!body) return null;
  const makeMatch = body.match(/^- \*\*make\*\*:\s*(.+)$/m);
  const doMatch = body.match(/^- \*\*do\*\*:\s*(.+)$/m);
  if (!makeMatch || !doMatch) return null;
  const split = (value: string) =>
    value
      .split(" · ")
      .map((part) => part.trim())
      .filter(Boolean);
  return { make: split(makeMatch[1]!), do: split(doMatch[1]!) };
}

function parseNumberedLines<T>(
  body: string | undefined,
  kind: "cloze" | "translation",
  parseLine: (line: string) => T | null,
  fileLabel: string,
): T[] {
  if (body === undefined) {
    throw new Error(`${fileLabel}: missing ${kind} section`);
  }
  const items: T[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!/^\d+\.\s+/.test(line)) continue;
    const parsed = parseLine(line);
    if (!parsed) {
      throw new Error(`${fileLabel}: ${kind} line did not match: ${line}`);
    }
    items.push(parsed);
  }
  return items;
}

export function parseDrillMarkdown(
  markdown: string,
  fileLabel = "drill-content",
): ParsedDrillFile {
  const heading = markdown.match(HEADING_RE);
  if (!heading) {
    throw new Error(`${fileLabel}: heading did not match the tag contract`);
  }
  const family = heading[1]!;
  const tagType = FAMILY_TO_TAG_TYPE[family];
  if (!tagType) {
    throw new Error(`${fileLabel}: unknown tag family "${family}"`);
  }

  const sections = splitSections(markdown);
  const teachBody = sectionStartingWith(sections, "Teach card");
  if (teachBody === undefined) {
    throw new Error(`${fileLabel}: missing Teach card section`);
  }

  const hookMatch = teachBody.match(HOOK_RE);
  if (!hookMatch) {
    throw new Error(`${fileLabel}: Teach card is missing a HOOK paragraph`);
  }
  const sourceMatch = teachBody.match(SOURCE_URL_RE);
  if (!sourceMatch) {
    throw new Error(`${fileLabel}: Teach card is missing a Source URL`);
  }

  return {
    tagName: heading[2]!,
    tagType,
    teach: {
      hook: hookMatch[1]!.trim(),
      sourceUrl: sourceMatch[1]!.replace(/[.,;]+$/, ""),
      wordBank: parseWordBank(sectionStartingWith(sections, "Word bank")),
    },
    clozes: parseNumberedLines(
      sectionStartingWith(sections, "Cloze items"),
      "cloze",
      parseClozeLine,
      fileLabel,
    ),
    translations: parseNumberedLines(
      sectionStartingWith(sections, "Translation items"),
      "translation",
      parseTranslationLine,
      fileLabel,
    ),
  };
}
