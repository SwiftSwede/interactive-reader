import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseLevel } from "@/types";
import {
  isLiveOnlySessionType,
  isSessionType,
  studentSessionPath,
  type SessionType,
} from "@/lib/activities";
import { loadStudentProgress } from "@/lib/progress";
import {
  getSessionLifecycle,
  type SessionLifecycle,
} from "@/lib/session-phase";

export type DashboardLesson = {
  sessionId: string;
  sessionType: SessionType;
  title: string | null;
  lifecycle: SessionLifecycle;
  completed: boolean;
  hasRecording: boolean;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  href: string | null;
  liveOnly: boolean;
};

export type DashboardData = {
  displayName: string | null;
  courseDisplayName: string | null;
  lessons: DashboardLesson[];
  olderCourses: { displayName: string; lessons: DashboardLesson[] }[];
  totals: { completed: number; total: number };
  todaySession: DashboardLesson | null;
  zoomUrl: string | null;
  practice: {
    dictationAttempts: number;
    wordsLookedUp: number;
    pronunciationSessions: number;
  };
};

type ContentRefs = {
  sessionType: SessionType;
  storyId: string | null;
  writingPromptId: string | null;
  examPromptId: string | null;
  presentationPromptId: string | null;
};

export function hasSessionContent(session: ContentRefs): boolean {
  if (isLiveOnlySessionType(session.sessionType)) return true;
  if (session.sessionType === "writing") return Boolean(session.writingPromptId);
  if (session.sessionType === "exam") return Boolean(session.examPromptId);
  if (session.sessionType === "presentation") {
    return Boolean(session.presentationPromptId);
  }
  return Boolean(session.storyId);
}

export function formatSessionDay(sessionDate: string): string {
  const [year, month, day] = sessionDate.split("-").map(Number);
  if (!year || !month || !day) return sessionDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  const monthLabel = date
    .toLocaleDateString("es", { month: "short", timeZone: "UTC" })
    .replace(/\./g, "");
  return `${day} ${monthLabel}`;
}

export function courseMonthHeading(
  sessionDate: string,
  courseName: string
): string {
  const [year, month] = sessionDate.split("-").map(Number);
  if (!year || !month) return courseName.toUpperCase();
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthLabel = date
    .toLocaleDateString("es", { month: "long", timeZone: "UTC" })
    .toUpperCase();
  return `${monthLabel} · ${courseName.toUpperCase()}`;
}

export function isLocalCalendarDate(
  sessionDate: string,
  now = new Date()
): boolean {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return sessionDate === `${year}-${month}-${day}`;
}

export function isNearUtcToday(sessionDate: string, now = new Date()): boolean {
  const utc = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  return (
    sessionDate === utc ||
    sessionDate === yesterday ||
    sessionDate === tomorrow
  );
}

export function pickTodaySession(
  lessons: DashboardLesson[],
  now = new Date()
): DashboardLesson | null {
  const candidates = lessons.filter((lesson) =>
    isNearUtcToday(lesson.sessionDate, now)
  );
  if (candidates.length === 0) return null;
  const utc = now.toISOString().slice(0, 10);
  const exact = candidates.find((lesson) => lesson.sessionDate === utc);
  if (exact) return exact;
  const t = now.getTime();
  return [...candidates].sort((a, b) => {
    const da = Math.abs(new Date(a.sessionStartTime).getTime() - t);
    const db = Math.abs(new Date(b.sessionStartTime).getTime() - t);
    return da - db;
  })[0];
}

export function formatCountdownLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function localYearMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export type CourseCandidate = {
  courseId: string;
  level: CourseLevel;
  enrolledAt: string;
  latestStart: number;
  sessionDates: string[];
};

export function pickActiveCourseId(
  courses: CourseCandidate[],
  classroomLevel: CourseLevel | null,
  now = new Date()
): string | null {
  if (courses.length === 0) return null;
  const matching = classroomLevel
    ? courses.filter((course) => course.level === classroomLevel)
    : courses;
  const pool = matching.length > 0 ? matching : courses;
  const ym = localYearMonth(now);
  const inMonth = pool.filter((course) =>
    course.sessionDates.some((date) => date.startsWith(ym))
  );
  const chosen = inMonth.length > 0 ? inMonth : pool;
  const sorted = [...chosen].sort((a, b) => {
    if (inMonth.length > 0) {
      return (
        b.latestStart - a.latestStart ||
        b.enrolledAt.localeCompare(a.enrolledAt)
      );
    }
    return (
      b.enrolledAt.localeCompare(a.enrolledAt) ||
      b.latestStart - a.latestStart
    );
  });
  return sorted[0]?.courseId ?? null;
}

function bySessionStartAsc(a: DashboardLesson, b: DashboardLesson): number {
  return (
    new Date(a.sessionStartTime).getTime() -
    new Date(b.sessionStartTime).getTime()
  );
}

function bySessionStartDesc(a: DashboardLesson, b: DashboardLesson): number {
  return (
    new Date(b.sessionStartTime).getTime() -
    new Date(a.sessionStartTime).getTime()
  );
}

type TitleJoin = { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;

function joinTitle(value: TitleJoin): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return typeof row?.title === "string" ? row.title : null;
}

function joinSlug(value: TitleJoin): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return typeof row?.slug === "string" ? row.slug : null;
}

export function toDashboardLesson(input: {
  sessionId: string;
  sessionType: SessionType;
  storyId: string | null;
  writingPromptId: string | null;
  examPromptId: string | null;
  presentationPromptId: string | null;
  title: string | null;
  storySlug: string | null;
  token: string;
  recordingYoutubeUrl: string | null;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  completed: boolean;
  now?: Date;
}): DashboardLesson {
  const liveOnly = isLiveOnlySessionType(input.sessionType);
  const contentReady = hasSessionContent({
    sessionType: input.sessionType,
    storyId: input.storyId,
    writingPromptId: input.writingPromptId,
    examPromptId: input.examPromptId,
    presentationPromptId: input.presentationPromptId,
  });
  const lifecycle = getSessionLifecycle(
    {
      sessionStartTime: input.sessionStartTime,
      sessionEndTime: input.sessionEndTime,
    },
    contentReady,
    input.now
  );
  const href =
    liveOnly || !contentReady
      ? null
      : studentSessionPath({
          sessionType: input.sessionType,
          token: input.token,
          storySlug: input.storySlug,
        });

  return {
    sessionId: input.sessionId,
    sessionType: input.sessionType,
    title: contentReady && !liveOnly ? input.title : null,
    lifecycle,
    completed: liveOnly ? false : input.completed,
    hasRecording: Boolean(input.recordingYoutubeUrl),
    sessionDate: input.sessionDate,
    sessionStartTime: input.sessionStartTime,
    sessionEndTime: input.sessionEndTime,
    href,
    liveOnly,
  };
}

type SessionRow = {
  id: string;
  course_id: string;
  session_type?: string | null;
  story_id: string | null;
  writing_prompt_id?: string | null;
  exam_prompt_id?: string | null;
  presentation_prompt_id?: string | null;
  session_date: string;
  session_start_time: string;
  session_end_time: string;
  session_link_token: string;
  recording_youtube_url?: string | null;
  stories?: TitleJoin;
  writing_prompts?: TitleJoin;
  exam_prompts?: TitleJoin;
  presentation_prompts?: TitleJoin;
};

async function safeSelect<T>(
  label: string,
  run: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  try {
    const { data, error } = await run();
    if (error) {
      console.error(`loadDashboard ${label}:`, error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error(`loadDashboard ${label}:`, error);
    return [];
  }
}

const SESSION_SELECT_FULL =
  "id, course_id, session_type, story_id, writing_prompt_id, exam_prompt_id, presentation_prompt_id, session_date, session_start_time, session_end_time, session_link_token, recording_youtube_url, stories ( title, slug ), writing_prompts ( title ), exam_prompts ( title ), presentation_prompts ( title )";

const SESSION_SELECT_NO_PRESENTATION =
  "id, course_id, session_type, story_id, writing_prompt_id, exam_prompt_id, session_date, session_start_time, session_end_time, session_link_token, recording_youtube_url, stories ( title, slug ), writing_prompts ( title ), exam_prompts ( title )";

const SESSION_SELECT_LEGACY =
  "id, course_id, session_type, story_id, writing_prompt_id, exam_prompt_id, session_date, session_start_time, session_end_time, session_link_token, stories ( title, slug ), writing_prompts ( title ), exam_prompts ( title )";

async function loadSessionRows(
  supabase: SupabaseClient,
  courseIds: string[]
): Promise<SessionRow[]> {
  if (courseIds.length === 0) return [];

  const run = (select: string) =>
    supabase
      .from("course_sessions")
      .select(select)
      .in("course_id", courseIds)
      .order("session_start_time", { ascending: true });

  let { data, error } = await run(SESSION_SELECT_FULL);
  if (error) {
    ({ data, error } = await run(SESSION_SELECT_NO_PRESENTATION));
  }
  if (error) {
    ({ data, error } = await run(SESSION_SELECT_LEGACY));
  }
  if (error) {
    console.error("loadDashboard sessions:", error.message);
    return [];
  }
  return (data ?? []) as unknown as SessionRow[];
}

function contentTitle(row: SessionRow, type: SessionType): string | null {
  if (type === "writing") return joinTitle(row.writing_prompts ?? null);
  if (type === "exam") return joinTitle(row.exam_prompts ?? null);
  if (type === "presentation") return joinTitle(row.presentation_prompts ?? null);
  return joinTitle(row.stories ?? null);
}

export async function loadDashboard(
  supabase: SupabaseClient,
  userId: string,
  classroomLevel: CourseLevel | null,
  displayNameFallback: string | null = null
): Promise<DashboardData> {
  const empty: DashboardData = {
    displayName: displayNameFallback,
    courseDisplayName: null,
    lessons: [],
    olderCourses: [],
    totals: { completed: 0, total: 0 },
    todaySession: null,
    zoomUrl: null,
    practice: {
      dictationAttempts: 0,
      wordsLookedUp: 0,
      pronunciationSessions: 0,
    },
  };

  try {
    const enrollmentPromise = supabase
      .from("course_enrollments")
      .select("course_id, display_name, enrolled_at, courses ( id, name, level, archived, zoom_url )")
      .eq("student_id", userId);

    const [
      enrollmentResult,
      progress,
      writingRows,
      progressRows,
      freeWriteRows,
      presentationRows,
    ] = await Promise.all([
      enrollmentPromise,
      loadStudentProgress(supabase, userId, classroomLevel),
      safeSelect<{ writing_prompt_id: string }>("writing_submissions", () =>
        supabase
          .from("writing_submissions")
          .select("writing_prompt_id")
          .eq("user_id", userId)
      ),
      safeSelect<{ story_id: string; status: string }>("user_progress", () =>
        supabase
          .from("user_progress")
          .select("story_id, status")
          .eq("user_id", userId)
      ),
      safeSelect<{ course_session_id: string | null }>(
        "video_summary_free_writes",
        () =>
          supabase
            .from("video_summary_free_writes")
            .select("course_session_id")
            .eq("user_id", userId)
      ),
      safeSelect<{ course_session_id: string | null }>(
        "presentation_responses",
        () =>
          supabase
            .from("presentation_responses")
            .select("course_session_id")
            .eq("user_id", userId)
      ),
    ]);

    if (enrollmentResult.error) {
      console.error("loadDashboard enrollments:", enrollmentResult.error.message);
    }

    type CourseJoin = {
      id: string;
      name: string;
      level: CourseLevel;
      archived: boolean;
      zoom_url?: string | null;
    };
    type EnrollmentRow = {
      course_id: string;
      display_name: string | null;
      enrolled_at: string;
      courses: CourseJoin | CourseJoin[] | null;
    };

    const enrollments = ((enrollmentResult.data ?? []) as EnrollmentRow[])
      .map((row) => {
        const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
        if (!course || course.archived) return null;
        return {
          courseId: row.course_id,
          displayName: row.display_name?.trim() || null,
          enrolledAt: row.enrolled_at,
          course,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const courseIds = enrollments.map((row) => row.courseId);
    const sessionRows = await loadSessionRows(supabase, courseIds);

    const examSessionIds = sessionRows
      .filter((row) => row.session_type === "exam")
      .map((row) => row.id);

    const examGroups = examSessionIds.length
      ? await safeSelect<{
          id: string;
          course_session_id: string;
          member_ids: string[] | null;
        }>("exam_groups", () =>
          supabase
            .from("exam_groups")
            .select("id, course_session_id, member_ids")
            .in("course_session_id", examSessionIds)
        )
      : [];

    const myGroupIds = examGroups
      .filter((group) => (group.member_ids ?? []).includes(userId))
      .map((group) => group.id);

    const examSubmissions = myGroupIds.length
      ? await safeSelect<{
          exam_group_id: string;
          course_session_id: string;
          status: string;
        }>("group_exam_submissions", () =>
          supabase
            .from("group_exam_submissions")
            .select("exam_group_id, course_session_id, status")
            .in("exam_group_id", myGroupIds)
        )
      : [];

    const completedStories = new Set(
      progressRows
        .filter((row) => row.status === "completed")
        .map((row) => row.story_id)
    );
    const completedWriting = new Set(
      writingRows.map((row) => row.writing_prompt_id)
    );
    const completedExamSessions = new Set(
      examSubmissions
        .filter((row) => row.status === "submitted")
        .map((row) => row.course_session_id)
    );
    const completedVideoSessions = new Set(
      freeWriteRows
        .map((row) => row.course_session_id)
        .filter((id): id is string => Boolean(id))
    );
    const completedPresentationSessions = new Set(
      presentationRows
        .map((row) => row.course_session_id)
        .filter((id): id is string => Boolean(id))
    );

    function isCompleted(row: SessionRow, type: SessionType): boolean {
      if (type === "story") {
        return row.story_id ? completedStories.has(row.story_id) : false;
      }
      if (type === "writing") {
        return row.writing_prompt_id
          ? completedWriting.has(row.writing_prompt_id)
          : false;
      }
      if (type === "exam") return completedExamSessions.has(row.id);
      if (type === "video_summary") return completedVideoSessions.has(row.id);
      if (type === "presentation") {
        return completedPresentationSessions.has(row.id);
      }
      return false;
    }

    const lessonsByCourse = new Map<string, DashboardLesson[]>();
    for (const row of sessionRows) {
      const sessionType: SessionType = isSessionType(row.session_type)
        ? row.session_type
        : "story";
      const lesson = toDashboardLesson({
        sessionId: row.id,
        sessionType,
        storyId: row.story_id,
        writingPromptId: row.writing_prompt_id ?? null,
        examPromptId: row.exam_prompt_id ?? null,
        presentationPromptId: row.presentation_prompt_id ?? null,
        title: contentTitle(row, sessionType),
        storySlug: joinSlug(row.stories ?? null),
        token: row.session_link_token,
        recordingYoutubeUrl: row.recording_youtube_url ?? null,
        sessionDate: row.session_date,
        sessionStartTime: row.session_start_time,
        sessionEndTime: row.session_end_time,
        completed: isCompleted(row, sessionType),
      });
      const list = lessonsByCourse.get(row.course_id) ?? [];
      list.push(lesson);
      lessonsByCourse.set(row.course_id, list);
    }

    const ranked = enrollments.map((enrollment) => {
      const lessons = lessonsByCourse.get(enrollment.courseId) ?? [];
      const latestStart = lessons.reduce((max, lesson) => {
        const t = new Date(lesson.sessionStartTime).getTime();
        return t > max ? t : max;
      }, 0);
      return { enrollment, lessons, latestStart };
    });

    const activeId = pickActiveCourseId(
      ranked.map((row) => ({
        courseId: row.enrollment.courseId,
        level: row.enrollment.course.level,
        enrolledAt: row.enrollment.enrolledAt,
        latestStart: row.latestStart,
        sessionDates: row.lessons.map((lesson) => lesson.sessionDate),
      })),
      classroomLevel
    );
    const active = ranked.find((row) => row.enrollment.courseId === activeId) ?? null;
    const older = ranked
      .filter((row) => row.enrollment.courseId !== active?.enrollment.courseId)
      .sort((a, b) => b.latestStart - a.latestStart)
      .map((row) => ({
        displayName: row.enrollment.course.name,
        lessons: [...row.lessons].sort(bySessionStartDesc),
      }));

    const lessons = [...(active?.lessons ?? [])].sort(bySessionStartAsc);
    const completedCount = lessons.filter((lesson) => lesson.completed).length;

    return {
      displayName:
        active?.enrollment.displayName ?? displayNameFallback,
      courseDisplayName: active?.enrollment.course.name ?? null,
      lessons,
      olderCourses: older,
      totals: { completed: completedCount, total: lessons.length },
      todaySession: pickTodaySession(lessons),
      zoomUrl: active?.enrollment.course.zoom_url ?? null,
      practice: {
        dictationAttempts: progress.dictationTrend.length,
        wordsLookedUp: progress.wordsLookedUp,
        pronunciationSessions: progress.pronunciationHistory.length,
      },
    };
  } catch (error) {
    console.error("loadDashboard failed:", error);
    return empty;
  }
}
