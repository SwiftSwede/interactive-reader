"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import {
  STUDENT_PREVIEW_COOKIE,
  parseLessonPreviewNext,
  parseStudentPreviewLevel,
  studentPreviewCookieOptions,
} from "@/lib/student-preview";

function lessonPreviewNext(formData: FormData): string {
  return parseLessonPreviewNext(String(formData.get("next") ?? "")) ?? "/teacher";
}

export async function enterStudentPreview(formData: FormData): Promise<void> {
  await requireTeacher("/teacher/preview");
  const level = parseStudentPreviewLevel(String(formData.get("level") ?? ""));
  if (!level) {
    redirect("/teacher/preview");
  }

  const store = await cookies();
  store.set(STUDENT_PREVIEW_COOKIE, level, studentPreviewCookieOptions());
  redirect("/dashboard");
}

export async function exitStudentPreview(): Promise<void> {
  await requireTeacher("/teacher");
  const store = await cookies();
  store.set({
    name: STUDENT_PREVIEW_COOKIE,
    value: "",
    ...studentPreviewCookieOptions(),
    maxAge: 0,
  });
  redirect("/teacher");
}

export async function enterLessonStudentPreview(
  formData: FormData
): Promise<void> {
  await requireTeacher("/teacher");
  const next = lessonPreviewNext(formData);
  const level = parseStudentPreviewLevel(String(formData.get("level") ?? ""));
  if (!level) {
    redirect(next);
  }
  const store = await cookies();
  store.set(STUDENT_PREVIEW_COOKIE, level, studentPreviewCookieOptions());
  redirect(next);
}

export async function exitLessonStudentPreview(
  formData: FormData
): Promise<void> {
  await requireTeacher("/teacher");
  const next = lessonPreviewNext(formData);
  const store = await cookies();
  store.set({
    name: STUDENT_PREVIEW_COOKIE,
    value: "",
    ...studentPreviewCookieOptions(),
    maxAge: 0,
  });
  redirect(next);
}
