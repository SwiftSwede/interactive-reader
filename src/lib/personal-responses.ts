import { createClient } from "@/lib/supabase/server";
import {
  parseStoredFeedback,
  type CorrectionSegment,
} from "@/lib/personal-correction";

export type SavedPersonalResponse = {
  questionId: string;
  responseText: string;
  attemptNumber: number;
  corrections: CorrectionSegment[] | null;
  note: string | null;
};

type ResponseRow = {
  personal_question_id: string;
  response_text: string;
  attempt_number: number;
  feedback_json: unknown;
  submitted_at: string;
};

function pickLatestPersonal(rows: ResponseRow[]): SavedPersonalResponse[] {
  const latest = new Map<string, ResponseRow>();
  for (const row of rows) {
    const existing = latest.get(row.personal_question_id);
    if (!existing || row.submitted_at >= existing.submitted_at) {
      latest.set(row.personal_question_id, row);
    }
  }

  return [...latest.values()].map((row) => {
    const feedback = parseStoredFeedback(row.feedback_json);
    return {
      questionId: row.personal_question_id,
      responseText: row.response_text,
      attemptNumber: row.attempt_number,
      corrections: feedback?.corrections ?? null,
      note: feedback?.note ?? null,
    };
  });
}

export async function loadOwnPersonalResponses(
  questionIds: string[]
): Promise<SavedPersonalResponse[]> {
  if (questionIds.length === 0) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("personal_responses")
    .select(
      "personal_question_id, response_text, attempt_number, feedback_json, submitted_at"
    )
    .eq("user_id", user.id)
    .in("personal_question_id", questionIds);

  if (error) {
    console.error("loadOwnPersonalResponses failed:", error);
    return [];
  }

  return pickLatestPersonal((data ?? []) as ResponseRow[]);
}

export { pickLatestPersonal as pickPersonalResponsesForTest };
