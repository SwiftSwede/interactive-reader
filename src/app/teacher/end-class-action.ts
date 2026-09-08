"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

export async function endClassSession(
  sessionId: string
): Promise<{ ok: true; endedAt: string } | { ok: false; error: string }> {
  const teacher = await requireTeacher("/teacher");
  const parsed = z.string().uuid().safeParse(sessionId);
  if (!parsed.success) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const supabase = await createClient();
  const { data: session, error: loadError } = await supabase
    .from("course_sessions")
    .select("id, course_id, class_ended_at, courses!inner(teacher_id)")
    .eq("id", parsed.data)
    .maybeSingle();

  if (loadError || !session) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const course = session.courses as { teacher_id: string } | { teacher_id: string }[];
  const teacherId = Array.isArray(course) ? course[0]?.teacher_id : course.teacher_id;
  if (teacherId !== teacher.id) {
    return { ok: false, error: "Esa clase no es tuya." };
  }

  if (session.class_ended_at) {
    return { ok: true, endedAt: String(session.class_ended_at) };
  }

  const endedAt = new Date().toISOString();
  const { error } = await supabase
    .from("course_sessions")
    .update({
      class_ended_at: endedAt,
      answers_revealed: true,
    })
    .eq("id", parsed.data)
    .is("class_ended_at", null);

  if (error) {
    console.error("endClassSession failed:", error);
    return { ok: false, error: "No pude terminar la clase. Inténtalo de nuevo." };
  }

  revalidatePath("/teacher", "layout");
  revalidatePath(`/teacher/classes/${session.course_id}`);
  return { ok: true, endedAt };
}
