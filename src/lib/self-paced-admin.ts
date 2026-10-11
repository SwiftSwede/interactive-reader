import { AppError } from "@/lib/errors";
import { storyLevelFitsCourse } from "@/lib/library-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CourseLevel } from "@/types";

export type SelfPacedCourseSummary = {
  id: string;
  name: string;
  level: CourseLevel;
  description: string | null;
  isPublished: boolean;
  lessonCount: number;
};

export type SelfPacedLessonRow = {
  id: string;
  position: number;
  storyId: string;
  title: string;
  level: string;
};

export type StorySearchHit = {
  id: string;
  title: string;
  level: string;
};

const COURSE_LEVELS: CourseLevel[] = [
  "beginner",
  "pre-intermediate",
  "intermediate",
];

export function isSelfPacedLevel(value: string): value is CourseLevel {
  return (COURSE_LEVELS as string[]).includes(value);
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

async function ownedCourse(teacherId: string, courseId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("courses")
    .select("id, name, level, description, is_published, format, teacher_id")
    .eq("id", courseId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw new AppError(error.message, "COURSE_READ_FAILED", 500);
  if (!data || data.format !== "self_paced") return null;
  return data;
}

export async function listSelfPacedCourses(
  teacherId: string
): Promise<SelfPacedCourseSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("courses")
    .select("id, name, level, description, is_published")
    .eq("teacher_id", teacherId)
    .eq("format", "self_paced")
    .order("created_at", { ascending: false });

  if (error) throw new AppError(error.message, "COURSE_LIST_FAILED", 500);

  const courses = data ?? [];
  const ids = courses.map((course) => course.id as string);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: lessons, error: lessonError } = await admin
      .from("course_lessons")
      .select("course_id")
      .in("course_id", ids);
    if (lessonError) {
      throw new AppError(lessonError.message, "COURSE_LESSON_COUNT_FAILED", 500);
    }
    for (const row of lessons ?? []) {
      const courseId = row.course_id as string;
      counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    }
  }

  return courses.map((course) => ({
    id: course.id as string,
    name: course.name as string,
    level: course.level as CourseLevel,
    description: (course.description as string | null) ?? null,
    isPublished: Boolean(course.is_published),
    lessonCount: counts.get(course.id as string) ?? 0,
  }));
}

export async function createSelfPacedCourse(input: {
  teacherId: string;
  name: string;
  level: CourseLevel;
  description: string;
  isPublished: boolean;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("courses")
    .insert({
      name: plainText(input.name),
      level: input.level,
      description: plainText(input.description) || null,
      is_published: input.isPublished,
      format: "self_paced",
      teacher_id: input.teacherId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new AppError(error?.message ?? "insert failed", "COURSE_CREATE_FAILED", 500);
  }
  return data.id as string;
}

export async function getSelfPacedCourse(teacherId: string, courseId: string) {
  const course = await ownedCourse(teacherId, courseId);
  if (!course) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_lessons")
    .select("id, position, story_id, stories(title, level)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (error) throw new AppError(error.message, "COURSE_LESSONS_FAILED", 500);

  const lessons: SelfPacedLessonRow[] = (data ?? []).map((row) => {
    const story = row.stories as
      | { title: string; level: string }
      | { title: string; level: string }[]
      | null;
    const joined = Array.isArray(story) ? story[0] : story;
    return {
      id: row.id as string,
      position: row.position as number,
      storyId: row.story_id as string,
      title: joined?.title ?? "Lección",
      level: joined?.level ?? "",
    };
  });

  return {
    id: course.id as string,
    name: course.name as string,
    level: course.level as CourseLevel,
    description: (course.description as string | null) ?? "",
    isPublished: Boolean(course.is_published),
    lessons,
  };
}

export async function setSelfPacedPublished(input: {
  teacherId: string;
  courseId: string;
  isPublished: boolean;
}): Promise<void> {
  const course = await ownedCourse(input.teacherId, input.courseId);
  if (!course) throw new AppError("Curso no encontrado", "COURSE_NOT_FOUND", 404);
  const admin = createAdminClient();
  const { error } = await admin
    .from("courses")
    .update({ is_published: input.isPublished })
    .eq("id", input.courseId)
    .eq("teacher_id", input.teacherId);

  if (error) throw new AppError(error.message, "COURSE_PUBLISH_FAILED", 500);
}

export async function searchStoriesForCourse(input: {
  teacherId: string;
  courseId: string;
  query: string;
}): Promise<StorySearchHit[]> {
  const course = await ownedCourse(input.teacherId, input.courseId);
  if (!course) return [];
  const needle = plainText(input.query).replace(/[%_]/g, "").slice(0, 80);
  if (needle.length < 2) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stories")
    .select("id, title, level")
    .ilike("title", `%${needle}%`)
    .limit(30);

  if (error) throw new AppError(error.message, "STORY_SEARCH_FAILED", 500);

  const { data: existing, error: existingError } = await admin
    .from("course_lessons")
    .select("story_id")
    .eq("course_id", input.courseId);
  if (existingError) {
    throw new AppError(existingError.message, "COURSE_LESSONS_FAILED", 500);
  }
  const taken = new Set((existing ?? []).map((row) => row.story_id as string));

  return (data ?? [])
    .filter(
      (row) =>
        !taken.has(row.id as string) &&
        storyLevelFitsCourse(row.level as string, course.level as string)
    )
    .slice(0, 12)
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      level: row.level as string,
    }));
}

async function renumberLessons(courseId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_lessons")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (error) throw new AppError(error.message, "COURSE_LESSONS_FAILED", 500);

  const rows = data ?? [];
  for (let index = 0; index < rows.length; index += 1) {
    const next = index + 1;
    if (rows[index].position === next) continue;
    const { error: updateError } = await admin
      .from("course_lessons")
      .update({ position: next })
      .eq("id", rows[index].id as string);
    if (updateError) {
      throw new AppError(updateError.message, "COURSE_REORDER_FAILED", 500);
    }
  }
}

export async function addCourseLesson(input: {
  teacherId: string;
  courseId: string;
  storyId: string;
}): Promise<void> {
  const course = await ownedCourse(input.teacherId, input.courseId);
  if (!course) throw new AppError("Curso no encontrado", "COURSE_NOT_FOUND", 404);

  const admin = createAdminClient();
  const { data: story, error: storyError } = await admin
    .from("stories")
    .select("id, level")
    .eq("id", input.storyId)
    .maybeSingle();
  if (storyError) throw new AppError(storyError.message, "STORY_READ_FAILED", 500);
  if (!story || !storyLevelFitsCourse(story.level as string, course.level as string)) {
    throw new AppError("Esa lección no cabe en este nivel", "STORY_LEVEL", 422);
  }

  const { data: last, error: lastError } = await admin
    .from("course_lessons")
    .select("position")
    .eq("course_id", input.courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw new AppError(lastError.message, "COURSE_LESSONS_FAILED", 500);

  const position = ((last?.position as number | undefined) ?? 0) + 1;
  const { error } = await admin.from("course_lessons").insert({
    course_id: input.courseId,
    story_id: input.storyId,
    position,
  });
  if (error) {
    if (error.code === "23505") {
      throw new AppError("Esa lección ya está en el curso", "LESSON_EXISTS", 422);
    }
    throw new AppError(error.message, "LESSON_ADD_FAILED", 500);
  }
  await renumberLessons(input.courseId);
}

export async function removeCourseLesson(input: {
  teacherId: string;
  courseId: string;
  lessonId: string;
}): Promise<void> {
  const course = await ownedCourse(input.teacherId, input.courseId);
  if (!course) throw new AppError("Curso no encontrado", "COURSE_NOT_FOUND", 404);
  const admin = createAdminClient();
  const { error } = await admin
    .from("course_lessons")
    .delete()
    .eq("id", input.lessonId)
    .eq("course_id", input.courseId);
  if (error) throw new AppError(error.message, "LESSON_REMOVE_FAILED", 500);
  await renumberLessons(input.courseId);
}

export async function moveCourseLesson(input: {
  teacherId: string;
  courseId: string;
  lessonId: string;
  direction: "up" | "down";
}): Promise<void> {
  const course = await ownedCourse(input.teacherId, input.courseId);
  if (!course) throw new AppError("Curso no encontrado", "COURSE_NOT_FOUND", 404);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_lessons")
    .select("id, position")
    .eq("course_id", input.courseId)
    .order("position", { ascending: true });
  if (error) throw new AppError(error.message, "COURSE_LESSONS_FAILED", 500);

  const rows = data ?? [];
  const index = rows.findIndex((row) => row.id === input.lessonId);
  if (index < 0) return;
  const swapWith = input.direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= rows.length) return;

  const current = rows[index];
  const neighbor = rows[swapWith];
  const { error: firstError } = await admin
    .from("course_lessons")
    .update({ position: neighbor.position as number })
    .eq("id", current.id as string);
  if (firstError) throw new AppError(firstError.message, "COURSE_REORDER_FAILED", 500);
  const { error: secondError } = await admin
    .from("course_lessons")
    .update({ position: current.position as number })
    .eq("id", neighbor.id as string);
  if (secondError) {
    throw new AppError(secondError.message, "COURSE_REORDER_FAILED", 500);
  }
  await renumberLessons(input.courseId);
}
