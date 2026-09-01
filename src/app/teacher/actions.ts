"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import {
  enrollMatchingStudentsInCourse,
  moveStudentToClassroomLevel,
  otherCourseLevel,
  removeClassroomStudent as removeClassroomStudentRecord,
} from "@/lib/classroom-placement";
import type { CourseLevel } from "@/types";

export type CreateCourseResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const LEVELS: CourseLevel[] = ["pre-intermediate", "intermediate"];

function courseLevelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

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
  const { data: created, error } = await supabase
    .from("courses")
    .insert({
      name,
      level,
      teacher_id: teacher.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("createCourse failed:", error);
    return {
      ok: false,
      error: "No pude crear el curso. Inténtalo de nuevo.",
    };
  }

  const enrolled = await enrollMatchingStudentsInCourse({
    courseId: created.id,
    level,
  });

  revalidatePath("/teacher");
  if (enrolled === 0) {
    return { ok: true, message: `Listo. ${name} ya está en tu lista.` };
  }
  if (enrolled === 1) {
    return {
      ok: true,
      message: `Listo. ${name} ya está en tu lista, con 1 estudiante.`,
    };
  }
  return {
    ok: true,
    message: `Listo. ${name} ya está en tu lista, con ${enrolled} estudiantes.`,
  };
}

export type MoveStudentResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function moveStudentToOtherGroup(
  formData: FormData
): Promise<MoveStudentResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();

  if (!courseId || !studentId) {
    return { ok: false, error: "No encontré a ese estudiante." };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, teacher_id, level, archived")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course || course.archived) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!enrollment) {
    return { ok: false, error: "Ese estudiante no está en este curso." };
  }

  const fromLevel = course.level as CourseLevel;
  const toLevel = otherCourseLevel(fromLevel);

  try {
    const { enrolledInLiveCourse } = await moveStudentToClassroomLevel({
      studentId,
      toLevel,
    });
    revalidatePath("/teacher", "layout");
    const label = courseLevelLabel(toLevel);
    if (!enrolledInLiveCourse) {
      return {
        ok: true,
        message: `Listo. Ahora es ${label}. Cuando crees ese curso, entra sola.`,
      };
    }
    return {
      ok: true,
      message: `Listo. Ahora es ${label}. Sigue pagando igual.`,
    };
  } catch (error) {
    console.error("moveStudentToOtherGroup failed:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("classroom_level")) {
      return {
        ok: false,
        error:
          "Falta una pieza en Supabase. Abre el SQL Editor y corre schema-classroom-level.sql.",
      };
    }
    return {
      ok: false,
      error: "No pude moverlo. Inténtalo de nuevo.",
    };
  }
}

export type RemoveStudentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function removeClassroomStudent(
  formData: FormData
): Promise<RemoveStudentResult> {
  await requireTeacher("/teacher");
  const studentId = String(formData.get("studentId") ?? "").trim();

  if (!studentId) {
    return { ok: false, error: "No encontré a ese estudiante." };
  }

  const result = await removeClassroomStudentRecord(studentId);
  if (!result.ok) {
    if (result.reason === "stripe") {
      return {
        ok: false,
        error:
          "Este paga en Stripe. Para sacarlo, páusalo en ThriveCart. Si lo quito aquí, el pago lo vuelve a meter.",
      };
    }
    if (result.reason === "not-found" || result.reason === "teacher") {
      return { ok: false, error: "No encontré a ese estudiante." };
    }
    return { ok: false, error: "No pude sacarlo. Inténtalo de nuevo." };
  }

  revalidatePath("/teacher", "layout");
  revalidatePath("/dashboard");
  return { ok: true };
}
