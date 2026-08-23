import { createClient } from "@/lib/supabase/server";

export type SavedComprehensionResponse = {
  questionId: string;
  responseText: string;
  revealedAnswer: boolean;
};

type ResponseRow = {
  comprehension_question_id: string;
  response_text: string;
  revealed_answer: boolean;
};

export async function loadOwnComprehensionResponses(
  sessionId: string
): Promise<SavedComprehensionResponse[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("comprehension_responses")
    .select("comprehension_question_id, response_text, revealed_answer")
    .eq("course_session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("loadOwnComprehensionResponses failed:", error);
    return [];
  }

  return ((data ?? []) as ResponseRow[]).map((row) => ({
    questionId: row.comprehension_question_id,
    responseText: row.response_text,
    revealedAnswer: row.revealed_answer,
  }));
}
