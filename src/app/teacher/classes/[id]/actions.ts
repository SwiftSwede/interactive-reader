"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { isSessionType, defaultWritingMinutes, defaultExamTask2Type } from "@/lib/activities";
import { promptTitleFromText, wordDiff } from "@/lib/writing";
import { parseExamForm, nextGroupLabel } from "@/lib/exam";
import type { CourseLevel, ExamTask2Type } from "@/types";

export type CreateSessionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const SESSION_MINUTES = 90;

export async function createSession(
  _prev: CreateSessionResult | null,
  formData: FormData
): Promise<CreateSessionResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionTypeRaw = String(formData.get("sessionType") ?? "story").trim();
  const sessionType = isSessionType(sessionTypeRaw) ? sessionTypeRaw : "story";
  const startIso = String(formData.get("startIso") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!courseId) {
    return { ok: false, error: "No encontré ese curso." };
  }

  const start = new Date(startIso);
  if (!startIso || Number.isNaN(start.getTime())) {
    return { ok: false, error: "Pon la hora de inicio de la clase." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, teacher_id, level")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const localDate = String(formData.get("sessionDate") ?? "").trim();
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    ? localDate
    : start.toISOString().slice(0, 10);

  const end = new Date(start.getTime() + SESSION_MINUTES * 60 * 1000);

  if (sessionType === "writing") {
    const promptText = String(formData.get("promptText") ?? "").trim();
    if (!promptText) {
      return { ok: false, error: "Escribe la pregunta de escritura." };
    }

    const minutesRaw = Number(formData.get("writingTimeMinutes"));
    const minutes =
      minutesRaw === 10 || minutesRaw === 20
        ? minutesRaw
        : defaultWritingMinutes(course.level as CourseLevel);

    const isIntermediate = course.level === "intermediate";
    const structureLesson = isIntermediate
      ? String(formData.get("structureLesson") ?? "").trim() || null
      : null;
    const rubricText = isIntermediate
      ? String(formData.get("rubricText") ?? "").trim() || null
      : null;
    const exampleParagraph = isIntermediate
      ? String(formData.get("exampleParagraph") ?? "").trim() || null
      : null;

    const { data: prompt, error: promptError } = await supabase
      .from("writing_prompts")
      .insert({
        title: promptTitleFromText(promptText),
        prompt_text: promptText,
        writing_time_minutes: minutes,
        level: course.level,
        structure_lesson: structureLesson,
        rubric_text: rubricText,
        example_paragraph: exampleParagraph,
        created_by: teacher.id,
      })
      .select("id, title")
      .maybeSingle();

    if (promptError || !prompt) {
      console.error("create writing prompt failed:", promptError);
      return {
        ok: false,
        error: "No pude guardar la pregunta. Inténtalo de nuevo.",
      };
    }

    const { error } = await supabase.from("course_sessions").insert({
      course_id: courseId,
      session_type: "writing",
      story_id: null,
      writing_prompt_id: prompt.id,
      exam_prompt_id: null,
      session_date: sessionDate,
      session_start_time: start.toISOString(),
      session_end_time: end.toISOString(),
      notes,
    });

    if (error) {
      console.error("create writing session failed:", error);
      return {
        ok: false,
        error: "No pude crear la clase. Inténtalo de nuevo.",
      };
    }

    revalidatePath(`/teacher/classes/${courseId}`);
    revalidatePath("/teacher");
    return { ok: true, message: `Listo. ${prompt.title} ya tiene clase.` };
  }

  if (sessionType === "exam") {
    const task2Raw = String(formData.get("examTask2Type") ?? "").trim();
    const task2Type: ExamTask2Type =
      task2Raw === "paragraph_restructuring" ||
      task2Raw === "sentence_correction"
        ? task2Raw
        : defaultExamTask2Type(course.level as CourseLevel);
    const minutesRaw = Number(formData.get("examTimeMinutes"));
    const parsed = parseExamForm({
      title: String(formData.get("examTitle") ?? ""),
      theme: String(formData.get("examTheme") ?? ""),
      vocabRaw: String(formData.get("examVocab") ?? ""),
      task1Raw: String(formData.get("examTask1") ?? ""),
      task2Type,
      task2Raw: String(formData.get("examTask2") ?? ""),
      task3Raw: String(formData.get("examTask3") ?? ""),
      timeLimitMinutes:
        Number.isFinite(minutesRaw) && minutesRaw > 0 ? minutesRaw : 35,
    });

    if (parsed.error) {
      return { ok: false, error: parsed.error };
    }

    const { data: prompt, error: promptError } = await supabase
      .from("exam_prompts")
      .insert({
        title: parsed.title,
        level: course.level,
        theme: parsed.theme,
        vocabulary_list: parsed.vocabularyList,
        fill_in_translation: parsed.fillInTranslation,
        task2_type: parsed.task2Type,
        paragraph_restructuring: parsed.paragraphRestructuring,
        sentence_correction: parsed.sentenceCorrection,
        translation_sentences: parsed.translationSentences,
        time_limit_minutes: parsed.timeLimitMinutes,
        created_by: teacher.id,
      })
      .select("id, title")
      .maybeSingle();

    if (promptError || !prompt) {
      console.error("create exam prompt failed:", promptError);
      return {
        ok: false,
        error: "No pude guardar el examen. Inténtalo de nuevo.",
      };
    }

    const { error } = await supabase.from("course_sessions").insert({
      course_id: courseId,
      session_type: "exam",
      story_id: null,
      writing_prompt_id: null,
      exam_prompt_id: prompt.id,
      session_date: sessionDate,
      session_start_time: start.toISOString(),
      session_end_time: end.toISOString(),
      notes,
    });

    if (error) {
      console.error("create exam session failed:", error);
      return {
        ok: false,
        error: "No pude crear la clase. Inténtalo de nuevo.",
      };
    }

    revalidatePath(`/teacher/classes/${courseId}`);
    revalidatePath("/teacher");
    return { ok: true, message: `Listo. ${prompt.title} ya tiene clase.` };
  }

  const storyId = String(formData.get("storyId") ?? "").trim();

  if (!storyId) {
    return {
      ok: false,
      error:
        sessionType === "video_summary"
          ? "Elige una traducción."
          : "Elige una historia.",
    };
  }

  const { data: story } = await supabase
    .from("stories")
    .select("id, title, level, kind")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false, error: "No encontré esa historia." };
  }

  if (story.level !== (course.level as CourseLevel)) {
    return {
      ok: false,
      error: "Esa historia no es del mismo nivel que el curso.",
    };
  }

  if (sessionType === "video_summary") {
    if (story.kind !== "video_summary") {
      return { ok: false, error: "Esa no es una traducción de clase." };
    }

    const { error } = await supabase.from("course_sessions").insert({
      course_id: courseId,
      session_type: "video_summary",
      story_id: storyId,
      writing_prompt_id: null,
      exam_prompt_id: null,
      session_date: sessionDate,
      session_start_time: start.toISOString(),
      session_end_time: end.toISOString(),
      notes,
    });

    if (error) {
      console.error("create video summary session failed:", error);
      return {
        ok: false,
        error: "No pude crear la clase. Inténtalo de nuevo.",
      };
    }

    revalidatePath(`/teacher/classes/${courseId}`);
    revalidatePath("/teacher");
    return { ok: true, message: `Listo. ${story.title} ya tiene clase.` };
  }

  if (story.kind === "video_summary") {
    return {
      ok: false,
      error: "Esa es una traducción. Elige el tipo Traducción.",
    };
  }

  const { error } = await supabase.from("course_sessions").insert({
    course_id: courseId,
    session_type: "story",
    story_id: storyId,
    writing_prompt_id: null,
    exam_prompt_id: null,
    session_date: sessionDate,
    session_start_time: start.toISOString(),
    session_end_time: end.toISOString(),
    notes,
  });

  if (error) {
    const { error: legacyError } = await supabase.from("course_sessions").insert({
      course_id: courseId,
      story_id: storyId,
      session_date: sessionDate,
      session_start_time: start.toISOString(),
      session_end_time: end.toISOString(),
      notes,
    });
    if (legacyError) {
      console.error("createSession failed:", error, legacyError);
      return {
        ok: false,
        error: "No pude crear la clase. Inténtalo de nuevo.",
      };
    }
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  revalidatePath("/teacher");
  return { ok: true, message: `Listo. ${story.title} ya tiene clase.` };
}

export type DeleteSessionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteSession(
  formData: FormData
): Promise<DeleteSessionResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!courseId || !sessionId) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data, error } = await supabase
    .from("course_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("deleteSession failed:", error);
    return {
      ok: false,
      error: "No pude quitar esa clase. Inténtalo de nuevo.",
    };
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

export type UnlockAnswersResult =
  | { ok: true }
  | { ok: false; error: string };

export async function unlockAnswers(
  formData: FormData
): Promise<UnlockAnswersResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!courseId || !sessionId) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data, error } = await supabase
    .from("course_sessions")
    .update({ answers_revealed: true })
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("unlockAnswers failed:", error);
    return {
      ok: false,
      error: "No pude desbloquear las respuestas. Inténtalo de nuevo.",
    };
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  revalidatePath(`/teacher/classes/${courseId}/sessions/${sessionId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

export type StartTimerResult =
  | { ok: true }
  | { ok: false; error: string };

export async function startWritingTimer(
  formData: FormData
): Promise<StartTimerResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!courseId || !sessionId) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data, error } = await supabase
    .from("course_sessions")
    .update({ timer_started_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .in("session_type", ["writing", "video_summary"])
    .is("timer_started_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    const { data: existing } = await supabase
      .from("course_sessions")
      .select("id, timer_started_at")
      .eq("id", sessionId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (existing?.timer_started_at) {
      return { ok: true };
    }
    console.error("startWritingTimer failed:", error);
    return {
      ok: false,
      error: "No pude iniciar el tiempo. Inténtalo de nuevo.",
    };
  }

  revalidatePath(`/teacher/classes/${courseId}`);
  revalidatePath(`/teacher/classes/${courseId}/sessions/${sessionId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

export type SaveCorrectionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveWritingCorrection(
  formData: FormData
): Promise<SaveCorrectionResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const correctedText = String(formData.get("correctedText") ?? "");
  const originalText = String(formData.get("originalText") ?? "");

  let inlineNotes: Array<{ word_index: number; note: string }> | null = null;
  let goodVocabulary: number[] | null = null;
  try {
    const notesRaw = String(formData.get("inlineNotes") ?? "").trim();
    if (notesRaw) {
      const parsed = JSON.parse(notesRaw) as Array<{
        word_index: number;
        note: string;
      }>;
      inlineNotes = parsed.filter(
        (row) =>
          Number.isInteger(row.word_index) &&
          row.word_index >= 0 &&
          row.note.trim()
      );
      if (inlineNotes.length === 0) inlineNotes = null;
    }
    const vocabRaw = String(formData.get("goodVocabulary") ?? "").trim();
    if (vocabRaw) {
      const parsed = JSON.parse(vocabRaw) as number[];
      goodVocabulary = parsed.filter(
        (index) => Number.isInteger(index) && index >= 0
      );
      if (goodVocabulary.length === 0) goodVocabulary = null;
    }
  } catch {
    return { ok: false, error: "No pude leer las notas. Inténtalo de nuevo." };
  }

  if (!courseId || !sessionId || !submissionId) {
    return { ok: false, error: "No encontré esa entrega." };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!course) {
    return { ok: false, error: "Ese curso no es tuyo." };
  }

  const { data: submission } = await supabase
    .from("writing_submissions")
    .select("id, course_session_id, submission_text, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || submission.course_session_id !== sessionId) {
    return { ok: false, error: "No encontré esa entrega." };
  }

  const sourceText = originalText || submission.submission_text;
  const diff = wordDiff(sourceText, correctedText);

  const { data: existing } = await supabase
    .from("writing_corrections")
    .select("id")
    .eq("writing_submission_id", submissionId)
    .maybeSingle();

  const payload = {
    writing_submission_id: submissionId,
    corrected_text: correctedText,
    correction_diff: diff,
    inline_notes: inlineNotes,
    good_vocabulary: goodVocabulary,
    corrected_by: teacher.id,
    corrected_at: new Date().toISOString(),
  };

  const { error: correctionError } = existing
    ? await supabase
        .from("writing_corrections")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("writing_corrections").insert(payload);

  if (correctionError) {
    console.error("saveWritingCorrection failed:", correctionError);
    return {
      ok: false,
      error: "No pude guardar la corrección. Inténtalo de nuevo.",
    };
  }

  const { error: statusError } = await supabase
    .from("writing_submissions")
    .update({ status: "corrected" })
    .eq("id", submissionId);

  if (statusError) {
    console.error("mark submission corrected failed:", statusError);
  }

  revalidatePath(`/teacher/classes/${courseId}/sessions/${sessionId}`);
  revalidatePath(
    `/teacher/classes/${courseId}/sessions/${sessionId}/submissions/${submissionId}`
  );
  revalidatePath("/teacher");
  return { ok: true };
}

export type SaveExamGroupResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createExamGroup(
  formData: FormData
): Promise<SaveExamGroupResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const writerId = String(formData.get("writerId") ?? "").trim();
  const memberIds = formData
    .getAll("memberIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!courseId || !sessionId) {
    return { ok: false, error: "No encontré esa clase." };
  }
  if (memberIds.length < 2 || memberIds.length > 3) {
    return { ok: false, error: "Cada grupo son 2 o 3 estudiantes." };
  }
  if (!writerId || !memberIds.includes(writerId)) {
    return { ok: false, error: "El escritor tiene que estar en el grupo." };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();
  if (!course) return { ok: false, error: "Ese curso no es tuyo." };

  const { data: session } = await supabase
    .from("course_sessions")
    .select("id, session_type")
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!session || session.session_type !== "exam") {
    return { ok: false, error: "Esa no es una clase de examen." };
  }

  const { data: existing } = await supabase
    .from("exam_groups")
    .select("id, group_label, member_ids")
    .eq("course_session_id", sessionId);

  const taken = new Set<string>();
  for (const row of (existing ?? []) as { member_ids: string[] }[]) {
    for (const id of row.member_ids ?? []) taken.add(id);
  }
  if (memberIds.some((id) => taken.has(id))) {
    return { ok: false, error: "Alguien de ese grupo ya está en otro." };
  }

  const label = nextGroupLabel(
    ((existing ?? []) as { group_label: string }[]).map((row) => row.group_label)
  );

  const { error } = await supabase.from("exam_groups").insert({
    course_session_id: sessionId,
    group_label: label,
    writer_id: writerId,
    member_ids: memberIds,
  });

  if (error) {
    console.error("createExamGroup failed:", error);
    return { ok: false, error: "No pude armar el grupo. Inténtalo de nuevo." };
  }

  revalidatePath(`/teacher/classes/${courseId}/sessions/${sessionId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

export async function deleteExamGroup(
  formData: FormData
): Promise<SaveExamGroupResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const groupId = String(formData.get("groupId") ?? "").trim();

  if (!courseId || !sessionId || !groupId) {
    return { ok: false, error: "No encontré ese grupo." };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();
  if (!course) return { ok: false, error: "Ese curso no es tuyo." };

  const { error } = await supabase
    .from("exam_groups")
    .delete()
    .eq("id", groupId)
    .eq("course_session_id", sessionId);

  if (error) {
    console.error("deleteExamGroup failed:", error);
    return { ok: false, error: "No pude quitar el grupo." };
  }

  revalidatePath(`/teacher/classes/${courseId}/sessions/${sessionId}`);
  return { ok: true };
}

export async function startExamReview(
  formData: FormData
): Promise<SaveExamGroupResult> {
  const teacher = await requireTeacher("/teacher");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!courseId || !sessionId) {
    return { ok: false, error: "No encontré esa clase." };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();
  if (!course) return { ok: false, error: "Ese curso no es tuyo." };

  const now = new Date().toISOString();
  const { error: sessionError } = await supabase
    .from("course_sessions")
    .update({ answers_revealed: true })
    .eq("id", sessionId)
    .eq("course_id", courseId)
    .eq("session_type", "exam");

  if (sessionError) {
    console.error("startExamReview session failed:", sessionError);
    return { ok: false, error: "No pude iniciar la revisión." };
  }

  await supabase
    .from("group_exam_submissions")
    .update({ review_revealed_at: now })
    .eq("course_session_id", sessionId)
    .is("review_revealed_at", null);

  revalidatePath(`/teacher/classes/${courseId}/sessions/${sessionId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

