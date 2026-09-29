"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordTeacherObservation } from "@/lib/topic-evidence";

const observationSchema = z.object({
  tagType: z.enum(["grammar", "vocabulary", "phonetic", "error"]),
  tagName: z.string().trim().min(1).max(80),
  action: z.enum(["flag", "clear"]),
});

const inputSchema = z.object({
  studentId: z.string().uuid(),
  sessionId: z.string().uuid().nullish(),
  observations: z.array(observationSchema).max(40),
  note: z.string().max(1000).optional(),
});

type CourseJoin = { teacher_id: string } | { teacher_id: string }[] | null;

function teacherIdOf(courses: CourseJoin): string | undefined {
  if (!courses) return undefined;
  return Array.isArray(courses) ? courses[0]?.teacher_id : courses.teacher_id;
}

const SAVE_FAILED = "No pude guardar la observación. Inténtalo de nuevo.";

export async function saveTeacherObservation(input: {
  studentId: string;
  sessionId?: string | null;
  observations: Array<{
    tagType: "grammar" | "vocabulary" | "phonetic" | "error";
    tagName: string;
    action: "flag" | "clear";
  }>;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const teacher = await requireTeacher("/teacher");
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa la nota y las marcas." };
  }

  const { studentId, observations } = parsed.data;
  const sessionId = parsed.data.sessionId ?? null;
  const note = parsed.data.note?.trim() ?? "";

  if (observations.length === 0 && note.length === 0) {
    return { ok: false, error: "No hay nada que guardar." };
  }

  const supabase = await createClient();

  if (sessionId) {
    const { data: session, error: loadError } = await supabase
      .from("course_sessions")
      .select("id, course_id, courses!inner(teacher_id)")
      .eq("id", sessionId)
      .maybeSingle();

    if (loadError || !session) {
      return { ok: false, error: "No encontré esa clase." };
    }

    if (teacherIdOf(session.courses as CourseJoin) !== teacher.id) {
      return { ok: false, error: "Esa clase no es tuya." };
    }

    const { data: enrollment, error: enrollError } = await supabase
      .from("course_enrollments")
      .select("student_id")
      .eq("course_id", session.course_id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (enrollError || !enrollment) {
      return { ok: false, error: "Ese estudiante no está en esa clase." };
    }
  } else {
    const { data: rows, error: enrollError } = await supabase
      .from("course_enrollments")
      .select("course_id, courses!inner(teacher_id)")
      .eq("student_id", studentId);

    if (enrollError) {
      console.error(
        "saveTeacherObservation enrollment failed:",
        enrollError.message
      );
      return { ok: false, error: SAVE_FAILED };
    }

    const owned = (rows ?? []).some(
      (row) => teacherIdOf(row.courses as CourseJoin) === teacher.id
    );
    if (!owned) {
      return { ok: false, error: "Ese estudiante no está en tus clases." };
    }
  }

  const admin = createAdminClient();

  try {
    const result = await recordTeacherObservation(admin, {
      studentId,
      sessionId,
      observations,
      note,
    });

    const { error: eventError } = await admin.from("learning_events").insert({
      user_id: studentId,
      event_type: "teacher_observation",
      course_session_id: sessionId,
      detail: {
        flags: result.flags,
        clears: result.clears,
        note: result.note,
      },
    });

    if (eventError) {
      console.error("teacher_observation event failed:", eventError.message);
      return { ok: false, error: SAVE_FAILED };
    }
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    console.error("saveTeacherObservation failed:", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/teacher", "layout");
  return { ok: true };
}
