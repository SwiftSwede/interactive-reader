"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPresentationPrompt } from "@/lib/catalog-crud";
import { isSessionType, type SessionType } from "@/lib/activities";
import type { CourseLevel } from "@/types";

export type FlexActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const FLEX_RESOLVED: SessionType[] = [
  "video_summary",
  "presentation",
  "movie_talk",
];

async function sessionHasStudentWork(
  sessionId: string,
  sessionType: string
): Promise<boolean> {
  const admin = createAdminClient();
  if (sessionType === "video_summary") {
    const { count } = await admin
      .from("video_summary_free_writes")
      .select("id", { count: "exact", head: true })
      .eq("course_session_id", sessionId);
    return (count ?? 0) > 0;
  }
  if (sessionType === "presentation") {
    const { count } = await admin
      .from("presentation_responses")
      .select("id", { count: "exact", head: true })
      .eq("course_session_id", sessionId);
    return (count ?? 0) > 0;
  }
  if (sessionType === "movie_talk") {
    const { count } = await admin
      .from("comprehension_responses")
      .select("id", { count: "exact", head: true })
      .eq("course_session_id", sessionId);
    return (count ?? 0) > 0;
  }
  return false;
}

export async function sessionCanReopenFlex(
  sessionId: string,
  sessionType: string
): Promise<boolean> {
  if (sessionType === "flex") return false;
  if (!FLEX_RESOLVED.includes(sessionType as SessionType)) return false;
  const busy = await sessionHasStudentWork(sessionId, sessionType);
  return !busy;
}

export async function resolveFlexSession(
  _prev: FlexActionResult | null,
  formData: FormData
): Promise<FlexActionResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const resolvedTypeRaw = String(formData.get("resolvedType") ?? "").trim();
  const resolvedType = isSessionType(resolvedTypeRaw) ? resolvedTypeRaw : null;
  const newTitle = String(formData.get("newTitle") ?? "").trim();
  const newTheme = String(formData.get("newTheme") ?? "").trim() || null;
  let contentId = String(formData.get("contentId") ?? "").trim();

  if (!courseId || !sessionId || !resolvedType) {
    return { ok: false, error: "Elige el tipo de clase." };
  }
  if (!FLEX_RESOLVED.includes(resolvedType)) {
    return { ok: false, error: "Ese tipo no cabe en este hueco." };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, level")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();
  if (!course) return { ok: false, error: "Ese curso no es tuyo." };

  const level = course.level as CourseLevel;
  if (level === "pre-intermediate" && resolvedType !== "video_summary") {
    return { ok: false, error: "En pre-intermedio este hueco es Traducción." };
  }
  if (level === "intermediate" && resolvedType === "video_summary") {
    return { ok: false, error: "En intermedio elige Presentación o Movie Talk." };
  }

  const { data: session } = await supabase
    .from("course_sessions")
    .select("id, session_type")
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!session) return { ok: false, error: "No encontré esa clase." };

  const currentType = String(session.session_type);
  if (currentType !== "flex" && !FLEX_RESOLVED.includes(currentType as SessionType)) {
    return { ok: false, error: "Esa clase no se puede cambiar." };
  }
  if (currentType !== "flex") {
    const busy = await sessionHasStudentWork(sessionId, currentType);
    if (busy) {
      return {
        ok: false,
        error: "Ya hay respuestas de estudiantes. Ya no se puede cambiar.",
      };
    }
  }

  if (resolvedType === "presentation" && !contentId && newTitle) {
    const created = await createPresentationPrompt(createAdminClient(), {
      title: newTitle,
      theme: newTheme,
      createdBy: teacher.id,
    });
    if (!created.ok) return created;
    contentId = created.value.id;
  }

  if (!contentId) {
    return { ok: false, error: "Elige el contenido." };
  }

  let storyId: string | null = null;
  let presentationPromptId: string | null = null;

  if (resolvedType === "presentation") {
    const { data: prompt } = await supabase
      .from("presentation_prompts")
      .select("id, level")
      .eq("id", contentId)
      .maybeSingle();
    if (!prompt || prompt.level !== "intermediate") {
      return { ok: false, error: "No encontré esa presentación." };
    }
    presentationPromptId = prompt.id;
  } else {
    const { data: story } = await supabase
      .from("stories")
      .select("id, kind, level")
      .eq("id", contentId)
      .maybeSingle();
    if (!story) return { ok: false, error: "No encontré ese contenido." };
    if (story.level !== level) {
      return { ok: false, error: "Ese contenido no es del mismo nivel." };
    }
    if (story.kind !== resolvedType) {
      return { ok: false, error: "Ese contenido no es de ese tipo." };
    }
    storyId = story.id;
  }

  const { error } = await supabase
    .from("course_sessions")
    .update({
      session_type: resolvedType,
      story_id: storyId,
      writing_prompt_id: null,
      exam_prompt_id: null,
      presentation_prompt_id: presentationPromptId,
      conversation_prompt_id: null,
    })
    .eq("id", sessionId)
    .eq("course_id", courseId);

  if (error) {
    console.error("resolveFlexSession failed:", error);
    return { ok: false, error: "No pude guardar. Inténtalo de nuevo." };
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  revalidatePath("/teacher");
  revalidatePath("/dashboard");
  revalidatePath("/lessons");
  return { ok: true, message: "Listo. Ya tiene tipo y contenido." };
}
