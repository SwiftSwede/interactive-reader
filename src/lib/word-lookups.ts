import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadActiveLookupWordIds(
  supabase: SupabaseClient,
  userId: string,
  storyId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("word_lookups")
    .select("word_id")
    .eq("user_id", userId)
    .eq("story_id", storyId)
    .is("cleared_at", null);

  if (error) {
    console.error("loadActiveLookupWordIds failed:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.word_id)
    .filter((id): id is string => typeof id === "string");
}
