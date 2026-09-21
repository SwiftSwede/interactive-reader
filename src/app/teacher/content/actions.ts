"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
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

export type { LyricBlank };
