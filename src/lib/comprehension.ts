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
  course_session_id: string | null;
  submitted_at: string;
};

function pickLatestForQuestions(
  rows: ResponseRow[],
  sessionId?: string
): SavedComprehensionResponse[] {
  const byQuestion = new Map<string, ResponseRow[]>();
  for (const row of rows) {
    const list = byQuestion.get(row.comprehension_question_id) ?? [];
    list.push(row);
    byQuestion.set(row.comprehension_question_id, list);
  }

  const picked: SavedComprehensionResponse[] = [];
  for (const [, list] of byQuestion) {
    const sessionMatch = sessionId
      ? list.find((row) => row.course_session_id === sessionId)
      : undefined;
    const chosen =
      sessionMatch ??
      [...list].sort((a, b) =>
        a.submitted_at < b.submitted_at ? 1 : -1
      )[0];
    if (!chosen) continue;
    picked.push({
      questionId: chosen.comprehension_question_id,
      responseText: chosen.response_text,
      revealedAnswer: chosen.revealed_answer,
    });
  }
  return picked;
}

export async function loadOwnComprehensionResponses(
  questionIds: string[],
  sessionId?: string
): Promise<SavedComprehensionResponse[]> {
  if (questionIds.length === 0) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("comprehension_responses")
    .select(
      "comprehension_question_id, response_text, revealed_answer, course_session_id, submitted_at"
    )
    .eq("user_id", user.id)
    .in("comprehension_question_id", questionIds);

  if (error) {
    console.error("loadOwnComprehensionResponses failed:", error);
    return [];
  }

  return pickLatestForQuestions((data ?? []) as ResponseRow[], sessionId);
}

export { pickLatestForQuestions as pickComprehensionResponsesForTest };
