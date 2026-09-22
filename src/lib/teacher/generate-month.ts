import { enrollMatchingStudentsInCourse } from "@/lib/classroom-placement";
import {
  MONTHLY_TEMPLATE,
  TEMPLATE_LENGTH,
  shouldArchiveMonthKey,
} from "@/lib/monthly-template";
import { courseMonthKey } from "@/lib/teacher-month";
import type { CourseLevel } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const GENERATED_SESSION_MINUTES = 90;

export type GenerateOccurrence = {
  sessionDate: string;
  startIso: string;
};

export type GenerateMonthInput = {
  teacherId: string;
  name: string;
  level: CourseLevel;
  theme: string | null;
  yearMonth: string;
  occurrences: GenerateOccurrence[];
};

export type GenerateMonthResult =
  | { ok: true; courseId: string; archivedIds: string[] }
  | { ok: false; error: string };

const LEVELS: CourseLevel[] = ["pre-intermediate", "intermediate"];

export function coursesToArchive(
  courses: Array<{ id: string; monthKey: string }>,
  generatedMonth: string,
  newCourseId: string
): string[] {
  return courses
    .filter(
      (course) =>
        course.id !== newCourseId &&
        shouldArchiveMonthKey(course.monthKey, generatedMonth)
    )
    .map((course) => course.id);
}

function emptyContentFks() {
  return {
    story_id: null,
    writing_prompt_id: null,
    exam_prompt_id: null,
    presentation_prompt_id: null,
    conversation_prompt_id: null,
  };
}

export async function generateMonth(
  supabase: SupabaseClient,
  input: GenerateMonthInput
): Promise<GenerateMonthResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ponle un nombre al curso." };
  if (name.length > 80) {
    return { ok: false, error: "El nombre se pasó de 80 letras." };
  }
  if (!LEVELS.includes(input.level)) {
    return { ok: false, error: "Elige Pre-intermedio o Intermedio." };
  }
  if (!/^\d{4}-\d{2}$/.test(input.yearMonth)) {
    return { ok: false, error: "Elige un mes." };
  }
  if (input.occurrences.length === 0) {
    return { ok: false, error: "Elige al menos un día de la semana." };
  }
  if (input.occurrences.length > TEMPLATE_LENGTH) {
    return { ok: false, error: "Máximo 8 clases por mes." };
  }

  for (const row of input.occurrences) {
    if (!row.sessionDate.startsWith(input.yearMonth)) {
      return { ok: false, error: "Las fechas tienen que ser de ese mes." };
    }
    const start = new Date(row.startIso);
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: "Pon la hora de las clases." };
    }
  }

  const theme = input.theme?.trim() || null;
  if (theme && theme.length > 80) {
    return { ok: false, error: "El tema se pasó de 80 letras." };
  }

  const { data: priorRows, error: priorError } = await supabase
    .from("courses")
    .select("id, created_at, archived, zoom_url")
    .eq("teacher_id", input.teacherId)
    .eq("level", input.level)
    .order("created_at", { ascending: false });

  if (priorError) {
    console.error("generateMonth load prior courses failed:", priorError);
    return { ok: false, error: "No pude armar el mes. Inténtalo de nuevo." };
  }

  const prior =
    (priorRows as Array<{
      id: string;
      created_at: string;
      archived: boolean;
      zoom_url: string | null;
    }> | null) ?? [];
  const priorIds = prior.map((row) => row.id);
  const { data: priorSessions, error: priorSessionError } =
    priorIds.length > 0
      ? await supabase
          .from("course_sessions")
          .select("course_id, session_date, session_start_time")
          .in("course_id", priorIds)
      : { data: [], error: null };

  if (priorSessionError) {
    console.error("generateMonth load prior sessions failed:", priorSessionError);
    return { ok: false, error: "No pude armar el mes. Inténtalo de nuevo." };
  }

  const sessionsByCourse = new Map<
    string,
    Array<{ sessionDate: string; start: string }>
  >();
  for (const row of (priorSessions ?? []) as Array<{
    course_id: string;
    session_date: string;
    session_start_time: string;
  }>) {
    const list = sessionsByCourse.get(row.course_id) ?? [];
    list.push({ sessionDate: row.session_date, start: row.session_start_time });
    sessionsByCourse.set(row.course_id, list);
  }

  let zoomUrl: string | null = null;
  let latestStart = -1;
  let latestCreated = "";
  for (const course of prior) {
    const sessions = sessionsByCourse.get(course.id) ?? [];
    const maxStart = sessions.reduce((max, session) => {
      const t = new Date(session.start).getTime();
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, -1);
    if (maxStart > latestStart) {
      latestStart = maxStart;
      zoomUrl = course.zoom_url;
    } else if (latestStart < 0 && course.created_at > latestCreated) {
      latestCreated = course.created_at;
      zoomUrl = course.zoom_url;
    }
  }

  const { data: created, error: createError } = await supabase
    .from("courses")
    .insert({
      name,
      level: input.level,
      teacher_id: input.teacherId,
      zoom_url: zoomUrl,
      theme,
    })
    .select("id")
    .single();

  if (createError || !created) {
    console.error("generateMonth create course failed:", createError);
    return { ok: false, error: "No pude crear el curso. Inténtalo de nuevo." };
  }

  const sessionRows = input.occurrences.map((row, index) => {
    const start = new Date(row.startIso);
    const end = new Date(
      start.getTime() + GENERATED_SESSION_MINUTES * 60 * 1000
    );
    return {
      course_id: created.id,
      session_type: MONTHLY_TEMPLATE[index] ?? "story",
      ...emptyContentFks(),
      session_date: row.sessionDate,
      session_start_time: start.toISOString(),
      session_end_time: end.toISOString(),
    };
  });

  const { error: sessionError } = await supabase
    .from("course_sessions")
    .insert(sessionRows);

  if (sessionError) {
    console.error("generateMonth insert sessions failed:", sessionError);
    await supabase
      .from("courses")
      .delete()
      .eq("id", created.id)
      .eq("teacher_id", input.teacherId);
    return { ok: false, error: "No pude crear las clases. Inténtalo de nuevo." };
  }

  await enrollMatchingStudentsInCourse({
    courseId: created.id,
    level: input.level,
  });

  const archiveCandidates = prior
    .filter((course) => !course.archived)
    .map((course) => ({
      id: course.id,
      monthKey: courseMonthKey(
        sessionsByCourse.get(course.id) ?? [],
        course.created_at
      ),
    }));
  const archivedIds = coursesToArchive(
    archiveCandidates,
    input.yearMonth,
    created.id
  );

  if (archivedIds.length > 0) {
    const { error: archiveError } = await supabase
      .from("courses")
      .update({ archived: true })
      .in("id", archivedIds)
      .eq("teacher_id", input.teacherId)
      .eq("archived", false);
    if (archiveError) {
      console.error("generateMonth archive failed:", archiveError);
    }
  }

  return { ok: true, courseId: created.id, archivedIds };
}
