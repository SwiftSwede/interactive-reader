import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { isActiveClassroomSubscription } from "@/lib/classroom-access";
import { createClient } from "@/lib/supabase/server";
import { isSessionType, type SessionType } from "@/lib/activities";
import type { CourseLevel, SubscriptionStatus } from "@/types";

export type OwnedCourse = {
  id: string;
  name: string;
  level: CourseLevel;
  teacher_id: string;
  archived: boolean;
};

export type StoryRef = {
  title: string;
  slug: string;
};

export type WritingPromptRef = {
  title: string;
  promptText: string;
  writingTimeMinutes: number;
  level: CourseLevel;
};

export type TeacherSession = {
  id: string;
  courseId: string;
  sessionType: SessionType;
  storyId: string | null;
  writingPromptId: string | null;
  examPromptId: string | null;
  start: string;
  end: string;
  answersRevealed: boolean;
  notes: string | null;
  token: string;
  timerStartedAt: string | null;
  story: StoryRef | null;
  writingPrompt: WritingPromptRef | null;
  examPrompt: ExamPromptRef | null;
};

export type ExamPromptRef = {
  title: string;
  level: CourseLevel;
  timeLimitMinutes: number;
};

export type RosterStudent = {
  studentId: string;
  displayName: string;
  attendedCount: number;
  sessionCount: number;
  lastActivityAt: string | null;
};

export type CourseRosterResult = {
  students: RosterStudent[];
  displayNames: Record<string, string>;
};

export type CurrentSessionKind = "live" | "upcoming" | "past";

export type CurrentSession = {
  kind: CurrentSessionKind;
  session: TeacherSession;
};

type StoryJoin = StoryRef | StoryRef[] | null;
type PromptJoin = WritingPromptRefRow | WritingPromptRefRow[] | null;
type ExamPromptJoin = ExamPromptRefRow | ExamPromptRefRow[] | null;

type WritingPromptRefRow = {
  title: string;
  prompt_text: string;
  writing_time_minutes: number;
  level: CourseLevel;
};

type ExamPromptRefRow = {
  title: string;
  level: CourseLevel;
  time_limit_minutes: number;
};

function storyFromJoin(stories: StoryJoin): StoryRef | null {
  if (!stories) return null;
  return Array.isArray(stories) ? (stories[0] ?? null) : stories;
}

function promptFromJoin(prompts: PromptJoin): WritingPromptRef | null {
  const row = !prompts
    ? null
    : Array.isArray(prompts)
      ? (prompts[0] ?? null)
      : prompts;
  if (!row) return null;
  return {
    title: row.title,
    promptText: row.prompt_text,
    writingTimeMinutes: row.writing_time_minutes,
    level: row.level,
  };
}

function examPromptFromJoin(prompts: ExamPromptJoin): ExamPromptRef | null {
  const row = !prompts
    ? null
    : Array.isArray(prompts)
      ? (prompts[0] ?? null)
      : prompts;
  if (!row) return null;
  return {
    title: row.title,
    level: row.level,
    timeLimitMinutes: row.time_limit_minutes,
  };
}

export function sessionTitle(session: TeacherSession): string {
  if (session.sessionType === "writing") {
    return session.writingPrompt?.title || "Escritura";
  }
  if (session.sessionType === "exam") {
    return session.examPrompt?.title || "Examen";
  }
  return session.story?.title ?? "Historia";
}

export function courseLevelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export function studentCountLabel(count: number): string {
  if (count === 0) return "Sin estudiantes";
  if (count === 1) return "1 estudiante";
  return `${count} estudiantes`;
}

async function activeStudentIdSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentIds: string[]
): Promise<Set<string>> {
  const uniqueIds = [...new Set(studentIds)];
  if (uniqueIds.length === 0) return new Set();

  const { data } = await supabase
    .from("profiles")
    .select("id, subscription_status")
    .in("id", uniqueIds);

  return new Set(
    (
      (data ?? []) as {
        id: string;
        subscription_status: SubscriptionStatus;
      }[]
    )
      .filter((row) => isActiveClassroomSubscription(row.subscription_status))
      .map((row) => row.id)
  );
}

export async function countActiveStudentsByCourse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (courseIds.length === 0) return counts;

  const { data } = await supabase
    .from("course_enrollments")
    .select("course_id, student_id")
    .in("course_id", courseIds);

  const rows = (data ?? []) as { course_id: string; student_id: string }[];
  const activeIds = await activeStudentIdSet(
    supabase,
    rows.map((row) => row.student_id)
  );

  for (const row of rows) {
    if (!activeIds.has(row.student_id)) continue;
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }

  return counts;
}

export function pickCurrentSession(
  sessions: TeacherSession[],
  now = new Date()
): CurrentSession | null {
  if (sessions.length === 0) return null;
  const t = now.getTime();

  const live = sessions.find((session) => {
    const start = new Date(session.start).getTime();
    const end = new Date(session.end).getTime();
    return t >= start && t <= end;
  });
  if (live) return { kind: "live", session: live };

  const upcoming = sessions
    .filter((session) => new Date(session.start).getTime() > t)
    .sort(
      (a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  if (upcoming[0]) return { kind: "upcoming", session: upcoming[0] };

  const past = [...sessions].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
  );
  return past[0] ? { kind: "past", session: past[0] } : null;
}

export function currentSessionKindLabel(kind: CurrentSessionKind): string {
  if (kind === "live") return "Ahora";
  if (kind === "upcoming") return "Siguiente";
  return "Última";
}

export async function getOwnedCourse(courseId: string): Promise<{
  course: OwnedCourse;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, name, level, teacher_id, archived")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!data || data.archived) {
    redirect("/teacher");
  }

  return { course: data as OwnedCourse, supabase };
}

type SessionRow = {
  id: string;
  course_id: string;
  session_type?: string | null;
  story_id: string | null;
  writing_prompt_id?: string | null;
  exam_prompt_id?: string | null;
  session_start_time: string;
  session_end_time: string;
  answers_revealed: boolean;
  notes: string | null;
  session_link_token: string;
  timer_started_at?: string | null;
  stories: StoryJoin;
  writing_prompts?: PromptJoin;
  exam_prompts?: ExamPromptJoin;
};

export function mapSessionRow(row: SessionRow): TeacherSession {
  const sessionType: SessionType = isSessionType(row.session_type)
    ? row.session_type
    : row.writing_prompt_id
      ? "writing"
      : row.exam_prompt_id
        ? "exam"
        : "story";

  return {
    id: row.id,
    courseId: row.course_id,
    sessionType,
    storyId: row.story_id,
    writingPromptId: row.writing_prompt_id ?? null,
    examPromptId: row.exam_prompt_id ?? null,
    start: row.session_start_time,
    end: row.session_end_time,
    answersRevealed: row.answers_revealed,
    notes: row.notes,
    token: row.session_link_token,
    timerStartedAt: row.timer_started_at ?? null,
    story: storyFromJoin(row.stories),
    writingPrompt: promptFromJoin(row.writing_prompts ?? null),
    examPrompt: examPromptFromJoin(row.exam_prompts ?? null),
  };
}

export const SESSION_SELECT =
  "id, course_id, session_type, story_id, writing_prompt_id, exam_prompt_id, timer_started_at, session_start_time, session_end_time, answers_revealed, notes, session_link_token, stories ( title, slug ), writing_prompts ( title, prompt_text, writing_time_minutes, level ), exam_prompts ( title, level, time_limit_minutes )";

const SESSION_SELECT_LEGACY =
  "id, course_id, story_id, session_start_time, session_end_time, answers_revealed, notes, session_link_token, stories ( title, slug )";

export async function loadSessionsForCourses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseIds: string[]
): Promise<TeacherSession[]> {
  if (courseIds.length === 0) return [];

  const run = (select: string) =>
    supabase
      .from("course_sessions")
      .select(select)
      .in("course_id", courseIds)
      .order("session_start_time", { ascending: false });

  let { data, error } = await run(SESSION_SELECT);
  if (error) {
    ({ data, error } = await run(SESSION_SELECT_LEGACY));
  }

  if (error || !data) {
    if (error) console.error("loadSessionsForCourses failed:", error);
    return [];
  }

  return (data as unknown as SessionRow[]).map(mapSessionRow);
}

export async function loadCourseSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string
): Promise<TeacherSession[]> {
  return loadSessionsForCourses(supabase, [courseId]);
}

export async function loadCourseRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  sessions: TeacherSession[]
): Promise<CourseRosterResult> {
  const sessionIds = sessions.map((session) => session.id);

  const [{ data: enrollmentRows }, { data: attendanceRows }, { data: responseRows }] =
    await Promise.all([
      supabase
        .from("course_enrollments")
        .select("student_id, display_name")
        .eq("course_id", courseId),
      sessionIds.length > 0
        ? supabase
            .from("session_attendance")
            .select("course_session_id, student_id, attended, first_opened_at")
            .in("course_session_id", sessionIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length > 0
        ? supabase
            .from("comprehension_responses")
            .select("user_id, submitted_at")
            .in("course_session_id", sessionIds)
        : Promise.resolve({ data: [] }),
    ]);

  let lookupRows: { user_id: string; looked_up_at: string }[] = [];
  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from("word_lookups")
      .select("user_id, looked_up_at")
      .in("course_session_id", sessionIds);
    if (!error && data) {
      lookupRows = data as { user_id: string; looked_up_at: string }[];
    }
  }

  let writingRows: { user_id: string; submitted_at: string | null; created_at: string }[] =
    [];
  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from("writing_submissions")
      .select("user_id, submitted_at, created_at")
      .in("course_session_id", sessionIds);
    if (!error && data) {
      writingRows = data as {
        user_id: string;
        submitted_at: string | null;
        created_at: string;
      }[];
    }
  }

  type Attendance = {
    course_session_id: string;
    student_id: string;
    attended: boolean;
    first_opened_at: string;
  };
  type Response = { user_id: string; submitted_at: string };
  type Lookup = { user_id: string; looked_up_at: string };

  const attendedByStudent = new Map<string, number>();
  const lastActivityByStudent = new Map<string, string>();

  function consider(studentId: string, iso: string | null | undefined) {
    if (!iso) return;
    const prev = lastActivityByStudent.get(studentId);
    if (!prev || new Date(iso).getTime() > new Date(prev).getTime()) {
      lastActivityByStudent.set(studentId, iso);
    }
  }

  for (const row of (attendanceRows ?? []) as Attendance[]) {
    if (row.attended) {
      attendedByStudent.set(
        row.student_id,
        (attendedByStudent.get(row.student_id) ?? 0) + 1
      );
    }
    consider(row.student_id, row.first_opened_at);
  }

  for (const row of (responseRows ?? []) as Response[]) {
    consider(row.user_id, row.submitted_at);
  }

  for (const row of (lookupRows ?? []) as Lookup[]) {
    consider(row.user_id, row.looked_up_at);
  }

  for (const row of writingRows) {
    consider(row.user_id, row.submitted_at ?? row.created_at);
  }

  const enrollmentList = (enrollmentRows ?? []) as {
    student_id: string;
    display_name: string;
  }[];
  const activeIds = await activeStudentIdSet(
    supabase,
    enrollmentList.map((row) => row.student_id)
  );

  const roster: RosterStudent[] = enrollmentList
    .filter((row) => activeIds.has(row.student_id))
    .map((row) => ({
      studentId: row.student_id,
      displayName: row.display_name.trim() || "Sin nombre",
      attendedCount: attendedByStudent.get(row.student_id) ?? 0,
      sessionCount: sessions.length,
      lastActivityAt: lastActivityByStudent.get(row.student_id) ?? null,
    }));

  roster.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
  const displayNames: Record<string, string> = {};
  for (const row of enrollmentList) {
    displayNames[row.student_id] = row.display_name.trim() || "Sin nombre";
  }
  return { students: roster, displayNames };
}

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
    first_opened_at: string;
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
        opened: Boolean(attendance),
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


