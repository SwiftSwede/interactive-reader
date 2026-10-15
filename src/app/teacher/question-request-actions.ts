"use server";

import { z } from "zod";
import { requireTeacher } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import {
  listSessionQuestionRequests,
  listStudentQuestionRequests,
  markQuestionRequestAddressed,
  type QuestionRequest,
} from "@/lib/question-requests";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TeacherQuestionResult =
  | { ok: true; requests: QuestionRequest[] }
  | { ok: false; error: string };

type CourseJoin = { teacher_id: string } | { teacher_id: string }[] | null;

function teacherIdOf(courses: CourseJoin): string | undefined {
  if (!courses) return undefined;
  return Array.isArray(courses) ? courses[0]?.teacher_id : courses.teacher_id;
}

const uuidSchema = z.string().uuid();

async function ownedSession(sessionId: string) {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("course_sessions")
    .select("id, course_id, courses!inner(teacher_id)")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !session) {
    return { ok: false as const, error: "No encontré esa clase." };
  }
  if (teacherIdOf(session.courses as CourseJoin) !== teacher.id) {
    return { ok: false as const, error: "Esa clase no es tuya." };
  }
  return {
    ok: true as const,
    courseId: session.course_id as string,
    admin: createAdminClient(),
  };
}

async function ownedStudent(courseId: string, studentId: string) {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();
  if (error || !course) {
    return { ok: false as const, error: "Ese curso no es tuyo." };
  }
  const { data: enrollment, error: enrollError } = await supabase
    .from("course_enrollments")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (enrollError || !enrollment) {
    return { ok: false as const, error: "Ese estudiante no está en este grupo." };
  }
  return { ok: true as const, admin: createAdminClient() };
}

export async function loadSessionQuestionRequests(input: {
  sessionId: string;
}): Promise<TeacherQuestionResult> {
  const parsed = z.object({ sessionId: uuidSchema }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No encontré esa clase." };
  }
  const owned = await ownedSession(parsed.data.sessionId);
  if (!owned.ok) return owned;
  try {
    const requests = await listSessionQuestionRequests(
      owned.admin,
      parsed.data.sessionId,
      owned.courseId
    );
    return { ok: true, requests };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    console.error("loadSessionQuestionRequests failed:", error);
    return { ok: false, error: "No pude cargar las preguntas." };
  }
}

export async function loadStudentQuestionRequests(input: {
  courseId: string;
  studentId: string;
}): Promise<TeacherQuestionResult> {
  const parsed = z
    .object({ courseId: uuidSchema, studentId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No encontré a ese estudiante." };
  }
  const owned = await ownedStudent(parsed.data.courseId, parsed.data.studentId);
  if (!owned.ok) return owned;
  try {
    const requests = await listStudentQuestionRequests(
      owned.admin,
      parsed.data.studentId
    );
    return { ok: true, requests };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    console.error("loadStudentQuestionRequests failed:", error);
    return { ok: false, error: "No pude cargar las preguntas." };
  }
}

export async function markQuestionTaught(input: {
  sessionId: string;
  requestId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z
    .object({ sessionId: uuidSchema, requestId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No encontré esa pregunta." };
  }
  const owned = await ownedSession(parsed.data.sessionId);
  if (!owned.ok) return owned;

  const { data: row, error } = await owned.admin
    .from("question_requests")
    .select("id, course_session_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  if (error || !row || row.course_session_id !== parsed.data.sessionId) {
    return { ok: false, error: "No encontré esa pregunta." };
  }

  try {
    await markQuestionRequestAddressed(owned.admin, parsed.data.requestId);
  } catch (caught) {
    if (caught instanceof AppError) {
      return { ok: false, error: caught.message };
    }
    console.error("markQuestionTaught failed:", caught);
    return { ok: false, error: "No pude marcarla. Inténtalo de nuevo." };
  }
  return { ok: true };
}
