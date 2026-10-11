"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import {
  addCourseLesson,
  createSelfPacedCourse,
  isSelfPacedLevel,
  moveCourseLesson,
  removeCourseLesson,
  setSelfPacedPublished,
} from "@/lib/self-paced-admin";

export type CourseActionResult = { ok: false; error: string };

function messageFrom(error: unknown): string {
  if (error instanceof AppError && error.statusCode < 500) return error.message;
  console.error("self-paced course action:", error);
  return "Algo salió mal. Intenta de nuevo.";
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  level: z.enum(["beginner", "pre-intermediate", "intermediate"]),
  description: z.string().trim().max(2000).optional().default(""),
});

export async function createSelfPacedCourseAction(
  _prev: CourseActionResult | null,
  formData: FormData
): Promise<CourseActionResult> {
  const teacher = await requireTeacher("/teacher/content/courses/new");
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success || !isSelfPacedLevel(parsed.data.level)) {
    return { ok: false, error: "Revisa el nombre y el nivel." };
  }

  let id = "";
  try {
    id = await createSelfPacedCourse({
      teacherId: teacher.id,
      name: parsed.data.name,
      level: parsed.data.level,
      description: parsed.data.description,
      isPublished: formData.get("isPublished") === "on",
    });
  } catch (error) {
    return { ok: false, error: messageFrom(error) };
  }

  revalidatePath("/teacher/content/courses");
  redirect(`/teacher/content/courses/${id}`);
}

export async function setSelfPacedPublishedAction(
  formData: FormData
): Promise<void> {
  const teacher = await requireTeacher("/teacher/content/courses");
  const courseId = String(formData.get("courseId") ?? "");
  if (!z.string().uuid().safeParse(courseId).success) return;
  try {
    await setSelfPacedPublished({
      teacherId: teacher.id,
      courseId,
      isPublished: formData.get("isPublished") === "on",
    });
  } catch (error) {
    console.error("setSelfPacedPublished:", error);
  }
  revalidatePath(`/teacher/content/courses/${courseId}`);
}

export async function addCourseLessonAction(formData: FormData): Promise<void> {
  const teacher = await requireTeacher("/teacher/content/courses");
  const courseId = String(formData.get("courseId") ?? "");
  const storyId = String(formData.get("storyId") ?? "");
  if (
    !z.string().uuid().safeParse(courseId).success ||
    !z.string().uuid().safeParse(storyId).success
  ) {
    return;
  }
  try {
    await addCourseLesson({ teacherId: teacher.id, courseId, storyId });
  } catch (error) {
    console.error("addCourseLesson:", error);
  }
  revalidatePath(`/teacher/content/courses/${courseId}`);
}

export async function removeCourseLessonAction(
  formData: FormData
): Promise<void> {
  const teacher = await requireTeacher("/teacher/content/courses");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (
    !z.string().uuid().safeParse(courseId).success ||
    !z.string().uuid().safeParse(lessonId).success
  ) {
    return;
  }
  try {
    await removeCourseLesson({ teacherId: teacher.id, courseId, lessonId });
  } catch (error) {
    console.error("removeCourseLesson:", error);
  }
  revalidatePath(`/teacher/content/courses/${courseId}`);
}

export async function moveCourseLessonAction(formData: FormData): Promise<void> {
  const teacher = await requireTeacher("/teacher/content/courses");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (
    !z.string().uuid().safeParse(courseId).success ||
    !z.string().uuid().safeParse(lessonId).success
  ) {
    return;
  }
  try {
    await moveCourseLesson({
      teacherId: teacher.id,
      courseId,
      lessonId,
      direction,
    });
  } catch (error) {
    console.error("moveCourseLesson:", error);
  }
  revalidatePath(`/teacher/content/courses/${courseId}`);
}
