import { createClient } from "@/lib/supabase/server";
import { activeStudentIdSet } from "./groups-students";

export type SessionStudentStatus = {
  studentId: string;
  displayName: string;
  opened: boolean;
  attended: boolean;
  openedAt: string | null;
  answers: {
    questionId: string;
    position: number;
    question: string;
    responseText: string;
    submittedAt: string;
  }[];
};

export type LookedUpWord = {
  text: string;
  studentCount: number;
};

export async function loadSessionStudentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  sessionId: string,
  storyId: string | null
): Promise<SessionStudentStatus[]> {
  const [
    { data: enrollmentRows },
    { data: attendanceRows },
    { data: questionRows },
    { data: responseRows },
  ] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select("student_id, display_name")
      .eq("course_id", courseId),
    supabase
      .from("session_attendance")
      .select("student_id, attended, first_opened_at")
      .eq("course_session_id", sessionId),
    storyId
      ? supabase
          .from("comprehension_questions")
          .select("id, position, question")
          .eq("story_id", storyId)
          .order("position")
      : Promise.resolve({ data: [] }),
    supabase
      .from("comprehension_responses")
      .select(
        "user_id, comprehension_question_id, response_text, submitted_at"
      )
      .eq("course_session_id", sessionId),
  ]);

  type Enrollment = { student_id: string; display_name: string };
  type Attendance = {
    student_id: string;
    attended: boolean;
    first_opened_at: string | null;
  };
  type Question = { id: string; position: number; question: string };
  type Response = {
    user_id: string;
    comprehension_question_id: string;
    response_text: string;
    submitted_at: string;
  };

  const questions = (questionRows ?? []) as Question[];
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const attendanceByStudent = new Map(
    ((attendanceRows ?? []) as Attendance[]).map((row) => [row.student_id, row])
  );
  const answersByStudent = new Map<
    string,
    SessionStudentStatus["answers"]
  >();

  for (const row of (responseRows ?? []) as Response[]) {
    const question = questionById.get(row.comprehension_question_id);
    if (!question) continue;
    const list = answersByStudent.get(row.user_id) ?? [];
    list.push({
      questionId: question.id,
      position: question.position,
      question: question.question,
      responseText: row.response_text,
      submittedAt: row.submitted_at,
    });
    answersByStudent.set(row.user_id, list);
  }

  const enrollmentList = (enrollmentRows ?? []) as Enrollment[];
  const activeIds = await activeStudentIdSet(
    supabase,
    enrollmentList.map((row) => row.student_id)
  );

  const students: SessionStudentStatus[] = enrollmentList
    .filter(
      (row) =>
        activeIds.has(row.student_id) || attendanceByStudent.has(row.student_id)
    )
    .map((row) => {
      const attendance = attendanceByStudent.get(row.student_id);
      const answers = (answersByStudent.get(row.student_id) ?? []).sort(
        (a, b) => a.position - b.position
      );
      return {
        studentId: row.student_id,
        displayName: row.display_name.trim() || "Sin nombre",
        opened: Boolean(attendance?.first_opened_at),
        attended: attendance?.attended === true,
        openedAt: attendance?.first_opened_at ?? null,
        answers,
      };
    });

  students.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
  return students;
}

export async function loadLookedUpWords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<LookedUpWord[] | null> {
  const { data, error } = await supabase
    .from("word_lookups")
    .select("user_id, words ( text )")
    .eq("course_session_id", sessionId);

  if (error) return null;

  type LookupRow = {
    user_id: string;
    words: { text: string } | { text: string }[] | null;
  };

  const studentsByWord = new Map<
    string,
    { text: string; users: Set<string> }
  >();
  for (const row of (data ?? []) as LookupRow[]) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    if (!word?.text) continue;
    const key = word.text.toLowerCase();
    const entry = studentsByWord.get(key) ?? {
      text: word.text,
      users: new Set<string>(),
    };
    entry.users.add(row.user_id);
    studentsByWord.set(key, entry);
  }

  return [...studentsByWord.values()]
    .map(({ text, users }) => ({
      text,
      studentCount: users.size,
    }))
    .sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      return a.text.localeCompare(b.text, "es");
    });
}

export type StudentLookup = {
  text: string;
  lookedUpAt: string;
};

export async function loadStudentLookups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  studentId: string
): Promise<StudentLookup[]> {
  const { data, error } = await supabase
    .from("word_lookups")
    .select("looked_up_at, words ( text )")
    .eq("course_session_id", sessionId)
    .eq("user_id", studentId)
    .order("looked_up_at", { ascending: true });

  if (error || !data) return [];

  type Row = {
    looked_up_at: string;
    words: { text: string } | { text: string }[] | null;
  };

  return (data as Row[])
    .map((row) => {
      const word = Array.isArray(row.words) ? row.words[0] : row.words;
      if (!word?.text) return null;
      return { text: word.text, lookedUpAt: row.looked_up_at };
    })
    .filter((row): row is StudentLookup => row !== null);
}

export type WritingSubmissionRow = {
  id: string;
  userId: string;
  submissionText: string;
  wordCount: number;
  wpm: number | null;
  status: "draft" | "submitted" | "corrected";
  submittedAt: string | null;
  startedAt: string | null;
  elapsedSeconds: number | null;
};

export type WritingCorrectionRow = {
  id: string;
  correctedText: string;
  correctionDiff: Array<{ text: string; type: "kept" | "added" | "deleted" }>;
  inlineNotes: Array<{ word_index: number; note: string }> | null;
  goodVocabulary: number[] | null;
  correctedAt: string;
};

export type VideoSummaryFreeWriteRow = {
  id: string;
  userId: string | null;
  displayName: string;
  submissionText: string;
  wordCount: number;
  elapsedSeconds: number;
  submittedAt: string | null;
};

export async function loadVideoSummaryFreeWrites(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<VideoSummaryFreeWriteRow[]> {
  const [{ data, error }, { data: session }] = await Promise.all([
    supabase
      .from("video_summary_free_writes")
      .select(
        "id, user_id, submission_text, word_count, elapsed_seconds, submitted_at"
      )
      .eq("course_session_id", sessionId)
      .order("submitted_at", { ascending: true }),
    supabase
      .from("course_sessions")
      .select("course_id")
      .eq("id", sessionId)
      .maybeSingle(),
  ]);

  if (error || !data) return [];

  const userIds = [
    ...new Set(
      data
        .map((row) => (row as { user_id: string | null }).user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const names = new Map<string, string>();
  if (session?.course_id && userIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("student_id, display_name")
      .eq("course_id", session.course_id)
      .in("student_id", userIds);
    for (const row of enrollments ?? []) {
      const name = (row.display_name as string | null)?.trim();
      names.set(row.student_id as string, name || "Sin nombre");
    }
  }

  return (
    data as {
      id: string;
      user_id: string | null;
      submission_text: string;
      word_count: number | null;
      elapsed_seconds: number | null;
      submitted_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: names.get(row.user_id ?? "") ?? "Sin nombre",
    submissionText: row.submission_text,
    wordCount: row.word_count ?? 0,
    elapsedSeconds: row.elapsed_seconds ?? 0,
    submittedAt: row.submitted_at,
  }));
}

export async function loadWritingSubmissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<WritingSubmissionRow[]> {
  const { data, error } = await supabase
    .from("writing_submissions")
    .select(
      "id, user_id, submission_text, word_count, wpm, status, submitted_at, started_at, elapsed_seconds"
    )
    .eq("course_session_id", sessionId);

  if (error || !data) return [];

  return (
    data as {
      id: string;
      user_id: string;
      submission_text: string;
      word_count: number;
      wpm: number | null;
      status: WritingSubmissionRow["status"];
      submitted_at: string | null;
      started_at: string | null;
      elapsed_seconds: number | null;
    }[]
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    submissionText: row.submission_text,
    wordCount: row.word_count,
    wpm: row.wpm,
    status: row.status,
    submittedAt: row.submitted_at,
    startedAt: row.started_at,
    elapsedSeconds: row.elapsed_seconds,
  }));
}

export async function loadWritingCorrection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  submissionId: string
): Promise<WritingCorrectionRow | null> {
  const { data, error } = await supabase
    .from("writing_corrections")
    .select(
      "id, corrected_text, correction_diff, inline_notes, good_vocabulary, corrected_at"
    )
    .eq("writing_submission_id", submissionId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    corrected_text: string;
    correction_diff: WritingCorrectionRow["correctionDiff"];
    inline_notes: WritingCorrectionRow["inlineNotes"];
    good_vocabulary: number[] | null;
    corrected_at: string;
  };

  return {
    id: row.id,
    correctedText: row.corrected_text,
    correctionDiff: row.correction_diff ?? [],
    inlineNotes: row.inline_notes,
    goodVocabulary: row.good_vocabulary,
    correctedAt: row.corrected_at,
  };
}

export type ExamGroupRow = {
  id: string;
  groupLabel: string;
  writerId: string;
  memberIds: string[];
};

export type ExamSubmissionRow = {
  id: string;
  examGroupId: string;
  task1Answers: unknown;
  task2Answers: unknown;
  task3Answers: unknown;
  status: "in_progress" | "submitted";
  submittedAt: string | null;
  reviewRevealedAt: string | null;
};

export async function loadExamGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<ExamGroupRow[]> {
  const { data, error } = await supabase
    .from("exam_groups")
    .select("id, group_label, writer_id, member_ids")
    .eq("course_session_id", sessionId)
    .order("group_label");

  if (error || !data) return [];

  return (
    data as {
      id: string;
      group_label: string;
      writer_id: string;
      member_ids: string[];
    }[]
  ).map((row) => ({
    id: row.id,
    groupLabel: row.group_label,
    writerId: row.writer_id,
    memberIds: row.member_ids ?? [],
  }));
}

export async function loadExamSubmissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<ExamSubmissionRow[]> {
  const { data, error } = await supabase
    .from("group_exam_submissions")
    .select(
      "id, exam_group_id, task1_answers, task2_answers, task3_answers, status, submitted_at, review_revealed_at"
    )
    .eq("course_session_id", sessionId);

  if (error || !data) return [];

  return (
    data as {
      id: string;
      exam_group_id: string;
      task1_answers: unknown;
      task2_answers: unknown;
      task3_answers: unknown;
      status: "in_progress" | "submitted";
      submitted_at: string | null;
      review_revealed_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    examGroupId: row.exam_group_id,
    task1Answers: row.task1_answers,
    task2Answers: row.task2_answers,
    task3Answers: row.task3_answers,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewRevealedAt: row.review_revealed_at,
  }));
}
