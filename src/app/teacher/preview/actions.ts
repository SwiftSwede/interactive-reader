"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import {
  STUDENT_PREVIEW_COOKIE,
  parseStudentPreviewLevel,
  studentPreviewCookieOptions,
} from "@/lib/student-preview";

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
