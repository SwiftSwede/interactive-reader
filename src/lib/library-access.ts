import { AppError } from "@/lib/errors";
import { courseLessonTotal } from "@/lib/iplo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CourseFormat, CourseLevel, LibraryLevel } from "@/types";

const LIBRARY_LEVELS: readonly LibraryLevel[] = [
  "beginner",
  "pre-intermediate",
  "intermediate",
  "pronunciation",
];

export type OwnedGrants = {
  courseIds: Set<string>;
  levels: Set<LibraryLevel>;
};

export type GrantItem = {
  itemType: string;
  courseId: string | null;
  level: string | null;
};

export type SelfPacedCourseRef = {
  id: string;
  format: CourseFormat | string;
  level: string;
};

export type CourseLessonPointer = {
  storyId: string;
  slug: string;
  position: number;
};

export type ProgressStatus = {
  storyId: string;
  status: string;
};

export type GateMembership = {
  courseId: string;
  level: string;
  position: number;
  published: boolean;
  priorStoryIds: string[];
};

export type SelfPacedLessonDecision = "skip" | "allow" | "denied" | "locked";

export type SelfPacedCourseCard = {
  courseId: string;
  name: string;
  completed: number;
  total: number;
  nextHref: string | null;
};

export function isLibraryLevel(value: string): value is LibraryLevel {
  return (LIBRARY_LEVELS as readonly string[]).includes(value);
}

/** Each owned library level grants that level only. */
export function levelsGrantedBy(ownedLevels: Iterable<string>): Set<LibraryLevel> {
  const granted = new Set<LibraryLevel>();
  for (const level of ownedLevels) {
    if (isLibraryLevel(level)) granted.add(level);
  }
  return granted;
}

export function grantsFromItems(items: GrantItem[]): OwnedGrants {
  const courseIds = new Set<string>();
  const levels = new Set<LibraryLevel>();
  for (const item of items) {
    if (item.itemType === "course" && item.courseId) {
      courseIds.add(item.courseId);
    }
    if (item.itemType === "level_library" && item.level && isLibraryLevel(item.level)) {
      levels.add(item.level);
    }
  }
  return { courseIds, levels };
}

export function studentCanAccessSelfPacedCourse(
  grants: OwnedGrants,
  course: SelfPacedCourseRef
): boolean {
  if (course.format !== "self_paced") return false;
  if (grants.courseIds.has(course.id)) return true;
  if (course.level === "pronunciation") return false;
  return grants.levels.has(course.level as LibraryLevel);
}

export function nextIncompleteLesson(
  lessons: CourseLessonPointer[],
  progress: ProgressStatus[]
): CourseLessonPointer | null {
  const completed = new Set(
    progress
      .filter((row) => row.status === "completed")
      .map((row) => row.storyId)
  );
  const ordered = [...lessons].sort((a, b) => a.position - b.position);
  return ordered.find((lesson) => !completed.has(lesson.storyId)) ?? null;
}

export function selfPacedCardCopy(
  completed: number,
  total: number
): { meter: string; showContinue: boolean; finished: boolean } {
  const finished = total > 0 && completed >= total;
  return {
    meter: `${completed}/${total} lecciones`,
    showContinue: total > 0 && !finished,
    finished,
  };
}

export function decideSelfPacedLesson(input: {
  isTeacher: boolean;
  sessionOk: boolean;
  memberships: GateMembership[];
  grants: OwnedGrants;
  completedStoryIds: Set<string>;
}): SelfPacedLessonDecision {
  if (input.memberships.length === 0) return "skip";
  const published = input.memberships.filter((row) => row.published);
  if (published.length === 0) return "denied";
  if (input.isTeacher || input.sessionOk) return "allow";

  const accessible = published.filter((row) =>
    studentCanAccessSelfPacedCourse(input.grants, {
      id: row.courseId,
      format: "self_paced",
      level: row.level,
    })
  );
  if (accessible.length === 0) return "denied";
  if (accessible.some((row) => row.level !== "beginner")) return "allow";

  const unlocked = accessible.some((row) =>
    row.priorStoryIds.every((storyId) => input.completedStoryIds.has(storyId))
  );
  return unlocked ? "allow" : "locked";
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

type ItemJoin = {
  item_type: string;
  course_id: string | null;
  level: string | null;
};

type ProductJoin = {
  product_items: ItemJoin | ItemJoin[] | null;
};

export async function getOwnedGrants(userId: string): Promise<OwnedGrants> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("purchases")
    .select("products(product_items(item_type, course_id, level))")
    .eq("user_id", userId);

  if (error) {
    throw new AppError(error.message, "PURCHASES_READ_FAILED", 500);
  }

  const items: GrantItem[] = [];
  for (const row of data ?? []) {
    const product = row.products as ProductJoin | ProductJoin[] | null;
    for (const joined of asArray(product)) {
      for (const item of asArray(joined.product_items)) {
        items.push({
          itemType: item.item_type,
          courseId: item.course_id,
          level: item.level,
        });
      }
    }
  }
  return grantsFromItems(items);
}

export async function ensureSelfPacedEnrollments(userId: string): Promise<void> {
  const admin = createAdminClient();
  const grants = await getOwnedGrants(userId);
  const { data, error } = await admin
    .from("courses")
    .select("id, format, level")
    .eq("format", "self_paced")
    .eq("is_published", true)
    .eq("archived", false);

  if (error) {
    throw new AppError(error.message, "SELF_PACED_COURSES_READ_FAILED", 500);
  }

  const allowed = (data ?? []).filter((course) =>
    studentCanAccessSelfPacedCourse(grants, {
      id: course.id as string,
      format: course.format as string,
      level: course.level as string,
    })
  );
  if (allowed.length === 0) return;

  const { error: insertError } = await admin.from("course_enrollments").upsert(
    allowed.map((course) => ({
      course_id: course.id as string,
      student_id: userId,
      display_name: "",
    })),
    { onConflict: "course_id,student_id", ignoreDuplicates: true }
  );

  if (insertError) {
    throw new AppError(insertError.message, "SELF_PACED_ENROLL_FAILED", 500);
  }
}

type LessonJoin = {
  course_id: string;
  position: number;
  story_id: string;
  stories:
    | { slug: string; kind: string | null }
    | { slug: string; kind: string | null }[]
    | null;
};

export async function loadSelfPacedCards(
  userId: string,
  courses: { id: string; name: string }[]
): Promise<SelfPacedCourseCard[]> {
  if (courses.length === 0) return [];
  const admin = createAdminClient();
  const courseIds = courses.map((course) => course.id);
  const { data, error } = await admin
    .from("course_lessons")
    .select("course_id, position, story_id, stories(slug, kind)")
    .in("course_id", courseIds)
    .order("position", { ascending: true });

  if (error) {
    throw new AppError(error.message, "COURSE_LESSONS_READ_FAILED", 500);
  }

  const lessons = (data ?? []) as LessonJoin[];
  const storyIds = [...new Set(lessons.map((row) => row.story_id))];
  const completed = new Set<string>();
  if (storyIds.length > 0) {
    const { data: progress, error: progressError } = await admin
      .from("user_progress")
      .select("story_id, status")
      .eq("user_id", userId)
      .in("story_id", storyIds);
    if (progressError) {
      throw new AppError(progressError.message, "PROGRESS_READ_FAILED", 500);
    }
    for (const row of progress ?? []) {
      if (row.status === "completed") completed.add(row.story_id as string);
    }
  }

  const nameById = new Map(courses.map((course) => [course.id, course.name]));
  return courses
    .map((course) => {
      const rows = lessons
        .filter((row) => row.course_id === course.id)
        .map((row) => {
          const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
          return {
            storyId: row.story_id,
            slug: story?.slug ?? "",
            position: row.position,
            kind: story?.kind ?? null,
          };
        })
        .filter((row) => row.slug);
      const next = nextIncompleteLesson(
        rows,
        [...completed].map((storyId) => ({ storyId, status: "completed" }))
      );
      const done = rows.filter((row) => completed.has(row.storyId)).length;
      const total = courseLessonTotal(
        rows.length,
        rows.some((row) => row.kind === "audio_course")
      );
      const copy = selfPacedCardCopy(done, total);
      return {
        courseId: course.id,
        name: nameById.get(course.id) ?? course.name,
        completed: done,
        total,
        nextHref: copy.showContinue && next ? `/lesson/${next.slug}` : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

type MembershipLesson = {
  course_id: string;
  story_id: string;
  position: number;
};

type MembershipCourse = {
  id: string;
  level: string;
  format: string;
  is_published: boolean;
  archived: boolean;
};

export async function loadSelfPacedLessonGate(input: {
  userId: string;
  storyId: string;
  isTeacher: boolean;
  sessionOk: boolean;
}): Promise<SelfPacedLessonDecision> {
  if (input.sessionOk || input.isTeacher) return "allow";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_lessons")
    .select(
      "course_id, position, courses!inner(id, level, format, is_published, archived)"
    )
    .eq("story_id", input.storyId);

  if (error) {
    console.error("loadSelfPacedLessonGate:", error.message);
    return "skip";
  }

  type Hit = {
    course_id: string;
    position: number;
    courses: MembershipCourse | MembershipCourse[] | null;
  };

  const hits = ((data ?? []) as Hit[])
    .map((row) => {
      const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
      if (!course || course.format !== "self_paced" || course.archived) return null;
      return {
        courseId: row.course_id,
        level: course.level,
        position: row.position,
        published: course.is_published,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (hits.length === 0) return "skip";
  if (!hits.some((row) => row.published)) return "denied";

  const courseIds = [...new Set(hits.map((row) => row.courseId))];
  const { data: lessonRows, error: lessonError } = await admin
    .from("course_lessons")
    .select("course_id, story_id, position")
    .in("course_id", courseIds);

  if (lessonError) {
    console.error("loadSelfPacedLessonGate lessons:", lessonError.message);
    return "skip";
  }

  const allLessons = (lessonRows ?? []) as MembershipLesson[];
  const priorIds = new Set<string>();
  const memberships: GateMembership[] = hits.map((hit) => {
    const priorStoryIds = allLessons
      .filter(
        (row) => row.course_id === hit.courseId && row.position < hit.position
      )
      .map((row) => row.story_id);
    for (const storyId of priorStoryIds) priorIds.add(storyId);
    return { ...hit, priorStoryIds };
  });

  const completedStoryIds = new Set<string>();
  if (priorIds.size > 0) {
    const { data: progress, error: progressError } = await admin
      .from("user_progress")
      .select("story_id, status")
      .eq("user_id", input.userId)
      .in("story_id", [...priorIds]);
    if (progressError) {
      console.error("loadSelfPacedLessonGate progress:", progressError.message);
      return "skip";
    }
    for (const row of progress ?? []) {
      if (row.status === "completed") completedStoryIds.add(row.story_id as string);
    }
  }

  let grants;
  try {
    grants = await getOwnedGrants(input.userId);
  } catch (error) {
    console.error(
      "loadSelfPacedLessonGate grants:",
      error instanceof Error ? error.message : error
    );
    return "skip";
  }
  return decideSelfPacedLesson({
    isTeacher: false,
    sessionOk: false,
    memberships,
    grants,
    completedStoryIds,
  });
}

export function storyLevelRank(level: string): number | null {
  if (level === "beginner") return 0;
  if (level === "pre-intermediate") return 1;
  if (level === "intermediate") return 2;
  return null;
}

export function storyLevelFitsCourse(
  storyLevel: string,
  courseLevel: CourseLevel | string
): boolean {
  const story = storyLevelRank(storyLevel);
  const course = storyLevelRank(courseLevel);
  if (story == null || course == null) return false;
  return story <= course;
}
