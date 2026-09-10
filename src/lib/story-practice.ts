import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryKind } from "@/types";

export type StoryPracticeReaderMode =
  | "classroom-live"
  | "classroom-review"
  | "open";

export type PracticeSessionRow = {
  courseId?: string;
  sessionType: string;
  storyId: string | null;
  sessionStartTime: string;
  sessionEndTime?: string | null;
  classEndedAt?: string | null;
  recordingYoutubeUrl?: string | null;
};

export function canShowStoryPractice(input: {
  isTeacher: boolean;
  storyKind: StoryKind | string | null | undefined;
  readerMode: StoryPracticeReaderMode;
  pronunciationStartsAt: string | null;
  now?: Date;
}): boolean {
  if (input.isTeacher) return true;
  if (input.readerMode === "classroom-live") return false;
  if (input.storyKind !== "story") return true;
  if (!input.pronunciationStartsAt) return true;
  const now = input.now ?? new Date();
  return now.getTime() >= new Date(input.pronunciationStartsAt).getTime();
}

export function isStoryPracticeGated(input: {
  isTeacher: boolean;
  storyKind: StoryKind | string | null | undefined;
  readerMode: StoryPracticeReaderMode;
  pronunciationStartsAt: string | null;
  now?: Date;
}): boolean {
  if (input.isTeacher) return false;
  if (input.storyKind !== "story") return false;
  if (input.readerMode === "classroom-live") return false;
  if (!input.pronunciationStartsAt) return false;
  return !canShowStoryPractice(input);
}

export function pickPronunciationSession(
  rows: PracticeSessionRow[],
  input: {
    storyId?: string | null;
    storySessionStart?: string | null;
  } = {}
): PracticeSessionRow | null {
  const pronunciation = rows
    .filter((row) => row.sessionType === "pronunciation")
    .slice()
    .sort(
      (a, b) =>
        new Date(a.sessionStartTime).getTime() -
        new Date(b.sessionStartTime).getTime()
    );
  if (pronunciation.length === 0) return null;

  const storyStartIso =
    input.storySessionStart ??
    rows
      .filter(
        (row) =>
          row.sessionType === "story" &&
          (input.storyId == null || row.storyId === input.storyId)
      )
      .map((row) => row.sessionStartTime)
      .sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      )[0] ??
    null;

  if (!storyStartIso) return pronunciation[0] ?? null;
  const storyStartMs = new Date(storyStartIso).getTime();
  const afterStory = pronunciation.find(
    (row) => new Date(row.sessionStartTime).getTime() >= storyStartMs
  );
  if (afterStory) return afterStory;
  return pronunciation[pronunciation.length - 1] ?? null;
}

export function pickPronunciationStart(
  rows: PracticeSessionRow[],
  input: {
    storyId?: string | null;
    storySessionStart?: string | null;
  } = {}
): string | null {
  return pickPronunciationSession(rows, input)?.sessionStartTime ?? null;
}

export function storyStepRecordingUrl(input: {
  stepId: string;
  storyRecordingUrl: string | null;
  practiceRecordingUrl: string | null;
}): string | null {
  if (
    input.stepId === "dictation" ||
    input.stepId === "choral" ||
    input.stepId === "pronunciation"
  ) {
    return input.practiceRecordingUrl;
  }
  return input.storyRecordingUrl;
}

export function pickPronunciationSessionForStory(
  rows: PracticeSessionRow[],
  storyId: string,
  now = new Date()
): PracticeSessionRow | null {
  const byCourse = new Map<string, PracticeSessionRow[]>();
  for (const row of rows) {
    const courseId = row.courseId ?? "_";
    const list = byCourse.get(courseId) ?? [];
    list.push(row);
    byCourse.set(courseId, list);
  }

  const sessions: PracticeSessionRow[] = [];
  for (const courseRows of byCourse.values()) {
    const session = pickPronunciationSession(courseRows, { storyId });
    if (session) sessions.push(session);
  }
  if (sessions.length === 0) return null;

  const nowMs = now.getTime();
  const future = sessions
    .filter((session) => new Date(session.sessionStartTime).getTime() > nowMs)
    .sort(
      (a, b) =>
        new Date(a.sessionStartTime).getTime() -
        new Date(b.sessionStartTime).getTime()
    );
  if (future.length > 0) return future[0] ?? null;
  return (
    sessions.sort(
      (a, b) =>
        new Date(a.sessionStartTime).getTime() -
        new Date(b.sessionStartTime).getTime()
    )[0] ?? null
  );
}

export function pickPronunciationStartForStory(
  rows: PracticeSessionRow[],
  storyId: string,
  now = new Date()
): string | null {
  return pickPronunciationSessionForStory(rows, storyId, now)?.sessionStartTime ??
    null;
}

type SessionQueryRow = {
  course_id?: string | null;
  session_type?: string | null;
  story_id?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
  class_ended_at?: string | null;
  recording_youtube_url?: string | null;
};

function mapSessionRows(data: SessionQueryRow[] | null): PracticeSessionRow[] {
  return (data ?? [])
    .filter(
      (row): row is SessionQueryRow & { session_start_time: string } =>
        typeof row.session_start_time === "string"
    )
    .map((row) => ({
      courseId: typeof row.course_id === "string" ? row.course_id : undefined,
      sessionType: typeof row.session_type === "string" ? row.session_type : "story",
      storyId: typeof row.story_id === "string" ? row.story_id : null,
      sessionStartTime: row.session_start_time,
      sessionEndTime:
        typeof row.session_end_time === "string" ? row.session_end_time : null,
      classEndedAt:
        typeof row.class_ended_at === "string" ? row.class_ended_at : null,
      recordingYoutubeUrl:
        typeof row.recording_youtube_url === "string"
          ? row.recording_youtube_url
          : null,
    }));
}

const PRONUNCIATION_SESSION_COLUMNS =
  "course_id, session_type, story_id, session_start_time, session_end_time, class_ended_at, recording_youtube_url";

export async function loadPronunciationSession(
  supabase: SupabaseClient,
  input: {
    storyId: string;
    storyKind: StoryKind | string | null | undefined;
    courseId: string | null;
    storySessionStart: string | null;
    userId: string | null;
  }
): Promise<PracticeSessionRow | null> {
  if (input.storyKind !== "story") return null;

  if (input.courseId) {
    const { data, error } = await supabase
      .from("course_sessions")
      .select(PRONUNCIATION_SESSION_COLUMNS)
      .eq("course_id", input.courseId);

    if (error) {
      console.error("loadPronunciationSession course failed:", error.message);
      return null;
    }

    return pickPronunciationSession(mapSessionRows(data), {
      storyId: input.storyId,
      storySessionStart: input.storySessionStart,
    });
  }

  if (!input.userId) return null;

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("course_enrollments")
    .select("course_id")
    .eq("student_id", input.userId);

  if (enrollmentError) {
    console.error(
      "loadPronunciationSession enrollments failed:",
      enrollmentError.message
    );
    return null;
  }

  const courseIds = (enrollments ?? [])
    .map((row) => row.course_id)
    .filter((id): id is string => typeof id === "string");
  if (courseIds.length === 0) return null;

  const { data, error } = await supabase
    .from("course_sessions")
    .select(PRONUNCIATION_SESSION_COLUMNS)
    .in("course_id", courseIds);

  if (error) {
    console.error("loadPronunciationSession open failed:", error.message);
    return null;
  }

  return pickPronunciationSessionForStory(mapSessionRows(data), input.storyId);
}
