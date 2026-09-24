import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { isSessionType, type SessionType } from "@/lib/activities";
import { hasSessionContent } from "@/lib/dashboard";
import { getSessionPhase, pickClassDaySession } from "@/lib/session-phase";
import type { CourseLevel } from "@/types";

export type OwnedCourse = {
  id: string;
  name: string;
  level: CourseLevel;
  teacher_id: string;
  archived: boolean;
  zoom_url: string | null;
  theme: string | null;
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
  presentationPromptId: string | null;
  conversationPromptId: string | null;
  sessionDate: string;
  start: string;
  end: string;
  classEndedAt: string | null;
  answersRevealed: boolean;
  notes: string | null;
  token: string;
  timerStartedAt: string | null;
  examTimerMode: "until_end_offset" | "from_start";
  examTimerMinutes: number;
  recordingYoutubeUrl: string | null;
  story: StoryRef | null;
  writingPrompt: WritingPromptRef | null;
  examPrompt: ExamPromptRef | null;
  presentationPrompt: PresentationPromptRef | null;
  conversationPrompt: ConversationPromptRef | null;
};

export type ExamPromptRef = {
  title: string;
  level: CourseLevel;
  timeLimitMinutes: number;
};

export type PresentationPromptRef = {
  title: string;
  level: CourseLevel;
};

export type ConversationPromptRef = {
  title: string;
  level: CourseLevel;
};

export type CurrentSessionKind = "live" | "upcoming" | "past";

export type CurrentSession = {
  kind: CurrentSessionKind;
  session: TeacherSession;
};

type StoryJoin = StoryRef | StoryRef[] | null;
type PromptJoin = WritingPromptRefRow | WritingPromptRefRow[] | null;
type ExamPromptJoin = ExamPromptRefRow | ExamPromptRefRow[] | null;
type PresentationPromptJoin =
  | PresentationPromptRefRow
  | PresentationPromptRefRow[]
  | null;
type ConversationPromptJoin =
  | ConversationPromptRefRow
  | ConversationPromptRefRow[]
  | null;

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

type PresentationPromptRefRow = {
  title: string;
  level: CourseLevel;
};

type ConversationPromptRefRow = {
  title: string;
  level: CourseLevel;
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

function presentationPromptFromJoin(
  prompts: PresentationPromptJoin
): PresentationPromptRef | null {
  const row = !prompts
    ? null
    : Array.isArray(prompts)
      ? (prompts[0] ?? null)
      : prompts;
  if (!row) return null;
  return {
    title: row.title,
    level: row.level,
  };
}

function conversationPromptFromJoin(
  prompts: ConversationPromptJoin
): ConversationPromptRef | null {
  const row = !prompts
    ? null
    : Array.isArray(prompts)
      ? (prompts[0] ?? null)
      : prompts;
  if (!row) return null;
  return {
    title: row.title,
    level: row.level,
  };
}

export function sessionTitle(session: TeacherSession): string {
  if (session.sessionType === "writing") {
    return session.writingPrompt?.title || "Escritura";
  }
  if (session.sessionType === "exam") {
    return session.examPrompt?.title || "Examen";
  }
  if (session.sessionType === "presentation") {
    return session.presentationPrompt?.title || "Presentación";
  }
  if (session.sessionType === "conversation") {
    return session.conversationPrompt?.title || "Conversación";
  }
  if (session.sessionType === "video_summary") {
    return session.story?.title ?? "Traducción";
  }
  if (session.sessionType === "dialogue") {
    return session.story?.title ?? "Diálogo";
  }
  if (session.sessionType === "movie_talk") {
    return session.story?.title ?? "Movie Talk";
  }
  if (session.sessionType === "song") {
    return session.story?.title ?? "Música";
  }
  if (session.sessionType === "pronunciation") {
    return "Pronunciación";
  }
  if (session.sessionType === "flex") {
    return "Por elegir";
  }
  return session.story?.title ?? "Historia";
}

export function sessionContentStatus(session: {
  sessionType: SessionType;
  storyId: string | null;
  writingPromptId: string | null;
  examPromptId: string | null;
  presentationPromptId: string | null;
  conversationPromptId: string | null;
}): "Contenido listo" | "Sin contenido" | "Por elegir" {
  if (session.sessionType === "flex") return "Por elegir";
  return hasSessionContent(session) ? "Contenido listo" : "Sin contenido";
}

export function sessionRecordingStatus(
  url: string | null | undefined
): "Grabación" | "Sin grabación" {
  return url ? "Grabación" : "Sin grabación";
}

export function pickTodayTeacherSession(
  sessions: TeacherSession[],
  now = new Date()
): TeacherSession | null {
  return pickClassDaySession(
    sessions.map((session) => ({
      session,
      sessionDate: session.sessionDate,
      sessionStartTime: session.start,
      sessionEndTime: session.end,
      classEndedAt: session.classEndedAt,
    })),
    now
  )?.session ?? null;
}

export function pickCurrentSession(
  sessions: TeacherSession[],
  now = new Date()
): CurrentSession | null {
  if (sessions.length === 0) return null;
  const t = now.getTime();

  const live = sessions.find((session) => {
    return (
      getSessionPhase(
        {
          sessionStartTime: session.start,
          sessionEndTime: session.end,
          classEndedAt: session.classEndedAt,
        },
        now
      ) === "live"
    );
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

export function readySessionCount(
  sessions: Array<{
    sessionType: SessionType;
    storyId: string | null;
    writingPromptId: string | null;
    examPromptId: string | null;
    presentationPromptId: string | null;
    conversationPromptId: string | null;
  }>
): number {
  return sessions.filter((session) => hasSessionContent(session)).length;
}

export function readinessLabel(
  sessions: Array<{
    sessionType: SessionType;
    storyId: string | null;
    writingPromptId: string | null;
    examPromptId: string | null;
    presentationPromptId: string | null;
    conversationPromptId: string | null;
  }>
): string {
  return `${readySessionCount(sessions)}/8 clases listas`;
}

export async function getOwnedCourse(courseId: string): Promise<{
  course: OwnedCourse;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, name, level, teacher_id, archived, zoom_url, theme")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!data) {
    redirect("/teacher");
  }

  const course = data as OwnedCourse;
  return {
    course: {
      ...course,
      zoom_url: course.zoom_url ?? null,
      theme: course.theme?.trim() ? course.theme : null,
    },
    supabase,
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
  conversation_prompt_id?: string | null;
  session_start_time: string;
  session_end_time: string;
  class_ended_at?: string | null;
  session_date?: string | null;
  answers_revealed: boolean;
  notes: string | null;
  session_link_token: string;
  timer_started_at?: string | null;
  exam_timer_mode?: string | null;
  exam_timer_minutes?: number | null;
  recording_youtube_url?: string | null;
  stories: StoryJoin;
  writing_prompts?: PromptJoin;
  exam_prompts?: ExamPromptJoin;
  presentation_prompts?: PresentationPromptJoin;
  conversation_prompts?: ConversationPromptJoin;
};

export function mapSessionRow(row: SessionRow): TeacherSession {
  const sessionType: SessionType = isSessionType(row.session_type)
    ? row.session_type
    : row.writing_prompt_id
      ? "writing"
      : row.exam_prompt_id
        ? "exam"
        : row.presentation_prompt_id
          ? "presentation"
          : row.conversation_prompt_id
            ? "conversation"
            : "story";

  return {
    id: row.id,
    courseId: row.course_id,
    sessionType,
    storyId: row.story_id,
    writingPromptId: row.writing_prompt_id ?? null,
    examPromptId: row.exam_prompt_id ?? null,
    presentationPromptId: row.presentation_prompt_id ?? null,
    conversationPromptId: row.conversation_prompt_id ?? null,
    sessionDate:
      row.session_date && /^\d{4}-\d{2}-\d{2}/.test(row.session_date)
        ? row.session_date.slice(0, 10)
        : row.session_start_time.slice(0, 10),
    start: row.session_start_time,
    end: row.session_end_time,
    classEndedAt: row.class_ended_at ?? null,
    answersRevealed: row.answers_revealed,
    notes: row.notes,
    token: row.session_link_token,
    timerStartedAt: row.timer_started_at ?? null,
    examTimerMode:
      row.exam_timer_mode === "from_start" ? "from_start" : "until_end_offset",
    examTimerMinutes:
      typeof row.exam_timer_minutes === "number" && row.exam_timer_minutes > 0
        ? row.exam_timer_minutes
        : 20,
    recordingYoutubeUrl: row.recording_youtube_url ?? null,
    story: storyFromJoin(row.stories),
    writingPrompt: promptFromJoin(row.writing_prompts ?? null),
    examPrompt: examPromptFromJoin(row.exam_prompts ?? null),
    presentationPrompt: presentationPromptFromJoin(
      row.presentation_prompts ?? null
    ),
    conversationPrompt: conversationPromptFromJoin(
      row.conversation_prompts ?? null
    ),
  };
}

export const SESSION_SELECT =
  "id, course_id, session_type, story_id, writing_prompt_id, exam_prompt_id, presentation_prompt_id, conversation_prompt_id, timer_started_at, exam_timer_mode, exam_timer_minutes, session_date, session_start_time, session_end_time, class_ended_at, answers_revealed, notes, session_link_token, recording_youtube_url, stories ( title, slug ), writing_prompts ( title, prompt_text, writing_time_minutes, level ), exam_prompts ( title, level, time_limit_minutes ), presentation_prompts ( title, level ), conversation_prompts ( title, level )";

const SESSION_SELECT_LEGACY =
  "id, course_id, story_id, session_date, session_start_time, session_end_time, class_ended_at, answers_revealed, notes, session_link_token, stories ( title, slug )";

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

export async function setSessionRecordingUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    courseId: string;
    sessionId: string;
    url: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("course_sessions")
    .update({ recording_youtube_url: input.url })
    .eq("id", input.sessionId)
    .eq("course_id", input.courseId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("setSessionRecordingUrl failed:", error);
    return { ok: false, error: "No pude guardar el link. Inténtalo de nuevo." };
  }
  return { ok: true };
}
