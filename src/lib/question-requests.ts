import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

export const QUESTION_SURFACES = [
  "inicio",
  "lecciones",
  "herramientas",
  "practica",
  "sonidos",
  "perfil",
  "leccion",
  "presentacion",
  "conversacion",
] as const;

export type QuestionSurface = (typeof QUESTION_SURFACES)[number];

export const QUESTION_SURFACE_LABELS: Record<QuestionSurface, string> = {
  inicio: "Inicio",
  lecciones: "Lecciones",
  herramientas: "Herramientas",
  practica: "Práctica",
  sonidos: "Guía de sonidos",
  perfil: "Perfil",
  leccion: "Lección",
  presentacion: "Presentación",
  conversacion: "Conversación",
};

export const QUESTION_BODY_MAX = 500;
export const QUESTION_STUDENT_LIMIT = 10;

export type QuestionRequest = {
  id: string;
  studentId: string;
  storyId: string | null;
  courseSessionId: string | null;
  surface: QuestionSurface;
  body: string;
  createdAt: string;
  addressedAt: string | null;
  storyTitle: string | null;
  studentName: string;
};

type QuestionRequestRow = {
  id: string;
  student_id: string;
  story_id: string | null;
  course_session_id: string | null;
  surface: string;
  body: string;
  created_at: string;
  addressed_at: string | null;
};

export function isQuestionSurface(value: string): value is QuestionSurface {
  return (QUESTION_SURFACES as readonly string[]).includes(value);
}

export function trimQuestionBody(raw: string): string {
  return raw.trim();
}

export function isValidQuestionBody(body: string): boolean {
  return body.length >= 1 && body.length <= QUESTION_BODY_MAX;
}

export function unaddressedCount(
  rows: Array<{ addressedAt: string | null }>
): number {
  return rows.filter((row) => row.addressedAt == null).length;
}

export function oldestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function newestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mapRow(
  row: QuestionRequestRow,
  extras: { storyTitle?: string | null; studentName?: string } = {}
): QuestionRequest {
  if (!isQuestionSurface(row.surface)) {
    throw new AppError("Unknown question surface", "VALIDATION_ERROR", 422);
  }
  return {
    id: row.id,
    studentId: row.student_id,
    storyId: row.story_id,
    courseSessionId: row.course_session_id,
    surface: row.surface,
    body: row.body,
    createdAt: row.created_at,
    addressedAt: row.addressed_at,
    storyTitle: extras.storyTitle ?? null,
    studentName: extras.studentName ?? "Sin nombre",
  };
}

const REQUEST_COLUMNS =
  "id, student_id, story_id, course_session_id, surface, body, created_at, addressed_at";

export async function assertStudentMayUseSession(
  supabase: SupabaseClient,
  studentId: string,
  sessionId: string
): Promise<boolean> {
  const { data: session, error } = await supabase
    .from("course_sessions")
    .select("id, course_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    console.error("assertStudentMayUseSession session failed:", error.message);
    return false;
  }
  if (!session) return false;

  const { data: enrollment, error: enrollError } = await supabase
    .from("course_enrollments")
    .select("student_id")
    .eq("course_id", session.course_id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (enrollError) {
    console.error(
      "assertStudentMayUseSession enrollment failed:",
      enrollError.message
    );
    return false;
  }
  return Boolean(enrollment);
}

export async function assertStoryExists(
  supabase: SupabaseClient,
  storyId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .maybeSingle();
  if (error) {
    console.error("assertStoryExists failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function insertQuestionRequest(
  supabase: SupabaseClient,
  input: {
    studentId: string;
    surface: QuestionSurface;
    body: string;
    storyId: string | null;
    courseSessionId: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("question_requests").insert({
    student_id: input.studentId,
    surface: input.surface,
    body: input.body,
    story_id: input.storyId,
    course_session_id: input.courseSessionId,
  });
  if (error) {
    console.error("insertQuestionRequest failed:", error.message);
    throw new AppError("No pude enviar eso. Inténtalo de nuevo.", "INSERT_FAILED", 500);
  }
}

async function storyTitlesFor(
  supabase: SupabaseClient,
  storyIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(storyIds.filter(Boolean))];
  const titles = new Map<string, string>();
  if (unique.length === 0) return titles;
  const { data, error } = await supabase
    .from("stories")
    .select("id, title")
    .in("id", unique);
  if (error) {
    console.error("storyTitlesFor failed:", error.message);
    return titles;
  }
  for (const row of (data ?? []) as { id: string; title: string }[]) {
    titles.set(row.id, row.title);
  }
  return titles;
}

async function displayNamesFor(
  supabase: SupabaseClient,
  studentIds: string[],
  courseId?: string
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(studentIds)];
  if (unique.length === 0) return names;

  if (courseId) {
    const { data, error } = await supabase
      .from("course_enrollments")
      .select("student_id, display_name")
      .eq("course_id", courseId)
      .in("student_id", unique);
    if (error) {
      console.error("displayNamesFor enrollments failed:", error.message);
    } else {
      for (const row of (data ?? []) as {
        student_id: string;
        display_name: string;
      }[]) {
        names.set(row.student_id, row.display_name.trim() || "Sin nombre");
      }
    }
  }

  const missing = unique.filter((id) => !names.has(id));
  if (missing.length === 0) return names;

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", missing);
  if (profileError) {
    console.error("displayNamesFor profiles failed:", profileError.message);
    return names;
  }
  for (const row of (profiles ?? []) as { id: string; email: string | null }[]) {
    names.set(row.id, row.email?.trim() || "Sin nombre");
  }
  return names;
}

export async function listSessionQuestionRequests(
  supabase: SupabaseClient,
  sessionId: string,
  courseId: string
): Promise<QuestionRequest[]> {
  const { data, error } = await supabase
    .from("question_requests")
    .select(REQUEST_COLUMNS)
    .eq("course_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listSessionQuestionRequests failed:", error.message);
    throw new AppError("No pude cargar las preguntas.", "LOAD_FAILED", 500);
  }
  const rows = (data ?? []) as QuestionRequestRow[];
  const titles = await storyTitlesFor(
    supabase,
    rows.map((row) => row.story_id ?? "")
  );
  const names = await displayNamesFor(
    supabase,
    rows.map((row) => row.student_id),
    courseId
  );
  return rows.map((row) =>
    mapRow(row, {
      storyTitle: row.story_id ? titles.get(row.story_id) ?? null : null,
      studentName: names.get(row.student_id) ?? "Sin nombre",
    })
  );
}

export async function listStudentQuestionRequests(
  supabase: SupabaseClient,
  studentId: string,
  limit = QUESTION_STUDENT_LIMIT
): Promise<QuestionRequest[]> {
  const { data, error } = await supabase
    .from("question_requests")
    .select(REQUEST_COLUMNS)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listStudentQuestionRequests failed:", error.message);
    throw new AppError("No pude cargar las preguntas.", "LOAD_FAILED", 500);
  }
  const rows = (data ?? []) as QuestionRequestRow[];
  const titles = await storyTitlesFor(
    supabase,
    rows.map((row) => row.story_id ?? "")
  );
  return rows.map((row) =>
    mapRow(row, {
      storyTitle: row.story_id ? titles.get(row.story_id) ?? null : null,
    })
  );
}

export async function markQuestionRequestAddressed(
  supabase: SupabaseClient,
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from("question_requests")
    .update({ addressed_at: new Date().toISOString() })
    .eq("id", requestId)
    .is("addressed_at", null);
  if (error) {
    console.error("markQuestionRequestAddressed failed:", error.message);
    throw new AppError("No pude marcarla. Inténtalo de nuevo.", "UPDATE_FAILED", 500);
  }
}
