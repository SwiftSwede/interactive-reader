import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { CourseLevel, UserRole } from "@/types";
import {
  STUDENT_PREVIEW_COOKIE,
  parseStudentPreviewLevel,
} from "@/lib/student-preview";

/**
 * Cookie is consulted only when the authenticated role is teacher.
 * Students (including a forged cookie) get null.
 */
export async function readTeacherStudentPreview(
  role: UserRole | null | undefined
): Promise<CourseLevel | null> {
  if (role !== "teacher") return null;
  const store = await cookies();
  return parseStudentPreviewLevel(
    store.get(STUDENT_PREVIEW_COOKIE)?.value
  );
}

export async function loadCourseLevel(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseLevel | null> {
  const { data } = await supabase
    .from("courses")
    .select("level")
    .eq("id", courseId)
    .maybeSingle();
  return parseStudentPreviewLevel(
    typeof data?.level === "string" ? data.level : null
  );
}
