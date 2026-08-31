"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { countWords } from "@/lib/writing";

export type VideoSummaryActionResult =
  | { ok: true }
  | { ok: false; error: string };

const textSchema = z.string().max(8000);
const uuidSchema = z.string().uuid();

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Tienes que entrar con tu email." };
  }
  const profile = await getProfile(user.id);
  return { ok: true as const, supabase, user, profile };
}

export async function saveVideoSummaryDraft(input: {
  sessionId: string;
  storyId: string;
  text: string;
  startedAt: string;
}): Promise<VideoSummaryActionResult> {
  const auth = await currentUser();
  if (!auth.ok) return auth;
  if (auth.profile?.role === "teacher") {
    return { ok: false, error: "El profe no entrega el resumen." };
  }

  const sessionId = uuidSchema.safeParse(input.sessionId);
  const storyId = uuidSchema.safeParse(input.storyId);
  const text = textSchema.safeParse(input.text ?? "");
  if (!sessionId.success || !storyId.success || !text.success) {
    return { ok: false, error: "No pude guardar. Inténtalo de nuevo." };
  }

  const wordCount = countWords(text.data);
  const { data: existing } = await auth.supabase
    .from("video_summary_free_writes")
    .select("id, submitted_at")
    .eq("course_session_id", sessionId.data)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing?.submitted_at) return { ok: true };

  const payload = {
    story_id: storyId.data,
    user_id: auth.user.id,
    course_session_id: sessionId.data,
    submission_text: text.data,
    started_at: input.startedAt,
    word_count: wordCount,
  };

  const { error } = existing
    ? await auth.supabase
        .from("video_summary_free_writes")
        .update(payload)
        .eq("id", existing.id)
    : await auth.supabase.from("video_summary_free_writes").insert(payload);

  if (error) {
    console.error("saveVideoSummaryDraft failed:", error);
    return { ok: false, error: "No pude guardar. Sigue escribiendo." };
  }
  return { ok: true };
}

export async function submitVideoSummary(input: {
  sessionId: string;
  storyId: string;
  text: string;
  startedAt: string;
}): Promise<VideoSummaryActionResult> {
  const saved = await saveVideoSummaryDraft(input);
  if (!saved.ok) return saved;

  const auth = await currentUser();
  if (!auth.ok) return auth;

  const submittedAt = new Date();
  const started = new Date(input.startedAt);
  const elapsedSeconds = Math.max(
    1,
    Math.round((submittedAt.getTime() - started.getTime()) / 1000)
  );

  const { error } = await auth.supabase
    .from("video_summary_free_writes")
    .update({
      submission_text: input.text,
      word_count: countWords(input.text),
      submitted_at: submittedAt.toISOString(),
      elapsed_seconds: elapsedSeconds,
    })
    .eq("course_session_id", input.sessionId)
    .eq("user_id", auth.user.id)
    .is("submitted_at", null);

  if (error) {
    console.error("submitVideoSummary failed:", error);
    return { ok: false, error: "No pude entregar. Inténtalo de nuevo." };
  }
  return { ok: true };
}

export async function saveVideoSummaryTranslation(input: {
  paragraphId: string;
  english: string;
  firstKeystroke: boolean;
}): Promise<VideoSummaryActionResult> {
  const auth = await currentUser();
  if (!auth.ok) return auth;
  if (auth.profile?.role !== "teacher") {
    return { ok: false, error: "Solo el profe traduce aquí." };
  }

  const paragraphId = uuidSchema.safeParse(input.paragraphId);
  const english = textSchema.safeParse(input.english ?? "");
  if (!paragraphId.success || !english.success) {
    return { ok: false, error: "No pude guardar la traducción." };
  }

  const patch: Record<string, string> = {
    english_translation: english.data,
  };
  if (input.firstKeystroke) {
    patch.translation_started_at = new Date().toISOString();
  }

  const { error } = await auth.supabase
    .from("video_summary_paragraphs")
    .update(patch)
    .eq("id", paragraphId.data);

  if (error) {
    console.error("saveVideoSummaryTranslation failed:", error);
    return { ok: false, error: "No pude guardar. Inténtalo de nuevo." };
  }
  return { ok: true };
}

export async function markParagraphReady(
  paragraphId: string
): Promise<VideoSummaryActionResult> {
  const auth = await currentUser();
  if (!auth.ok) return auth;
  if (auth.profile?.role !== "teacher") {
    return { ok: false, error: "Solo el profe marca Listo." };
  }

  const parsed = uuidSchema.safeParse(paragraphId);
  if (!parsed.success) {
    return { ok: false, error: "No encontré ese párrafo." };
  }

  const { error } = await auth.supabase
    .from("video_summary_paragraphs")
    .update({ translation_completed_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) {
    console.error("markParagraphReady failed:", error);
    return { ok: false, error: "No pude marcar Listo." };
  }
  return { ok: true };
}

const noteSchema = z.object({
  sessionId: z.string().uuid(),
  storyId: z.string().uuid(),
  paragraphPosition: z.number().int().min(0).max(50),
  selectedText: z.string().min(1).max(200),
  note: z.string().min(1).max(500),
  noteType: z.enum(["vocabulary", "grammar", "pronunciation", "cultural"]),
});

export async function addVideoSummaryNote(
  input: z.infer<typeof noteSchema>
): Promise<VideoSummaryActionResult> {
  const auth = await currentUser();
  if (!auth.ok) return auth;
  if (auth.profile?.role !== "teacher") {
    return { ok: false, error: "Solo el profe pone notas." };
  }

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Esa nota no se pudo guardar." };
  }

  const { error } = await auth.supabase.from("video_summary_teaching_notes").insert({
    story_id: parsed.data.storyId,
    course_session_id: parsed.data.sessionId,
    paragraph_position: parsed.data.paragraphPosition,
    selected_text: parsed.data.selectedText,
    note: parsed.data.note,
    note_type: parsed.data.noteType,
    created_by: auth.user.id,
  });

  if (error) {
    console.error("addVideoSummaryNote failed:", error);
    return { ok: false, error: "No pude guardar la nota." };
  }
  return { ok: true };
}
