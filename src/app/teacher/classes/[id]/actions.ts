"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { CourseLevel } from "@/types";

export type CreateSessionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const SESSION_MINUTES = 90;

export async function createSession(
  _prev: CreateSessionResult | null,
  formData: FormData
): Promise<CreateSessionResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const storyId = String(formData.get("storyId") ?? "").trim();
  const startIso = String(formData.get("startIso") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!courseId || !storyId) {
    return { ok: false, error: "Elige una historia." };
  }

  const start = new Date(startIso);
  if (!startIso || Number.isNaN(start.getTime())) {
    return { ok: false, error: "Pon la hora de inicio de la clase." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, teacher_id, level")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data: story } = await supabase
    .from("stories")
    .select("id, title, level")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false, error: "No encontré esa historia." };
  }

  if (story.level !== (course.level as CourseLevel)) {
    return {
      ok: false,
      error: "Esa historia no es del mismo nivel que el curso.",
    };
  }

  const localDate = String(formData.get("sessionDate") ?? "").trim();
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    ? localDate
    : start.toISOString().slice(0, 10);

  const end = new Date(start.getTime() + SESSION_MINUTES * 60 * 1000);

  const { error } = await supabase.from("course_sessions").insert({
    course_id: courseId,
    story_id: storyId,
    session_date: sessionDate,
    session_start_time: start.toISOString(),
    session_end_time: end.toISOString(),
    notes,
  });

  if (error) {
    console.error("createSession failed:", error);
    return {
      ok: false,
      error: "No pude crear la clase. Inténtalo de nuevo.",
    };
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  return { ok: true, message: `Listo. ${story.title} ya tiene clase.` };
}

export type DeleteSessionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteSession(
  formData: FormData
): Promise<DeleteSessionResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!courseId || !sessionId) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data, error } = await supabase
    .from("course_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("deleteSession failed:", error);
    return {
      ok: false,
      error: "No pude quitar esa clase. Inténtalo de nuevo.",
    };
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  return { ok: true };
}
