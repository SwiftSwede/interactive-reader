"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { CourseLevel } from "@/types";

export type CreateCourseResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const LEVELS: CourseLevel[] = ["pre-intermediate", "intermediate"];

export async function createCourse(
  _prev: CreateCourseResult | null,
  formData: FormData
): Promise<CreateCourseResult> {
  const teacher = await requireTeacher("/teacher");
  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim() as CourseLevel;

  if (!name) {
    return { ok: false, error: "Ponle un nombre al curso." };
  }

  if (!LEVELS.includes(level)) {
    return { ok: false, error: "Elige Pre-intermedio o Intermedio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    name,
    level,
    teacher_id: teacher.id,
  });

  if (error) {
    console.error("createCourse failed:", error);
    return {
      ok: false,
      error: "No pude crear el curso. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/teacher");
  return { ok: true, message: `Listo. ${name} ya está en tu lista.` };
}
