import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordFlag, WordFlagRequest, WordFlagType } from "@/types";

export function flagAnchorKey(
  flagText: string,
  occurrenceIndex: number
): string {
  return `${flagText}::${occurrenceIndex}`;
}

export function nextOccurrenceIndex(
  counts: Map<string, number>,
  token: string
): number {
  const index = counts.get(token) ?? 0;
  counts.set(token, index + 1);
  return index;
}

export function occurrenceIndexForTokens(tokens: string[]): number[] {
  const counts = new Map<string, number>();
  return tokens.map((token) => nextOccurrenceIndex(counts, token));
}

export function wordFlagClassName(input: {
  bold?: boolean;
  underline?: boolean;
  requestedOwn?: boolean;
}): string {
  const classes: string[] = [];
  if (input.bold) classes.push("word-flag-bold");
  if (input.underline) classes.push("word-flag-underline");
  if (input.requestedOwn) classes.push("word-requested-own");
  return classes.join(" ");
}

export function shouldUnmarkAll(
  selected: { types: WordFlagType[] }[],
  type: WordFlagType
): boolean {
  return selected.length > 0 && selected.every((row) => row.types.includes(type));
}

export function requestCountByAnchor(
  requests: WordFlagRequest[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of requests) {
    const key = flagAnchorKey(row.flagText, row.occurrenceIndex);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

type FlagRow = {
  id: string;
  story_id: string;
  flag_type: string;
  flag_text: string;
  occurrence_index: number;
};

type RequestRow = {
  id: string;
  flag_text: string;
  occurrence_index: number;
};

function mapFlag(row: FlagRow): WordFlag | null {
  if (row.flag_type !== "bold" && row.flag_type !== "underline") return null;
  return {
    id: row.id,
    storyId: row.story_id,
    flagType: row.flag_type,
    flagText: row.flag_text,
    occurrenceIndex: row.occurrence_index,
  };
}

function mapRequest(row: RequestRow): WordFlagRequest {
  return {
    id: row.id,
    flagText: row.flag_text,
    occurrenceIndex: row.occurrence_index,
  };
}

export async function loadWordFlags(
  supabase: SupabaseClient,
  storyId: string
): Promise<WordFlag[]> {
  const { data, error } = await supabase
    .from("word_flags")
    .select("id, story_id, flag_type, flag_text, occurrence_index")
    .eq("story_id", storyId);

  if (error || !data) return [];
  return (data as FlagRow[])
    .map(mapFlag)
    .filter((row): row is WordFlag => row != null);
}

export async function loadOwnWordFlagRequests(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<WordFlagRequest[]> {
  const { data, error } = await supabase
    .from("word_flag_requests")
    .select("id, flag_text, occurrence_index")
    .eq("course_session_id", sessionId)
    .eq("user_id", userId);

  if (error || !data) return [];
  return (data as RequestRow[]).map(mapRequest);
}

export async function loadSessionWordFlagRequests(
  supabase: SupabaseClient,
  sessionId: string
): Promise<WordFlagRequest[]> {
  const { data, error } = await supabase
    .from("word_flag_requests")
    .select("id, flag_text, occurrence_index")
    .eq("course_session_id", sessionId);

  if (error || !data) return [];
  return (data as RequestRow[]).map(mapRequest);
}
