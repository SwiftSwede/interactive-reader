import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { CourseLevel } from "@/types";

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

export type TeacherSession = {
  id: string;
  courseId: string;
  storyId: string;
  start: string;
  end: string;
  answersRevealed: boolean;
  notes: string | null;
  token: string;
  story: StoryRef | null;
};

export type RosterStudent = {
  studentId: string;
  displayName: string;
  attendedCount: number;
  sessionCount: number;
  lastActivityAt: string | null;
};

export type CurrentSessionKind = "live" | "upcoming" | "past";

export type CurrentSession = {
  kind: CurrentSessionKind;
  session: TeacherSession;
};

type StoryJoin = StoryRef | StoryRef[] | null;

function storyFromJoin(stories: StoryJoin): StoryRef | null {
  if (!stories) return null;
  return Array.isArray(stories) ? (stories[0] ?? null) : stories;
}

export function courseLevelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export function studentCountLabel(count: number): string {
  if (count === 0) return "Sin estudiantes";
  if (count === 1) return "1 estudiante";
  return `${count} estudiantes`;
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
  story_id: string;
  session_start_time: string;
  session_end_time: string;
  answers_revealed: boolean;
  notes: string | null;
  session_link_token: string;
  stories: StoryJoin;
};

export function mapSessionRow(row: SessionRow): TeacherSession {
  return {
    id: row.id,
    courseId: row.course_id,
    storyId: row.story_id,
    start: row.session_start_time,
    end: row.session_end_time,
    answersRevealed: row.answers_revealed,
    notes: row.notes,
    token: row.session_link_token,
    story: storyFromJoin(row.stories),
  };
}

const SESSION_SELECT =
  "id, course_id, story_id, session_start_time, session_end_time, answers_revealed, notes, session_link_token, stories ( title, slug )";

export async function loadCourseSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string
): Promise<TeacherSession[]> {
  const { data } = await supabase
    .from("course_sessions")
    .select(SESSION_SELECT)
    .eq("course_id", courseId)
    .order("session_start_time", { ascending: false });

  return ((data ?? []) as SessionRow[]).map(mapSessionRow);
}

export async function loadCourseRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  sessions: TeacherSession[]
): Promise<RosterStudent[]> {
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

  const roster: RosterStudent[] = (
    (enrollmentRows ?? []) as { student_id: string; display_name: string }[]
  ).map((row) => ({
    studentId: row.student_id,
    displayName: row.display_name.trim() || "Sin nombre",
    attendedCount: attendedByStudent.get(row.student_id) ?? 0,
    sessionCount: sessions.length,
    lastActivityAt: lastActivityByStudent.get(row.student_id) ?? null,
  }));

  roster.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
  return roster;
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
  storyId: string
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
    supabase
      .from("comprehension_questions")
      .select("id, position, question")
      .eq("story_id", storyId)
      .order("position"),
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

  const students: SessionStudentStatus[] = (
    (enrollmentRows ?? []) as Enrollment[]
  ).map((row) => {
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

