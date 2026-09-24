"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import {
  createConversationPrompt,
  createExamPrompt,
  createPresentationPrompt,
  createWritingPrompt,
  deleteCatalogContent,
  isCatalogAdminEmail,
  previewCatalogDelete,
  type CatalogKind,
} from "@/lib/catalog-crud";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  saveComprehensionQuestions,
  saveConversationPrompt,
  saveExamPrompt,
  saveMovieTalkScenes,
  savePersonalQuestions,
  savePresentationPrompt,
  savePronunciationDrill,
  saveStoryFields,
  saveVideoSummaryParagraphs,
  saveWritingPrompt,
  type CompQuestionInput,
  type ConversationForEdit,
  type EditorSaveResult,
  type MovieTalkSceneInput,
  type ParagraphInput,
  type PersonalQuestionInput,
} from "@/lib/content-editor";
import type {
  DrillFocusType,
  ExamTask2Type,
  LyricBlank,
  PresentationSegment,
  PronunciationWordNote,
} from "@/types";

async function teacherAdmin() {
  await requireTeacher("/teacher");
  return createAdminClient();
}

function revalidateCatalog() {
  revalidatePath("/teacher/content");
  revalidatePath("/teacher", "layout");
}

export type CatalogMutateResult = { ok: false; error: string };

async function requireCatalogAdmin() {
  const teacher = await requireTeacher("/teacher");
  if (!isCatalogAdminEmail(teacher.email)) {
    return {
      ok: false as const,
      error: "No tienes permiso para borrar contenido.",
    };
  }
  return { ok: true as const, teacher, admin: createAdminClient() };
}

function revalidateStory(slug: string) {
  revalidatePath("/teacher/content");
  revalidatePath(`/teacher/content/story/${slug}`);
  revalidatePath(`/lesson/${slug}`);
}

export async function saveStoryFieldsAction(
  slug: string,
  fields: Parameters<typeof saveStoryFields>[2]
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await saveStoryFields(admin, slug, fields);
  if (result.ok) revalidateStory(slug);
  return result;
}

export async function saveComprehensionAction(
  slug: string,
  storyId: string,
  questions: CompQuestionInput[]
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await saveComprehensionQuestions(admin, storyId, questions);
  if (result.ok) revalidateStory(slug);
  return result;
}

export async function savePersonalAction(
  slug: string,
  storyId: string,
  questions: PersonalQuestionInput[]
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await savePersonalQuestions(admin, storyId, questions);
  if (result.ok) revalidateStory(slug);
  return result;
}

export async function saveDrillAction(
  slug: string,
  drillId: string,
  fields: {
    practicaCoralStandard: string;
    practicaCoralPhonetic: string;
    practicaCoralIpa: string;
    symbolLegend: string | null;
    focusType: DrillFocusType;
    focusContent: string;
    wordNotes: PronunciationWordNote[];
    coralExplanation: string | null;
  }
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await savePronunciationDrill(admin, drillId, fields);
  if (result.ok) revalidateStory(slug);
  return result;
}

export async function saveMovieTalkAction(
  slug: string,
  storyId: string,
  scenes: MovieTalkSceneInput[]
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await saveMovieTalkScenes(admin, storyId, scenes);
  if (result.ok) revalidateStory(slug);
  return result;
}

export async function saveParagraphsAction(
  slug: string,
  storyId: string,
  paragraphs: ParagraphInput[]
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await saveVideoSummaryParagraphs(admin, storyId, paragraphs);
  if (result.ok) revalidateStory(slug);
  return result;
}

export async function saveWritingAction(
  id: string,
  fields: Parameters<typeof saveWritingPrompt>[2]
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await saveWritingPrompt(admin, id, fields);
  if (result.ok) {
    revalidatePath("/teacher/content");
    revalidatePath(`/teacher/content/writing/${id}`);
    revalidatePath("/writing");
  }
  return result;
}

export async function saveExamAction(
  id: string,
  fields: {
    title: string;
    theme: string;
    vocabRaw: string;
    task1Raw: string;
    task2Type: ExamTask2Type;
    task2Raw: string;
    task3Raw: string;
    timeLimitMinutes: number;
    task1Title: string;
    task1Instructions: string;
    task2Title: string;
    task2Instructions: string;
    task3Title: string;
    task3Instructions: string;
  }
): Promise<EditorSaveResult & { preview?: string }> {
  const admin = await teacherAdmin();
  const result = await saveExamPrompt(admin, id, fields);
  if (result.ok) {
    revalidatePath("/teacher/content");
    revalidatePath(`/teacher/content/exam/${id}`);
    revalidatePath("/exam");
  }
  return result;
}

export async function savePresentationAction(
  id: string,
  fields: {
    title: string;
    theme: string | null;
    warmupQuestion: string | null;
    segments: PresentationSegment[];
  }
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await savePresentationPrompt(admin, id, fields);
  if (result.ok) {
    revalidatePath("/teacher/content");
    revalidatePath(`/teacher/content/presentation/${id}`);
    revalidatePath("/presentation");
  }
  return result;
}

export async function saveConversationAction(
  id: string,
  fields: Pick<ConversationForEdit, "title" | "theme" | "questions">
): Promise<EditorSaveResult> {
  const admin = await teacherAdmin();
  const result = await saveConversationPrompt(admin, id, fields);
  if (result.ok) {
    revalidatePath("/teacher/content");
    revalidatePath(`/teacher/content/conversation/${id}`);
    revalidatePath("/conversation");
  }
  return result;
}

export async function previewCatalogDeleteAction(
  kind: CatalogKind,
  id: string
) {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return gate;
  return previewCatalogDelete(gate.admin, kind, id);
}

export async function deleteCatalogAction(
  kind: CatalogKind,
  id: string
): Promise<CatalogMutateResult | { ok: true }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return gate;
  const result = await deleteCatalogContent(gate.admin, kind, id);
  if (!result.ok) return result;
  revalidateCatalog();
  if (kind === "story") revalidatePath("/lesson");
  return { ok: true };
}

export async function createWritingAction(
  _prev: CatalogMutateResult | null,
  formData: FormData
): Promise<CatalogMutateResult> {
  const teacher = await requireTeacher("/teacher");
  const result = await createWritingPrompt(createAdminClient(), {
    title: String(formData.get("title") ?? ""),
    level: String(formData.get("level") ?? ""),
    createdBy: teacher.id,
  });
  if (!result.ok) return result;
  revalidateCatalog();
  redirect(`/teacher/content/writing/${result.value.id}`);
}

export async function createExamAction(
  _prev: CatalogMutateResult | null,
  formData: FormData
): Promise<CatalogMutateResult> {
  const teacher = await requireTeacher("/teacher");
  const result = await createExamPrompt(createAdminClient(), {
    title: String(formData.get("title") ?? ""),
    level: String(formData.get("level") ?? ""),
    createdBy: teacher.id,
  });
  if (!result.ok) return result;
  revalidateCatalog();
  redirect(`/teacher/content/exam/${result.value.id}`);
}

export async function createPresentationAction(
  _prev: CatalogMutateResult | null,
  formData: FormData
): Promise<CatalogMutateResult> {
  const teacher = await requireTeacher("/teacher");
  const result = await createPresentationPrompt(createAdminClient(), {
    title: String(formData.get("title") ?? ""),
    theme: String(formData.get("theme") ?? "").trim() || null,
    createdBy: teacher.id,
  });
  if (!result.ok) return result;
  revalidateCatalog();
  redirect(`/teacher/content/presentation/${result.value.id}`);
}

export async function createConversationAction(
  _prev: CatalogMutateResult | null,
  formData: FormData
): Promise<CatalogMutateResult> {
  const teacher = await requireTeacher("/teacher");
  const result = await createConversationPrompt(createAdminClient(), {
    title: String(formData.get("title") ?? ""),
    level: String(formData.get("level") ?? ""),
    theme: String(formData.get("theme") ?? "").trim() || null,
    createdBy: teacher.id,
  });
  if (!result.ok) return result;
  revalidateCatalog();
  redirect(`/teacher/content/conversation/${result.value.id}`);
}

export type { LyricBlank, CatalogKind };
