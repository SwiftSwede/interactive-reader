"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import {
  enrollMatchingStudentsInCourse,
  moveStudentToClassroomLevel,
  otherCourseLevel,
  removeClassroomStudent as removeClassroomStudentRecord,
} from "@/lib/classroom-placement";
import { z } from "zod";
import type { CourseLevel } from "@/types";
import {
  parseCourseZoomUrl,
  ZOOM_URL_INVALID_MESSAGE,
  ZOOM_URL_MAX_LENGTH,
} from "@/lib/zoom-url";
import {
  generateMonth,
  type GenerateOccurrence,
} from "@/lib/teacher/generate-month";

export type CreateCourseResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const LEVELS: CourseLevel[] = ["pre-intermediate", "intermediate"];

const zoomUrlFormSchema = z.object({
  courseId: z.string().uuid(),
  zoomUrl: z.string().max(ZOOM_URL_MAX_LENGTH),
});

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
  revalidatePath("/teacher/groups");
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

export type GenerateMonthActionResult = { ok: false; error: string };

const occurrenceSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startIso: z.string().min(1),
});

export async function generateMonthAction(
  _prev: GenerateMonthActionResult | null,
  formData: FormData
): Promise<GenerateMonthActionResult | null> {
  const teacher = await requireTeacher("/teacher");
  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim() as CourseLevel;
  const yearMonth = String(formData.get("yearMonth") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim() || null;
  let occurrences: GenerateOccurrence[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("occurrences") ?? "[]"));
    const rows = z.array(occurrenceSchema).safeParse(parsed);
    if (!rows.success) {
      return { ok: false, error: "Revisa los días y la hora." };
    }
    occurrences = rows.data;
  } catch {
    return { ok: false, error: "Revisa los días y la hora." };
  }

  const supabase = await createClient();
  const result = await generateMonth(supabase, {
    teacherId: teacher.id,
    name,
    level,
    theme,
    yearMonth,
    occurrences,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/teacher");
  revalidatePath("/teacher/groups");
  revalidatePath(`/teacher/classes/${result.courseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/lessons");
  redirect(`/teacher/classes/${result.courseId}`);
}

export type UpdateCourseThemeResult =
  | { ok: true; theme: string | null; message: string }
  | { ok: false; error: string };

export async function updateCourseTheme(
  _prev: UpdateCourseThemeResult | null,
  formData: FormData
): Promise<UpdateCourseThemeResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim() || null;
  if (!courseId) {
    return { ok: false, error: "No encontré ese grupo." };
  }
  if (theme && theme.length > 80) {
    return { ok: false, error: "El tema se pasó de 80 letras." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ theme })
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCourseTheme failed:", error);
    return { ok: false, error: "No pude guardar el tema. Inténtalo de nuevo." };
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/groups");
  revalidatePath(`/teacher/classes/${courseId}`);
  revalidatePath("/lessons");
  return {
    ok: true,
    theme,
    message: theme ? "Tema guardado." : "Quité el tema.",
  };
}

export type DeleteCourseResult = { ok: false; error: string };

export async function deleteCourse(
  formData: FormData
): Promise<DeleteCourseResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();

  if (!courseId) {
    return { ok: false, error: "No encontré ese grupo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("deleteCourse failed:", error);
    return {
      ok: false,
      error: "No pude borrar ese grupo. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/teacher", "layout");
  redirect("/teacher");
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

export type UpdateZoomUrlResult =
  | { ok: true; message: string; zoomUrl: string | null }
  | { ok: false; error: string };

export async function updateCourseZoomUrl(
  _prev: UpdateZoomUrlResult | null,
  formData: FormData
): Promise<UpdateZoomUrlResult> {
  const teacher = await requireTeacher("/teacher");
  const parsed = zoomUrlFormSchema.safeParse({
    courseId: String(formData.get("courseId") ?? ""),
    zoomUrl: String(formData.get("zoomUrl") ?? ""),
  });

  if (!parsed.success) {
    const courseIssue = parsed.error.issues.some(
      (issue) => issue.path[0] === "courseId"
    );
    return {
      ok: false,
      error: courseIssue
        ? "No encontré ese grupo."
        : ZOOM_URL_INVALID_MESSAGE,
    };
  }

  const zoom = parseCourseZoomUrl(parsed.data.zoomUrl);
  if (!zoom.ok) {
    return { ok: false, error: zoom.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ zoom_url: zoom.value })
    .eq("id", parsed.data.courseId)
    .eq("teacher_id", teacher.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCourseZoomUrl failed:", error);
    return {
      ok: false,
      error: "No pude guardar el link. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/teacher", "layout");
  revalidatePath(`/teacher/classes/${parsed.data.courseId}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    zoomUrl: zoom.value,
    message:
      zoom.value == null
        ? "Listo. Quité el link de Zoom."
        : "Listo. El link de Zoom ya está.",
  };
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
  revalidatePath("/teacher");
  return { ok: true };
}
