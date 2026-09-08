import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export function documentTitle(page?: string | null): string {
  const trimmed = page?.trim() ?? "";
  if (!trimmed || trimmed === "Profe Kyle") return "Profe Kyle";
  return `${trimmed} - Profe Kyle`;
}

async function titleFromTable(
  table:
    | "stories"
    | "writing_prompts"
    | "exam_prompts"
    | "presentation_prompts"
    | "conversation_prompts",
  id: string | null | undefined
): Promise<string | null> {
  if (!id) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from(table)
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return typeof data?.title === "string" && data.title.trim()
    ? data.title
    : null;
}

export async function storyTitleBySlug(slug: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("stories")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  return typeof data?.title === "string" && data.title.trim()
    ? data.title
    : null;
}

export async function freeStoryTitle(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("title")
    .eq("is_free", true)
    .maybeSingle();
  return typeof data?.title === "string" && data.title.trim()
    ? data.title
    : null;
}

export async function writingSessionTitle(
  sessionToken: string | undefined
): Promise<string | null> {
  return sessionPromptTitle(sessionToken, "writing_prompt_id", "writing_prompts");
}

export async function examSessionTitle(
  sessionToken: string | undefined
): Promise<string | null> {
  return sessionPromptTitle(sessionToken, "exam_prompt_id", "exam_prompts");
}

export async function presentationSessionTitle(
  sessionToken: string | undefined
): Promise<string | null> {
  return sessionPromptTitle(
    sessionToken,
    "presentation_prompt_id",
    "presentation_prompts"
  );
}

export async function conversationSessionTitle(
  sessionToken: string | undefined
): Promise<string | null> {
  return sessionPromptTitle(
    sessionToken,
    "conversation_prompt_id",
    "conversation_prompts"
  );
}

async function sessionPromptTitle(
  sessionToken: string | undefined,
  promptIdColumn:
    | "writing_prompt_id"
    | "exam_prompt_id"
    | "presentation_prompt_id"
    | "conversation_prompt_id",
  table:
    | "writing_prompts"
    | "exam_prompts"
    | "presentation_prompts"
    | "conversation_prompts"
): Promise<string | null> {
  if (!sessionToken) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("course_sessions")
    .select(
      "writing_prompt_id, exam_prompt_id, presentation_prompt_id, conversation_prompt_id"
    )
    .eq("session_link_token", sessionToken)
    .maybeSingle();
  const promptId = data?.[promptIdColumn];
  return titleFromTable(table, typeof promptId === "string" ? promptId : null);
}
