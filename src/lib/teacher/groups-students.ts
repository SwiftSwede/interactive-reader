import { isActiveClassroomSubscription } from "@/lib/classroom-access";
import { createClient } from "@/lib/supabase/server";
import { sessionsInMonth } from "../teacher-month";
import type { CourseLevel, SubscriptionStatus } from "@/types";
import { loadSessionsForCourses, type TeacherSession } from "./sessions";

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

export function courseLevelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export function studentCountLabel(count: number): string {
  if (count === 0) return "Sin estudiantes";
  if (count === 1) return "1 estudiante";
  return `${count} estudiantes`;
}

export async function activeStudentIdSet(
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

export type TeacherCourseRow = {
  id: string;
  name: string;
  level: CourseLevel;
  created_at: string;
  archived: boolean;
  zoom_url: string | null;
  theme: string | null;
};

export async function loadTeacherCourses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string
): Promise<TeacherCourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, level, created_at, archived, zoom_url, theme")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("loadTeacherCourses failed:", error);
    return [];
  }

  return (data as TeacherCourseRow[]).map((row) => ({
    ...row,
    zoom_url: row.zoom_url ?? null,
    theme: row.theme?.trim() ? row.theme : null,
  }));
}

export type StudentCurrentGroup = {
  courseId: string;
  groupName: string;
};

export async function mapStudentsToCurrentGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentIds: string[],
  yearMonth: string
): Promise<Map<string, StudentCurrentGroup>> {
  const result = new Map<string, StudentCurrentGroup>();
  const uniqueIds = [...new Set(studentIds)];
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("course_enrollments")
    .select(
      "student_id, course_id, enrolled_at, courses ( id, name, archived )"
    )
    .in("student_id", uniqueIds);

  if (error || !data) {
    if (error) console.error("mapStudentsToCurrentGroup failed:", error);
    return result;
  }

  type CourseJoin = { id: string; name: string; archived: boolean };
  type EnrollmentRow = {
    student_id: string;
    course_id: string;
    enrolled_at: string;
    courses: CourseJoin | CourseJoin[] | null;
  };

  const byStudent = new Map<
    string,
    Array<{
      courseId: string;
      groupName: string;
      archived: boolean;
      enrolledAt: string;
    }>
  >();

  for (const row of data as EnrollmentRow[]) {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    if (!course) continue;
    const list = byStudent.get(row.student_id) ?? [];
    list.push({
      courseId: row.course_id,
      groupName: course.name,
      archived: course.archived,
      enrolledAt: row.enrolled_at,
    });
    byStudent.set(row.student_id, list);
  }

  const courseIds = [
    ...new Set(
      [...byStudent.values()].flatMap((rows) => rows.map((row) => row.courseId))
    ),
  ];
  const sessions = await loadSessionsForCourses(supabase, courseIds);
  const sessionsByCourse = new Map<string, TeacherSession[]>();
  for (const session of sessions) {
    const list = sessionsByCourse.get(session.courseId) ?? [];
    list.push(session);
    sessionsByCourse.set(session.courseId, list);
  }

  for (const [studentId, enrollments] of byStudent) {
    const unarchived = enrollments.filter((row) => !row.archived);
    const pool = unarchived.length > 0 ? unarchived : enrollments;
    const thisMonth = pool.filter(
      (row) =>
        sessionsInMonth(sessionsByCourse.get(row.courseId) ?? [], yearMonth)
          .length > 0
    );
    const candidates = thisMonth.length > 0 ? thisMonth : pool;
    candidates.sort(
      (a, b) =>
        new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
    );
    const chosen = candidates[0];
    if (chosen) {
      result.set(studentId, {
        courseId: chosen.courseId,
        groupName: chosen.groupName,
      });
    }
  }

  return result;
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
    first_opened_at: string | null;
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
