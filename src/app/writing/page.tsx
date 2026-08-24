import { createClient } from "@/lib/supabase/server";
import { resolveWritingSessionAccess } from "@/lib/sessions";
import { getProfile } from "@/lib/auth-server";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import WritingSession from "@/components/WritingSession";
import type { CourseLevel } from "@/types";
import type { DiffSegment, InlineNote } from "@/lib/writing";

export const metadata = {
  title: "Escritura - Profe Kyle",
};

type PromptRow = {
  id: string;
  title: string;
  prompt_text: string;
  writing_time_minutes: number;
  level: CourseLevel;
  structure_lesson: string | null;
  rubric_text: string | null;
  example_paragraph: string | null;
};

type SubmissionRow = {
  id: string;
  submission_text: string;
  status: "draft" | "submitted" | "corrected";
  word_count: number;
  wpm: number | null;
  started_at: string | null;
  submitted_at: string | null;
};

type CorrectionRow = {
  corrected_text: string;
  correction_diff: DiffSegment[];
  inline_notes: InlineNote[] | null;
  good_vocabulary: number[] | null;
};

export default async function WritingPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionToken } = await searchParams;
  const access = await resolveWritingSessionAccess(sessionToken);

  if (access.kind === "invalid") {
    return (
      <StoryAccessMessage
        title="Ese link no sirve"
        body="Pídele el link de clase al Profe Kyle. A veces se copia mal."
      />
    );
  }

  if (access.kind === "refused") {
    return (
      <StoryAccessMessage
        title="Este link es para el grupo"
        body="Si pagaste el curso, pídele al Profe Kyle que te invite con tu email. Después el mismo link te deja entrar."
      />
    );
  }

  if (access.kind !== "ok") {
    return (
      <StoryAccessMessage
        title="Ese link no sirve"
        body="Pídele el link de clase al Profe Kyle."
      />
    );
  }

  const promptId = access.session.writingPromptId;
  if (!promptId) {
    return (
      <StoryAccessMessage
        title="Esta clase no tiene pregunta"
        body="Avísale al Profe Kyle. Falta la pregunta de escritura."
      />
    );
  }

  const supabase = await createClient();
  const { data: prompt } = await supabase
    .from("writing_prompts")
    .select(
      "id, title, prompt_text, writing_time_minutes, level, structure_lesson, rubric_text, example_paragraph"
    )
    .eq("id", promptId)
    .maybeSingle();

  if (!prompt) {
    return (
      <StoryAccessMessage
        title="No encontré la pregunta"
        body="Avísale al Profe Kyle."
      />
    );
  }

  const promptRow = prompt as PromptRow;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const isTeacher = profile?.role === "teacher";

  let submission: SubmissionRow | null = null;
  let correction: CorrectionRow | null = null;

  if (user && !isTeacher) {
    const { data: submissionRow } = await supabase
      .from("writing_submissions")
      .select(
        "id, submission_text, status, word_count, wpm, started_at, submitted_at"
      )
      .eq("course_session_id", access.session.id)
      .eq("user_id", user.id)
      .maybeSingle();
    submission = (submissionRow as SubmissionRow | null) ?? null;

    if (submission?.status === "corrected") {
      const { data: correctionRow } = await supabase
        .from("writing_corrections")
        .select(
          "corrected_text, correction_diff, inline_notes, good_vocabulary"
        )
        .eq("writing_submission_id", submission.id)
        .maybeSingle();
      correction = (correctionRow as CorrectionRow | null) ?? null;
    }
  }

  return (
    <WritingSession
      sessionId={access.session.id}
      prompt={{
        id: promptRow.id,
        title: promptRow.title,
        promptText: promptRow.prompt_text,
        writingTimeMinutes: promptRow.writing_time_minutes,
        level: promptRow.level,
        structureLesson: promptRow.structure_lesson,
        rubricText: promptRow.rubric_text,
        exampleParagraph: promptRow.example_paragraph,
      }}
      notes={access.session.notes}
      timerStartedAt={access.session.timerStartedAt}
      isTeacher={isTeacher}
      submission={
        submission
          ? {
              text: submission.submission_text,
              status: submission.status,
              wordCount: submission.word_count,
              wpm: submission.wpm,
            }
          : null
      }
      correction={
        correction
          ? {
              diff: correction.correction_diff ?? [],
              notes: correction.inline_notes,
              goodVocabulary: correction.good_vocabulary,
            }
          : null
      }
    />
  );
}
