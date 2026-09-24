import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultExamTask2Type, defaultWritingMinutes } from "@/lib/activities";
import { defaultExamTaskCopy, examItemCounts, type ExamItemCounts } from "@/lib/exam";
import { parseConversationQuestions } from "@/lib/conversation";
import type { CourseLevel } from "@/types";

export type CatalogKind =
  | "story"
  | "writing"
  | "exam"
  | "presentation"
  | "conversation";

export type CatalogResult<T = { id: string }> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type CatalogDeletePreview = {
  title: string;
  sessionCount: number;
  studentUseCount: number;
  summary: string;
  studentWarning: string | null;
};

export type StoryDeleteCounts = {
  words: number;
  comprehension: number;
  personal: number;
  drills: number;
  flags: number;
  tags: number;
  scenes: number;
  paragraphs: number;
  expressions: number;
};

const SESSION_FK: Record<CatalogKind, string> = {
  story: "story_id",
  writing: "writing_prompt_id",
  exam: "exam_prompt_id",
  presentation: "presentation_prompt_id",
  conversation: "conversation_prompt_id",
};

const CONTENT_TAG_TYPE: Partial<Record<CatalogKind, string>> = {
  story: "story",
  writing: "writing_prompt",
  exam: "exam_prompt",
  presentation: "presentation_prompt",
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function fail(error: string): CatalogResult<never> {
  return { ok: false, error };
}

export function getCatalogAdminEmails(
  env: Record<string, string | undefined> = process.env
): string[] {
  return (env.CATALOG_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isCatalogAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!email) return false;
  return getCatalogAdminEmails(env).includes(email.trim().toLowerCase());
}

export function assignedSessionMessage(count: number): string {
  return `Está asignado a ${count} clase(s). Quítalo de esas clases primero.`;
}

export function formatStudentUseWarning(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) {
    return "1 estudiante ya practicó esto. Se borra también. Esta acción no se puede deshacer.";
  }
  return `${count} estudiantes ya practicaron esto. Se borra también. Esta acción no se puede deshacer.`;
}

export function joinSpanishList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, y ${parts[parts.length - 1]}`;
}

export function formatStoryDeleteSummary(counts: StoryDeleteCounts): string {
  const parts = ["el texto"];
  if (counts.words > 0) {
    parts.push(
      counts.words === 1
        ? "1 palabra anotada"
        : `${counts.words} palabras anotadas`
    );
  }
  if (counts.expressions > 0) {
    parts.push(
      counts.expressions === 1
        ? "1 expresión"
        : `${counts.expressions} expresiones`
    );
  }
  if (counts.comprehension > 0) {
    parts.push(
      counts.comprehension === 1
        ? "1 pregunta de comprensión"
        : `${counts.comprehension} preguntas de comprensión`
    );
  }
  if (counts.personal > 0) {
    parts.push(
      counts.personal === 1
        ? "1 pregunta personal"
        : `${counts.personal} preguntas personales`
    );
  }
  if (counts.drills > 0) parts.push("el dictado");
  if (counts.flags > 0) {
    parts.push(
      counts.flags === 1
        ? "1 bandera de palabras"
        : "las banderas de palabras"
    );
  }
  if (counts.scenes > 0) {
    parts.push(
      counts.scenes === 1 ? "1 escena" : `${counts.scenes} escenas`
    );
  }
  if (counts.paragraphs > 0) {
    parts.push(
      counts.paragraphs === 1
        ? "1 párrafo de traducción"
        : `${counts.paragraphs} párrafos de traducción`
    );
  }
  if (counts.tags > 0) parts.push("las etiquetas");
  return `Se borrarán: ${joinSpanishList(parts)}.`;
}

export function formatSimpleDeleteSummary(title: string): string {
  return `Se borrará "${title}". Esta acción no se puede deshacer.`;
}

export function isCopyableWriting(promptText: string): boolean {
  return promptText.trim().length > 0;
}

export function isCopyableExam(counts: ExamItemCounts): boolean {
  return (
    counts.vocab + counts.fillSlots + counts.task2 + counts.task3 > 0
  );
}

export function isCopyableConversation(questionCount: number): boolean {
  return questionCount >= 3;
}

export function catalogCreateDefaults(
  kind: "writing",
  level: CourseLevel
): { writingTimeMinutes: 10 | 20 };
export function catalogCreateDefaults(
  kind: "exam",
  level: CourseLevel
): {
  task2Type: ReturnType<typeof defaultExamTask2Type>;
  timeLimitMinutes: 45;
  presentationLevel: "intermediate";
};
export function catalogCreateDefaults(
  kind: "writing" | "exam",
  level: CourseLevel
) {
  if (kind === "writing") {
    return { writingTimeMinutes: defaultWritingMinutes(level) };
  }
  return {
    task2Type: defaultExamTask2Type(level),
    timeLimitMinutes: 45 as const,
    presentationLevel: "intermediate" as const,
  };
}

async function countEq(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) {
    console.error(`count ${table} failed:`, error);
    return 0;
  }
  return count ?? 0;
}

async function deleteEq(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<string | null> {
  const { error } = await supabase.from(table).delete().eq(column, value);
  if (error) {
    console.error(`delete ${table} failed:`, error);
    return "No pude borrar. Inténtalo de nuevo.";
  }
  return null;
}

async function deleteContentTags(
  supabase: SupabaseClient,
  kind: CatalogKind,
  id: string
): Promise<string | null> {
  const contentType = CONTENT_TAG_TYPE[kind];
  if (!contentType) return null;
  const { error } = await supabase
    .from("content_tags")
    .delete()
    .eq("content_type", contentType)
    .eq("content_id", id);
  if (error) {
    console.error("delete content_tags failed:", error);
    return "No pude borrar. Inténtalo de nuevo.";
  }
  return null;
}

export async function countAssignedSessions(
  supabase: SupabaseClient,
  kind: CatalogKind,
  id: string
): Promise<number> {
  return countEq(supabase, "course_sessions", SESSION_FK[kind], id);
}

async function loadTitle(
  supabase: SupabaseClient,
  kind: CatalogKind,
  id: string
): Promise<string | null> {
  const table =
    kind === "story"
      ? "stories"
      : kind === "writing"
        ? "writing_prompts"
        : kind === "exam"
          ? "exam_prompts"
          : kind === "presentation"
            ? "presentation_prompts"
            : "conversation_prompts";
  const { data, error } = await supabase
    .from(table)
    .select("title")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return typeof data.title === "string" ? data.title : "";
}

async function studentUseCount(
  supabase: SupabaseClient,
  kind: CatalogKind,
  id: string
): Promise<number> {
  if (kind === "story") return countEq(supabase, "user_progress", "story_id", id);
  if (kind === "writing") {
    return countEq(supabase, "writing_submissions", "writing_prompt_id", id);
  }
  if (kind === "exam") {
    return countEq(supabase, "group_exam_submissions", "exam_prompt_id", id);
  }
  if (kind === "presentation") {
    return countEq(
      supabase,
      "presentation_responses",
      "presentation_prompt_id",
      id
    );
  }
  return 0;
}

async function storyChildCounts(
  supabase: SupabaseClient,
  id: string
): Promise<StoryDeleteCounts> {
  const [
    words,
    comprehension,
    personal,
    drills,
    flags,
    tags,
    scenes,
    paragraphs,
    expressions,
  ] = await Promise.all([
    countEq(supabase, "words", "story_id", id),
    countEq(supabase, "comprehension_questions", "story_id", id),
    countEq(supabase, "personal_questions", "story_id", id),
    countEq(supabase, "pronunciation_drills", "story_id", id),
    countEq(supabase, "word_flags", "story_id", id),
    supabase
      .from("content_tags")
      .select("id", { count: "exact", head: true })
      .eq("content_type", "story")
      .eq("content_id", id)
      .then(({ count }) => count ?? 0),
    countEq(supabase, "movie_talk_scenes", "story_id", id),
    countEq(supabase, "video_summary_paragraphs", "story_id", id),
    countEq(supabase, "expressions", "story_id", id),
  ]);
  return {
    words,
    comprehension,
    personal,
    drills,
    flags,
    tags,
    scenes,
    paragraphs,
    expressions,
  };
}

export async function previewCatalogDelete(
  supabase: SupabaseClient,
  kind: CatalogKind,
  id: string
): Promise<CatalogResult<CatalogDeletePreview>> {
  if (!isUuid(id)) return fail("No encontré ese contenido.");
  const title = await loadTitle(supabase, kind, id);
  if (title == null) return fail("No encontré ese contenido.");

  const sessionCount = await countAssignedSessions(supabase, kind, id);
  if (sessionCount > 0) {
    return {
      ok: true,
      value: {
        title,
        sessionCount,
        studentUseCount: 0,
        summary: assignedSessionMessage(sessionCount),
        studentWarning: null,
      },
    };
  }

  const studentCount = await studentUseCount(supabase, kind, id);
  let summary = formatSimpleDeleteSummary(title);
  if (kind === "story") {
    summary = formatStoryDeleteSummary(await storyChildCounts(supabase, id));
  }

  return {
    ok: true,
    value: {
      title,
      sessionCount: 0,
      studentUseCount: studentCount,
      summary,
      studentWarning: formatStudentUseWarning(studentCount),
    },
  };
}

async function deleteStory(
  supabase: SupabaseClient,
  id: string
): Promise<string | null> {
  const steps = [
    () => deleteContentTags(supabase, "story", id),
    () => deleteEq(supabase, "word_flags", "story_id", id),
    () => deleteEq(supabase, "movie_talk_scenes", "story_id", id),
    () => deleteEq(supabase, "video_summary_paragraphs", "story_id", id),
    () => deleteEq(supabase, "comprehension_questions", "story_id", id),
    () => deleteEq(supabase, "personal_questions", "story_id", id),
    () => deleteEq(supabase, "pronunciation_drills", "story_id", id),
    () => deleteEq(supabase, "words", "story_id", id),
    () => deleteEq(supabase, "expressions", "story_id", id),
    () => deleteEq(supabase, "story_audio", "story_id", id),
    () => deleteEq(supabase, "stories", "id", id),
  ];
  for (const step of steps) {
    const error = await step();
    if (error) return error;
  }
  return null;
}

export async function deleteCatalogContent(
  supabase: SupabaseClient,
  kind: CatalogKind,
  id: string
): Promise<CatalogResult<{ id: string }>> {
  if (!isUuid(id)) return fail("No encontré ese contenido.");
  const title = await loadTitle(supabase, kind, id);
  if (title == null) return fail("No encontré ese contenido.");

  const sessionCount = await countAssignedSessions(supabase, kind, id);
  if (sessionCount > 0) {
    return fail(assignedSessionMessage(sessionCount));
  }

  let error: string | null = null;
  if (kind === "story") {
    error = await deleteStory(supabase, id);
  } else if (kind === "writing") {
    error =
      (await deleteEq(supabase, "writing_submissions", "writing_prompt_id", id)) ??
      (await deleteContentTags(supabase, "writing", id)) ??
      (await deleteEq(supabase, "writing_prompts", "id", id));
  } else if (kind === "exam") {
    error =
      (await deleteEq(
        supabase,
        "group_exam_submissions",
        "exam_prompt_id",
        id
      )) ??
      (await deleteContentTags(supabase, "exam", id)) ??
      (await deleteEq(supabase, "exam_prompts", "id", id));
  } else if (kind === "presentation") {
    error =
      (await deleteEq(
        supabase,
        "presentation_responses",
        "presentation_prompt_id",
        id
      )) ??
      (await deleteContentTags(supabase, "presentation", id)) ??
      (await deleteEq(supabase, "presentation_prompts", "id", id));
  } else {
    error = await deleteEq(supabase, "conversation_prompts", "id", id);
  }

  if (error) return fail(error);

  const { data } = await supabase
    .from(
      kind === "story"
        ? "stories"
        : kind === "writing"
          ? "writing_prompts"
          : kind === "exam"
            ? "exam_prompts"
            : kind === "presentation"
              ? "presentation_prompts"
              : "conversation_prompts"
    )
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (data) {
    return fail("No pude borrar. Inténtalo de nuevo.");
  }
  return { ok: true, value: { id } };
}

function validPromptLevel(level: string): level is CourseLevel {
  return level === "pre-intermediate" || level === "intermediate";
}

export async function createWritingPrompt(
  supabase: SupabaseClient,
  input: { title: string; level: string; createdBy: string }
): Promise<CatalogResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return fail("Ponle un título a la escritura.");
  if (title.length > 120) return fail("El título se pasó de 120 letras.");
  if (!validPromptLevel(input.level)) {
    return fail("Elige Pre-intermedio o Intermedio.");
  }
  const { data, error } = await supabase
    .from("writing_prompts")
    .insert({
      title,
      prompt_text: "",
      writing_time_minutes: defaultWritingMinutes(input.level),
      level: input.level,
      created_by: input.createdBy,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("createWritingPrompt failed:", error);
    return fail("No pude crear la escritura. Inténtalo de nuevo.");
  }
  return { ok: true, value: { id: data.id } };
}

export async function createExamPrompt(
  supabase: SupabaseClient,
  input: { title: string; level: string; createdBy: string }
): Promise<CatalogResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return fail("Ponle un título al examen.");
  if (!validPromptLevel(input.level)) {
    return fail("Elige Pre-intermedio o Intermedio.");
  }
  const task2Type = defaultExamTask2Type(input.level);
  const copy = defaultExamTaskCopy(task2Type);
  const { data, error } = await supabase
    .from("exam_prompts")
    .insert({
      title,
      level: input.level,
      theme: null,
      vocabulary_list: [],
      fill_in_translation: [],
      task2_type: task2Type,
      paragraph_restructuring:
        task2Type === "paragraph_restructuring" ? [] : null,
      sentence_correction: task2Type === "sentence_correction" ? [] : null,
      translation_sentences: [],
      time_limit_minutes: 45,
      task1_title: copy.task1Title,
      task1_instructions: copy.task1Instructions,
      task2_title: copy.task2Title,
      task2_instructions: copy.task2Instructions,
      task3_title: copy.task3Title,
      task3_instructions: copy.task3Instructions,
      created_by: input.createdBy,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("createExamPrompt failed:", error);
    return fail("No pude crear el examen. Inténtalo de nuevo.");
  }
  return { ok: true, value: { id: data.id } };
}

export async function createPresentationPrompt(
  supabase: SupabaseClient,
  input: { title: string; theme: string | null; createdBy: string }
): Promise<CatalogResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return fail("Ponle un título a la presentación.");
  const { data, error } = await supabase
    .from("presentation_prompts")
    .insert({
      title,
      level: "intermediate",
      theme: input.theme?.trim() || null,
      warmup_question: null,
      segments: [],
      created_by: input.createdBy,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("createPresentationPrompt failed:", error);
    return fail("No pude crear la presentación. Inténtalo de nuevo.");
  }
  return { ok: true, value: { id: data.id } };
}

export async function createConversationPrompt(
  supabase: SupabaseClient,
  input: {
    title: string;
    level: string;
    theme: string | null;
    createdBy: string;
  }
): Promise<CatalogResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return fail("Ponle un título a la conversación.");
  if (!validPromptLevel(input.level)) {
    return fail("Elige Pre-intermedio o Intermedio.");
  }
  const { data, error } = await supabase
    .from("conversation_prompts")
    .insert({
      title,
      level: input.level,
      theme: input.theme?.trim() || null,
      questions: [],
      created_by: input.createdBy,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("createConversationPrompt failed:", error);
    return fail("No pude crear la conversación. Inténtalo de nuevo.");
  }
  return { ok: true, value: { id: data.id } };
}

export async function attachWritingPrompt(
  supabase: SupabaseClient,
  sourceId: string,
  level: CourseLevel
): Promise<CatalogResult<{ id: string; title: string }>> {
  if (!isUuid(sourceId)) return fail("Elige una escritura.");
  const { data: source, error: loadError } = await supabase
    .from("writing_prompts")
    .select("id, title, prompt_text")
    .eq("id", sourceId)
    .eq("level", level)
    .maybeSingle();
  if (loadError || !source) {
    return fail("No encontré esa escritura.");
  }
  if (!isCopyableWriting(String(source.prompt_text ?? ""))) {
    return fail("Esa escritura todavía está vacía.");
  }
  return {
    ok: true,
    value: { id: source.id, title: String(source.title ?? "") },
  };
}

export async function attachExamPrompt(
  supabase: SupabaseClient,
  sourceId: string,
  level: CourseLevel
): Promise<CatalogResult<{ id: string; title: string }>> {
  if (!isUuid(sourceId)) return fail("Elige un examen.");
  const { data: source, error: loadError } = await supabase
    .from("exam_prompts")
    .select(
      "id, title, vocabulary_list, fill_in_translation, paragraph_restructuring, sentence_correction, translation_sentences"
    )
    .eq("id", sourceId)
    .eq("level", level)
    .maybeSingle();
  if (loadError || !source) {
    return fail("No encontré ese examen.");
  }
  const counts = examItemCounts({
    vocabularyList: source.vocabulary_list ?? [],
    fillInTranslation: source.fill_in_translation ?? [],
    paragraphRestructuring: source.paragraph_restructuring,
    sentenceCorrection: source.sentence_correction,
    translationSentences: source.translation_sentences ?? [],
  });
  if (!isCopyableExam(counts)) {
    return fail("Ese examen todavía está vacío.");
  }
  return {
    ok: true,
    value: { id: source.id, title: String(source.title ?? "") },
  };
}

export async function attachConversationPrompt(
  supabase: SupabaseClient,
  sourceId: string,
  level: CourseLevel
): Promise<CatalogResult<{ id: string; title: string }>> {
  if (!isUuid(sourceId)) return fail("Elige una conversación.");
  const { data: source, error: loadError } = await supabase
    .from("conversation_prompts")
    .select("id, title, questions")
    .eq("id", sourceId)
    .eq("level", level)
    .maybeSingle();
  if (loadError || !source) {
    return fail("No encontré esa conversación.");
  }
  const questions = parseConversationQuestions(source.questions);
  if (!isCopyableConversation(questions.length)) {
    return fail("Esa conversación todavía está vacía.");
  }
  return {
    ok: true,
    value: { id: source.id, title: String(source.title ?? "") },
  };
}
