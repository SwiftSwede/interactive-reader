import { createClient } from "@/lib/supabase/server";

export type AttendanceMark = {
  studentId: string;
  displayName: string;
  attended: boolean;
  firstOpenedAt: string | null;
};

export async function setSessionAttendance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    courseId: string;
    sessionId: string;
    studentId: string;
    attended: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: session } = await supabase
    .from("course_sessions")
    .select("id")
    .eq("id", input.sessionId)
    .eq("course_id", input.courseId)
    .maybeSingle();

  if (!session) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("student_id")
    .eq("course_id", input.courseId)
    .eq("student_id", input.studentId)
    .maybeSingle();

  if (!enrollment) {
    return { ok: false, error: "Ese estudiante no está en este grupo." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("session_attendance")
    .select("id, first_opened_at")
    .eq("course_session_id", input.sessionId)
    .eq("student_id", input.studentId)
    .maybeSingle();

  if (existingError) {
    console.error("setSessionAttendance lookup failed:", existingError);
    return { ok: false, error: "No pude guardar la asistencia. Inténtalo de nuevo." };
  }

  if (existing) {
    const { error } = await supabase
      .from("session_attendance")
      .update({ attended: input.attended })
      .eq("id", existing.id);
    if (error) {
      console.error("setSessionAttendance update failed:", error);
      return { ok: false, error: "No pude guardar la asistencia. Inténtalo de nuevo." };
    }
    return { ok: true };
  }

  const { error } = await supabase.from("session_attendance").insert({
    course_session_id: input.sessionId,
    student_id: input.studentId,
    attended: input.attended,
    first_opened_at: null,
  });

  if (error) {
    console.error("setSessionAttendance insert failed:", error);
    return { ok: false, error: "No pude guardar la asistencia. Inténtalo de nuevo." };
  }
  return { ok: true };
}
