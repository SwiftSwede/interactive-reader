import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationQuestion,
  CourseLevel,
  DrillFocusType,
  ExamTask2Type,
  LyricBlank,
  PresentationSegment,
  PronunciationWordNote,
  QuestionLevel,
  StoryKind,
  StoryLevel,
  WritingPrompt,
} from "@/types";
import {
  applyExamClassAnswersToPrompt,
  defaultExamTaskCopy,
  examCountsDropped,
  examItemCounts,
  mapExamPromptRow,
  parseExamClassAnswers,
  parseExamForm,
  serializeFillInTranslation,
  serializeParagraphRestructuring,
  serializeSentenceCorrection,
  serializeTranslationSentences,
  serializeVocabList,
  type ExamItemCounts,
  type ExamPromptRow,
} from "@/lib/exam";
import {
  mapConversationPromptRow,
  parseConversationQuestions,
  serializeConversationQuestions,
  type ConversationPromptRow,
} from "@/lib/conversation";
import {
  mapPresentationPromptRow,
  serializePresentationSegments,
  type PresentationPromptRow,
} from "@/lib/presentation";
import { normalizeBlankAnswer, parseLyricBlanks } from "@/lib/music";
import {
  joinTranscriptScenes,
  splitTranscriptScenes,
} from "@/lib/movietalk";
import type {
  CompQuestionRow,
  MovieTalkSceneRow,
  PersonalQuestionRow,
  PronunciationDrillRow,
  StoryRow,
} from "@/lib/stories";
import type { VideoSummaryParagraphRow } from "@/lib/video-summary";
import { parseSessionYoutubeUrl } from "@/lib/youtube-url";

export type ContentKind =
  | StoryKind
  | "writing"
  | "exam"
  | "presentation"
  | "conversation";

export type ContentIndexItem = {
  key: string;
  kind: ContentKind;
  title: string;
  level: string;
  href: string;
  sortAt: string;
  wordCount?: number;
  theme?: string | null;
  questionCount?: number;
};

export type EditorSaveResult = { ok: true } | { ok: false; error: string };

export const BODY_TEXT_WARNING =
  "Cambiar el texto invalida los timestamps de karaoke y las anotaciones de palabras si cambia el número de palabras.";

export const VIDEO_PARAGRAPH_DELETE_WARNING =
  "Este párrafo puede contener traducciones en vivo de una clase pasada. ¿Eliminar de todos modos?";

const STORY_KINDS: StoryKind[] = [
  "story",
  "dialogue",
  "movie_talk",
  "song",
  "video_summary",
];

export function isStoryKind(value: string | null | undefined): value is StoryKind {
  return (
    value === "story" ||
    value === "dialogue" ||
    value === "movie_talk" ||
    value === "song" ||
    value === "video_summary"
  );
}

export function contentKindLabel(kind: ContentKind): string {
  if (kind === "dialogue") return "Diálogo";
  if (kind === "movie_talk") return "Movie Talk";
  if (kind === "song") return "Canción";
  if (kind === "video_summary") return "Traducción";
  if (kind === "writing") return "Escritura";
  if (kind === "exam") return "Examen";
  if (kind === "presentation") return "Presentación";
  if (kind === "conversation") return "Conversación";
  return "Historia";
}

export function contentLevelLabel(level: string): string {
  if (level === "beginner") return "Principiante";
  if (level === "pre-intermediate") return "Pre-intermedio";
  if (level === "intermediate") return "Intermedio";
  return level;
}

export function storyWordCount(body: string): number {
  const tokens = body.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

export function nextStableId(ids: number[]): number {
  return Math.max(0, ...ids) + 1;
}

export function reuseLyricBlankIds(blanks: LyricBlank[]): LyricBlank[] {
  const byAnswer = new Map<string, number>();
  return blanks.map((blank) => {
    const key = normalizeBlankAnswer(blank.answer);
    if (!key) return blank;
    const existing = byAnswer.get(key);
    if (existing != null) return { ...blank, id: existing };
    byAnswer.set(key, blank.id);
    return blank;
  });
}

export function mintLyricBlank(blanks: LyricBlank[]): LyricBlank {
  return {
    id: nextStableId(blanks.map((blank) => blank.id)),
    prompt: "",
    answer: "",
  };
}

export function filterContentItems(
  items: ContentIndexItem[],
  kind: ContentKind | "all",
  level: string | "all"
): ContentIndexItem[] {
  return items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (level !== "all" && item.level !== level) return false;
    return true;
  });
}

export type ContentSort = "recent" | "title" | "kind" | "level";

const LEVEL_SORT_RANK: Record<string, number> = {
  beginner: 0,
  "pre-intermediate": 1,
  intermediate: 2,
};

function compareTitle(a: ContentIndexItem, b: ContentIndexItem): number {
  const byTitle = a.title.localeCompare(b.title, "es", { sensitivity: "base" });
  if (byTitle !== 0) return byTitle;
  return a.key.localeCompare(b.key);
}

export function sortContentItems(
  items: ContentIndexItem[],
  sort: ContentSort
): ContentIndexItem[] {
  return [...items].sort((a, b) => {
    if (sort === "title") return compareTitle(a, b);
    if (sort === "kind") {
      const byKind = contentKindLabel(a.kind).localeCompare(
        contentKindLabel(b.kind),
        "es",
        { sensitivity: "base" }
      );
      if (byKind !== 0) return byKind;
      return compareTitle(a, b);
    }
    if (sort === "level") {
      const byLevel =
        (LEVEL_SORT_RANK[a.level] ?? 99) - (LEVEL_SORT_RANK[b.level] ?? 99);
      if (byLevel !== 0) return byLevel;
      return compareTitle(a, b);
    }
    const byDate = b.sortAt.localeCompare(a.sortAt);
    if (byDate !== 0) return byDate;
    return compareTitle(a, b);
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function fail(error: string): EditorSaveResult {
  return { ok: false, error };
}

export async function listAllContent(
  supabase: SupabaseClient
): Promise<ContentIndexItem[]> {
  const [stories, writing, exams, presentations, conversations] =
    await Promise.all([
      supabase
        .from("stories")
        .select("id, title, slug, kind, level, word_count, updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("writing_prompts")
        .select("id, title, level, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("exam_prompts")
        .select("id, title, level, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("presentation_prompts")
        .select("id, title, level, theme, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_prompts")
        .select("id, title, level, theme, questions, created_at")
        .order("created_at", { ascending: false }),
    ]);

  const items: ContentIndexItem[] = [];

  for (const row of stories.data ?? []) {
    const kind = isStoryKind(row.kind) ? row.kind : "story";
    items.push({
      key: `story:${row.id}`,
      kind,
      title: row.title,
      level: row.level,
      href: `/teacher/content/story/${encodeURIComponent(row.slug)}`,
      sortAt: row.updated_at,
      wordCount: row.word_count,
    });
  }

  for (const row of writing.data ?? []) {
    items.push({
      key: `writing:${row.id}`,
      kind: "writing",
      title: row.title,
      level: row.level,
      href: `/teacher/content/writing/${row.id}`,
      sortAt: row.created_at,
    });
  }

  for (const row of exams.data ?? []) {
    items.push({
      key: `exam:${row.id}`,
      kind: "exam",
      title: row.title,
      level: row.level,
      href: `/teacher/content/exam/${row.id}`,
      sortAt: row.created_at,
    });
  }

  for (const row of presentations.data ?? []) {
    items.push({
      key: `presentation:${row.id}`,
      kind: "presentation",
      title: row.title,
      level: row.level,
      href: `/teacher/content/presentation/${row.id}`,
      sortAt: row.created_at,
      theme: row.theme,
    });
  }

  for (const row of conversations.data ?? []) {
    items.push({
      key: `conversation:${row.id}`,
      kind: "conversation",
      title: row.title,
      level: row.level,
      href: `/teacher/content/conversation/${row.id}`,
      sortAt: row.created_at,
      theme: row.theme,
      questionCount: parseConversationQuestions(row.questions).length,
    });
  }

  items.sort((a, b) => {
    const byDate = b.sortAt.localeCompare(a.sortAt);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title, "es");
  });
  return items;
}

export type StoryForEdit = {
  story: StoryRow;
  comprehensionQuestions: CompQuestionRow[];
  personalQuestions: PersonalQuestionRow[];
  pronunciationDrill: PronunciationDrillRow | null;
  movieTalkScenes: MovieTalkSceneRow[];
  paragraphs: VideoSummaryParagraphRow[];
  comprehensionResponseCount: number;
  songAttemptCount: number;
};

export async function loadStoryForEdit(
  supabase: SupabaseClient,
  slug: string
): Promise<StoryForEdit | null> {
  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !story) return null;
  const storyRow = story as StoryRow;

  const [comp, personal, drill, scenes, paragraphs] = await Promise.all([
    supabase
      .from("comprehension_questions")
      .select("id, story_id, position, question, answer, level")
      .eq("story_id", storyRow.id)
      .order("position", { ascending: true }),
    supabase
      .from("personal_questions")
      .select("id, story_id, position, question")
      .eq("story_id", storyRow.id)
      .order("position", { ascending: true }),
    supabase
      .from("pronunciation_drills")
      .select("*")
      .eq("story_id", storyRow.id)
      .maybeSingle(),
    storyRow.kind === "movie_talk"
      ? supabase
          .from("movie_talk_scenes")
          .select(
            "id, story_id, scene_number, youtube_url, start_seconds, end_seconds, question_start_position, question_end_position"
          )
          .eq("story_id", storyRow.id)
          .order("scene_number", { ascending: true })
      : Promise.resolve({ data: [] as MovieTalkSceneRow[] }),
    storyRow.kind === "video_summary"
      ? supabase
          .from("video_summary_paragraphs")
          .select(
            "id, story_id, position, spanish_text, english_translation, translation_started_at, translation_completed_at"
          )
          .eq("story_id", storyRow.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] as VideoSummaryParagraphRow[] }),
  ]);

  const questions = (comp.data ?? []) as CompQuestionRow[];
  const questionIds = questions.map((row) => row.id);
  const [responses, attempts] = await Promise.all([
    questionIds.length > 0
      ? supabase
          .from("comprehension_responses")
          .select("id", { count: "exact", head: true })
          .in("comprehension_question_id", questionIds)
      : Promise.resolve({ count: 0 }),
    storyRow.kind === "song"
      ? supabase
          .from("song_lyric_attempts")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyRow.id)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    story: storyRow,
    comprehensionQuestions: questions,
    personalQuestions: (personal.data ?? []) as PersonalQuestionRow[],
    pronunciationDrill: (drill.data as PronunciationDrillRow | null) ?? null,
    movieTalkScenes: (scenes.data ?? []) as MovieTalkSceneRow[],
    paragraphs: (paragraphs.data ?? []) as VideoSummaryParagraphRow[],
    comprehensionResponseCount: responses.count ?? 0,
    songAttemptCount: attempts.count ?? 0,
  };
}

export async function saveStoryFields(
  supabase: SupabaseClient,
  slug: string,
  fields: {
    title?: string;
    bodyText?: string;
    youtubeUrl?: string | null;
    artistBio?: string | null;
    songMeaning?: string | null;
    lyricBlanks?: LyricBlank[];
    lyricsIpa?: unknown;
    lineTimestamps?: unknown;
    spanishSummary?: string | null;
    synopsis?: string | null;
    warmupQuestion?: string | null;
    freeWriteMinutes?: number;
  }
): Promise<EditorSaveResult> {
  const { data: story } = await supabase
    .from("stories")
    .select("id, kind")
    .eq("slug", slug)
    .maybeSingle();
  if (!story) return fail("No encontré esa lección.");

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.title !== undefined) {
    const title = fields.title.trim();
    if (!title) return fail("Ponle un título.");
    if (title.length > 200) return fail("El título se pasó de 200 letras.");
    patch.title = title;
  }
  if (fields.bodyText !== undefined) {
    patch.body_text = fields.bodyText;
    patch.word_count = storyWordCount(fields.bodyText);
  }

  const kind = isStoryKind(story.kind) ? story.kind : "story";
  if (kind === "song" || kind === "video_summary") {
    if (fields.youtubeUrl !== undefined) {
      const parsed = parseSessionYoutubeUrl(fields.youtubeUrl ?? "");
      if (!parsed.ok) return fail(parsed.error);
      patch.youtube_url = parsed.value;
    }
  }
  if (kind === "song") {
    if (fields.artistBio !== undefined) patch.artist_bio = fields.artistBio;
    if (fields.songMeaning !== undefined) patch.song_meaning = fields.songMeaning;
    if (fields.lyricBlanks !== undefined) {
      const blanks = reuseLyricBlankIds(
        parseLyricBlanks(fields.lyricBlanks).filter(
          (blank) => blank.prompt.trim() && blank.answer.trim()
        )
      );
      patch.lyric_blanks = blanks;
    }
    if (fields.lyricsIpa !== undefined) patch.lyrics_ipa = fields.lyricsIpa;
    if (fields.lineTimestamps !== undefined) {
      patch.line_timestamps = fields.lineTimestamps;
    }
  }
  if (kind === "video_summary") {
    if (fields.spanishSummary !== undefined) {
      patch.spanish_summary = fields.spanishSummary;
    }
    if (fields.freeWriteMinutes !== undefined) {
      const minutes = fields.freeWriteMinutes;
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30) {
        return fail("Los minutos de escritura van de 1 a 30.");
      }
      patch.free_write_minutes = minutes;
    }
  }
  if (kind === "movie_talk") {
    if (fields.synopsis !== undefined) patch.synopsis = fields.synopsis;
    if (fields.warmupQuestion !== undefined) {
      patch.warmup_question = fields.warmupQuestion?.trim() || null;
    }
  }

  const { error } = await supabase.from("stories").update(patch).eq("id", story.id);
  if (error) {
    console.error("saveStoryFields failed:", error);
    return fail("No pude guardar. Inténtalo de nuevo.");
  }
  return { ok: true };
}

export type CompQuestionInput = {
  id: string;
  question: string;
  answer: string | null;
  level: QuestionLevel;
};

export async function saveComprehensionQuestions(
  supabase: SupabaseClient,
  storyId: string,
  questions: CompQuestionInput[]
): Promise<EditorSaveResult> {
  const cleaned = questions
    .map((row) => ({
      ...row,
      question: row.question.trim(),
      answer: row.answer?.trim() ? row.answer.trim() : null,
    }))
    .filter((row) => row.question);

  const { data: existing } = await supabase
    .from("comprehension_questions")
    .select("id")
    .eq("story_id", storyId);
  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const keepIds = new Set(
    cleaned.map((row) => row.id).filter((id) => existingIds.has(id))
  );

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("comprehension_questions")
      .delete()
      .in("id", toDelete);
    if (error) {
      console.error("delete comprehension questions failed:", error);
      return fail("No pude borrar una pregunta. Inténtalo de nuevo.");
    }
  }

  for (const [index, row] of cleaned.entries()) {
    const position = index + 1;
    const level: QuestionLevel =
      row.level === "inferential" ? "inferential" : "factual";
    if (keepIds.has(row.id)) {
      const { error } = await supabase
        .from("comprehension_questions")
        .update({
          question: row.question,
          answer: row.answer,
          level,
          position,
        })
        .eq("id", row.id);
      if (error) {
        console.error("update comprehension question failed:", error);
        return fail("No pude guardar una pregunta. Inténtalo de nuevo.");
      }
      continue;
    }
    const insert = {
      story_id: storyId,
      question: row.question,
      answer: row.answer,
      level,
      position,
      ...(isUuid(row.id) ? { id: row.id } : {}),
    };
    const { error } = await supabase.from("comprehension_questions").insert(insert);
    if (error) {
      console.error("insert comprehension question failed:", error);
      return fail("No pude agregar una pregunta. Inténtalo de nuevo.");
    }
  }
  return { ok: true };
}

export type PersonalQuestionInput = { id: string; question: string };

export async function savePersonalQuestions(
  supabase: SupabaseClient,
  storyId: string,
  questions: PersonalQuestionInput[]
): Promise<EditorSaveResult> {
  const cleaned = questions
    .map((row) => ({ ...row, question: row.question.trim() }))
    .filter((row) => row.question);

  const { data: existing } = await supabase
    .from("personal_questions")
    .select("id")
    .eq("story_id", storyId);
  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const keepIds = new Set(
    cleaned.map((row) => row.id).filter((id) => existingIds.has(id))
  );
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("personal_questions")
      .delete()
      .in("id", toDelete);
    if (error) {
      console.error("delete personal questions failed:", error);
      return fail("No pude borrar una pregunta. Inténtalo de nuevo.");
    }
  }

  for (const [index, row] of cleaned.entries()) {
    const position = index + 1;
    if (keepIds.has(row.id)) {
      const { error } = await supabase
        .from("personal_questions")
        .update({ question: row.question, position })
        .eq("id", row.id);
      if (error) {
        console.error("update personal question failed:", error);
        return fail("No pude guardar una pregunta. Inténtalo de nuevo.");
      }
      continue;
    }
    const { error } = await supabase.from("personal_questions").insert({
      story_id: storyId,
      question: row.question,
      position,
      ...(isUuid(row.id) ? { id: row.id } : {}),
    });
    if (error) {
      console.error("insert personal question failed:", error);
      return fail("No pude agregar una pregunta. Inténtalo de nuevo.");
    }
  }
  return { ok: true };
}

const FOCUS_TYPES: DrillFocusType[] = [
  "sounds",
  "ed-s-rules",
  "emphasized-syllable",
];

export async function savePronunciationDrill(
  supabase: SupabaseClient,
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
  if (!FOCUS_TYPES.includes(fields.focusType)) {
    return fail("Ese tipo de enfoque no existe.");
  }
  const notes = fields.wordNotes
    .map((note) => ({
      word: note.word.trim(),
      note: note.note.trim(),
    }))
    .filter((note) => note.word && note.note);

  const { error } = await supabase
    .from("pronunciation_drills")
    .update({
      practica_coral_standard: fields.practicaCoralStandard.trim(),
      practica_coral_phonetic: fields.practicaCoralPhonetic.trim(),
      practica_coral_ipa: fields.practicaCoralIpa.trim(),
      symbol_legend: fields.symbolLegend?.trim() || null,
      focus_type: fields.focusType,
      focus_content: fields.focusContent.trim(),
      word_notes: notes,
      coral_explanation: fields.coralExplanation?.trim() || null,
    })
    .eq("id", drillId);
  if (error) {
    console.error("savePronunciationDrill failed:", error);
    return fail("No pude guardar la pronunciación. Inténtalo de nuevo.");
  }
  return { ok: true };
}

export type MovieTalkSceneInput = {
  id: string;
  youtubeUrl: string;
  startSeconds: number | null;
  endSeconds: number | null;
  questionStartPosition: number | null;
  questionEndPosition: number | null;
  transcript: string;
};

export function movieTalkTranscriptMatchesScenes(
  bodyText: string,
  sceneCount: number
): boolean {
  return splitTranscriptScenes(bodyText).length === sceneCount;
}

export async function saveMovieTalkScenes(
  supabase: SupabaseClient,
  storyId: string,
  scenes: MovieTalkSceneInput[]
): Promise<EditorSaveResult> {
  if (scenes.length < 1) {
    return fail("Un Movie Talk necesita al menos una escena.");
  }

  const transcripts: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    const transcript = scene.transcript.trim() || `[Escena ${index + 1}]`;
    transcripts.push(transcript);
    if (scene.youtubeUrl.trim()) {
      const parsed = parseSessionYoutubeUrl(scene.youtubeUrl);
      if (!parsed.ok) return fail(parsed.error);
    }
    const start = scene.questionStartPosition;
    const end = scene.questionEndPosition;
    if (
      (start == null) !== (end == null) ||
      (start != null && end != null && start > end)
    ) {
      return fail(
        `Escena ${index + 1}: el rango de preguntas no cuadra (inicio y fin).`
      );
    }
    if (
      scene.startSeconds != null &&
      scene.endSeconds != null &&
      scene.startSeconds > scene.endSeconds
    ) {
      return fail(`Escena ${index + 1}: el tiempo de inicio va después del final.`);
    }
  }

  const bodyText = joinTranscriptScenes(transcripts);
  if (!movieTalkTranscriptMatchesScenes(bodyText, scenes.length)) {
    return fail(
      "El texto y las escenas no coinciden. Separa cada escena con una línea de ***."
    );
  }

  const { data: existing } = await supabase
    .from("movie_talk_scenes")
    .select("id")
    .eq("story_id", storyId);
  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const keepIds = new Set(
    scenes.map((scene) => scene.id).filter((id) => existingIds.has(id))
  );
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("movie_talk_scenes")
      .delete()
      .in("id", toDelete);
    if (error) {
      console.error("delete movie talk scenes failed:", error);
      return fail("No pude borrar una escena. Inténtalo de nuevo.");
    }
  }

  for (const [index, scene] of scenes.entries()) {
    const sceneNumber = index + 1;
    const parsedUrl = scene.youtubeUrl.trim()
      ? parseSessionYoutubeUrl(scene.youtubeUrl)
      : { ok: true as const, value: null };
    if (!parsedUrl.ok) return fail(parsedUrl.error);
    const payload = {
      scene_number: sceneNumber + 1000,
      youtube_url: parsedUrl.value,
      start_seconds: scene.startSeconds,
      end_seconds: scene.endSeconds,
      question_start_position: scene.questionStartPosition,
      question_end_position: scene.questionEndPosition,
    };
    if (keepIds.has(scene.id)) {
      const { error } = await supabase
        .from("movie_talk_scenes")
        .update(payload)
        .eq("id", scene.id);
      if (error) {
        console.error("update movie talk scene failed:", error);
        return fail("No pude guardar una escena. Inténtalo de nuevo.");
      }
      continue;
    }
    const { error } = await supabase.from("movie_talk_scenes").insert({
      story_id: storyId,
      ...payload,
      ...(isUuid(scene.id) ? { id: scene.id } : {}),
    });
    if (error) {
      console.error("insert movie talk scene failed:", error);
      return fail("No pude agregar una escena. Inténtalo de nuevo.");
    }
  }

  const { data: saved } = await supabase
    .from("movie_talk_scenes")
    .select("id, scene_number")
    .eq("story_id", storyId)
    .order("scene_number", { ascending: true });
  for (const [index, row] of (saved ?? []).entries()) {
    const { error } = await supabase
      .from("movie_talk_scenes")
      .update({ scene_number: index + 1 })
      .eq("id", row.id);
    if (error) {
      console.error("renumber movie talk scene failed:", error);
      return fail("No pude ordenar las escenas. Inténtalo de nuevo.");
    }
  }

  const { error: storyError } = await supabase
    .from("stories")
    .update({
      body_text: bodyText,
      word_count: storyWordCount(bodyText),
      youtube_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storyId);
  if (storyError) {
    console.error("save movie talk transcript failed:", storyError);
    return fail("No pude guardar el diálogo. Inténtalo de nuevo.");
  }
  return { ok: true };
}

export type ParagraphInput = {
  id: string;
  spanishText: string;
  englishTranslation: string | null;
};

export async function saveVideoSummaryParagraphs(
  supabase: SupabaseClient,
  storyId: string,
  paragraphs: ParagraphInput[]
): Promise<EditorSaveResult> {
  const cleaned = paragraphs.map((row) => ({
    ...row,
    spanishText: row.spanishText.trim(),
    englishTranslation: row.englishTranslation?.trim() || null,
  }));
  if (cleaned.some((row) => !row.spanishText)) {
    return fail("Cada párrafo necesita el texto en español.");
  }

  const { data: existing } = await supabase
    .from("video_summary_paragraphs")
    .select("id, position")
    .eq("story_id", storyId);
  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const keepIds = new Set(
    cleaned.map((row) => row.id).filter((id) => existingIds.has(id))
  );
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("video_summary_paragraphs")
      .delete()
      .in("id", toDelete);
    if (error) {
      console.error("delete video paragraphs failed:", error);
      return fail("No pude borrar el párrafo. Inténtalo de nuevo.");
    }
  }

  const maxPosition = Math.max(
    0,
    ...((existing ?? []) as { position: number }[]).map((row) => row.position)
  );
  for (const [index, row] of cleaned.entries()) {
    const position = index + 1;
    if (keepIds.has(row.id)) {
      const { error } = await supabase
        .from("video_summary_paragraphs")
        .update({
          spanish_text: row.spanishText,
          english_translation: row.englishTranslation,
          position: position + 1000,
        })
        .eq("id", row.id);
      if (error) {
        console.error("update video paragraph failed:", error);
        return fail("No pude guardar un párrafo. Inténtalo de nuevo.");
      }
      continue;
    }
    const { error } = await supabase.from("video_summary_paragraphs").insert({
      story_id: storyId,
      spanish_text: row.spanishText,
      english_translation: row.englishTranslation,
      position: maxPosition + index + 1000,
      ...(isUuid(row.id) ? { id: row.id } : {}),
    });
    if (error) {
      console.error("insert video paragraph failed:", error);
      return fail("No pude agregar un párrafo. Inténtalo de nuevo.");
    }
  }

  const { data: saved } = await supabase
    .from("video_summary_paragraphs")
    .select("id")
    .eq("story_id", storyId)
    .order("position", { ascending: true });
  for (const [index, row] of (saved ?? []).entries()) {
    const { error } = await supabase
      .from("video_summary_paragraphs")
      .update({ position: index + 1 })
      .eq("id", row.id);
    if (error) {
      console.error("renumber video paragraph failed:", error);
      return fail("No pude ordenar los párrafos. Inténtalo de nuevo.");
    }
  }
  return { ok: true };
}

export async function loadWritingPromptForEdit(
  supabase: SupabaseClient,
  id: string
): Promise<WritingPrompt | null> {
  const { data, error } = await supabase
    .from("writing_prompts")
    .select(
      "id, title, prompt_text, writing_time_minutes, level, structure_lesson, rubric_text, example_paragraph, created_by, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    promptText: data.prompt_text,
    writingTimeMinutes: data.writing_time_minutes,
    level: data.level as CourseLevel,
    structureLesson: data.structure_lesson,
    rubricText: data.rubric_text,
    exampleParagraph: data.example_paragraph,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

export async function saveWritingPrompt(
  supabase: SupabaseClient,
  id: string,
  fields: {
    title: string;
    promptText: string;
    writingTimeMinutes: number;
    structureLesson: string | null;
    rubricText: string | null;
    exampleParagraph: string | null;
  }
): Promise<EditorSaveResult> {
  const title = fields.title.trim();
  const promptText = fields.promptText.trim();
  if (!title) return fail("Ponle un título a la escritura.");
  if (title.length > 120) return fail("El título se pasó de 120 letras.");
  if (!promptText) return fail("Escribe la pregunta de escritura.");
  if (fields.writingTimeMinutes !== 10 && fields.writingTimeMinutes !== 20) {
    return fail("El tiempo es 10 o 20 minutos.");
  }
  const { error } = await supabase
    .from("writing_prompts")
    .update({
      title,
      prompt_text: promptText,
      writing_time_minutes: fields.writingTimeMinutes,
      structure_lesson: fields.structureLesson?.trim() || null,
      rubric_text: fields.rubricText?.trim() || null,
      example_paragraph: fields.exampleParagraph?.trim() || null,
    })
    .eq("id", id);
  if (error) {
    console.error("saveWritingPrompt failed:", error);
    return fail("No pude guardar. Inténtalo de nuevo.");
  }
  return { ok: true };
}

export type ExamForEdit = {
  id: string;
  title: string;
  level: CourseLevel;
  theme: string | null;
  task2Type: ExamTask2Type;
  timeLimitMinutes: number;
  vocabRaw: string;
  task1Raw: string;
  task2Raw: string;
  task3Raw: string;
  task1Title: string;
  task1Instructions: string;
  task2Title: string;
  task2Instructions: string;
  task3Title: string;
  task3Instructions: string;
  storedCounts: ExamItemCounts;
};

export type ExamClassSessionOption = {
  id: string;
  label: string;
};

function courseNameFromJoin(join: unknown): string | null {
  if (!join) return null;
  const row = Array.isArray(join) ? join[0] : join;
  if (!row || typeof row !== "object") return null;
  const name = (row as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function listExamPromptSessions(
  supabase: SupabaseClient,
  promptId: string
): Promise<ExamClassSessionOption[]> {
  const { data, error } = await supabase
    .from("course_sessions")
    .select("id, session_date, session_start_time, courses ( name )")
    .eq("exam_prompt_id", promptId)
    .order("session_date", { ascending: false });
  if (error) {
    console.error("listExamPromptSessions failed:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const date = String(row.session_date ?? "").trim();
    const group = courseNameFromJoin(row.courses);
    return {
      id: String(row.id),
      label: group ? `${date} · ${group}` : date || String(row.id),
    };
  });
}

export async function loadExamPromptForEdit(
  supabase: SupabaseClient,
  id: string
): Promise<ExamForEdit | null> {
  const { data, error } = await supabase
    .from("exam_prompts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ExamPromptRow;
  const mapped = mapExamPromptRow(row);
  const copy = defaultExamTaskCopy(mapped.task2Type);
  const task2Raw =
    mapped.task2Type === "paragraph_restructuring"
      ? serializeParagraphRestructuring(mapped.paragraphRestructuring ?? [])
      : serializeSentenceCorrection(mapped.sentenceCorrection ?? []);
  return {
    id: mapped.id,
    title: mapped.title,
    level: mapped.level,
    theme: mapped.theme,
    task2Type: mapped.task2Type,
    timeLimitMinutes: mapped.timeLimitMinutes,
    vocabRaw: serializeVocabList(mapped.vocabularyList),
    task1Raw: serializeFillInTranslation(mapped.fillInTranslation),
    task2Raw,
    task3Raw: serializeTranslationSentences(mapped.translationSentences),
    task1Title: mapped.task1Title ?? copy.task1Title,
    task1Instructions: mapped.task1Instructions ?? copy.task1Instructions,
    task2Title: mapped.task2Title ?? copy.task2Title,
    task2Instructions: mapped.task2Instructions ?? copy.task2Instructions,
    task3Title: mapped.task3Title ?? copy.task3Title,
    task3Instructions: mapped.task3Instructions ?? copy.task3Instructions,
    storedCounts: examItemCounts(mapped),
  };
}

export async function copyExamClassAnswersToRaw(
  supabase: SupabaseClient,
  promptId: string,
  sessionId: string,
  teacherId: string
): Promise<
  | { ok: true; task1Raw: string; task2Raw: string; task3Raw: string }
  | { ok: false; error: string }
> {
  const failCopy = (error: string) => ({ ok: false as const, error });
  const loaded = await loadExamPromptForEdit(supabase, promptId);
  if (!loaded) return failCopy("No encontré ese examen.");

  const { data: session } = await supabase
    .from("course_sessions")
    .select("id, exam_prompt_id, exam_class_answers, course_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.exam_prompt_id !== promptId) {
    return failCopy("No encontré esa clase.");
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", session.course_id)
    .maybeSingle();
  if (!course || course.teacher_id !== teacherId) {
    return failCopy("Esa clase no es tuya.");
  }

  const parsed = parseExamForm({
    title: loaded.title,
    theme: loaded.theme ?? "",
    vocabRaw: loaded.vocabRaw,
    task1Raw: loaded.task1Raw,
    task2Type: loaded.task2Type,
    task2Raw: loaded.task2Raw,
    task3Raw: loaded.task3Raw,
    timeLimitMinutes: loaded.timeLimitMinutes,
  });
  if (parsed.error) return failCopy(parsed.error);

  const mapped = applyExamClassAnswersToPrompt(
    {
      id: loaded.id,
      title: parsed.title,
      level: loaded.level,
      theme: parsed.theme,
      vocabularyList: parsed.vocabularyList,
      fillInTranslation: parsed.fillInTranslation,
      task2Type: parsed.task2Type,
      paragraphRestructuring: parsed.paragraphRestructuring,
      sentenceCorrection: parsed.sentenceCorrection,
      translationSentences: parsed.translationSentences,
      timeLimitMinutes: parsed.timeLimitMinutes,
      task1Title: loaded.task1Title,
      task1Instructions: loaded.task1Instructions,
      task2Title: loaded.task2Title,
      task2Instructions: loaded.task2Instructions,
      task3Title: loaded.task3Title,
      task3Instructions: loaded.task3Instructions,
      createdBy: teacherId,
      createdAt: new Date().toISOString(),
    },
    parseExamClassAnswers(session.exam_class_answers)
  );

  const task2Raw =
    loaded.task2Type === "paragraph_restructuring"
      ? serializeParagraphRestructuring(parsed.paragraphRestructuring ?? [])
      : serializeSentenceCorrection(mapped.sentenceCorrection ?? []);

  return {
    ok: true,
    task1Raw: serializeFillInTranslation(mapped.fillInTranslation),
    task2Raw,
    task3Raw: serializeTranslationSentences(mapped.translationSentences),
  };
}

export async function saveExamPrompt(
  supabase: SupabaseClient,
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
  const loaded = await loadExamPromptForEdit(supabase, id);
  if (!loaded) return fail("No encontré ese examen.");

  const parsed = parseExamForm({
    title: fields.title,
    theme: fields.theme,
    vocabRaw: fields.vocabRaw,
    task1Raw: fields.task1Raw,
    task2Type: fields.task2Type,
    task2Raw: fields.task2Raw,
    task3Raw: fields.task3Raw,
    timeLimitMinutes: fields.timeLimitMinutes,
  });
  if (parsed.error) return fail(parsed.error);

  const nextCounts = examItemCounts(parsed);
  if (examCountsDropped(loaded.storedCounts, nextCounts)) {
    return fail(
      "Se perdieron ítems al parsear. Revisa el texto (vocabulario, huecos o oraciones) antes de guardar."
    );
  }

  const { error } = await supabase
    .from("exam_prompts")
    .update({
      title: parsed.title,
      theme: parsed.theme,
      vocabulary_list: parsed.vocabularyList,
      fill_in_translation: parsed.fillInTranslation,
      task2_type: parsed.task2Type,
      paragraph_restructuring: parsed.paragraphRestructuring,
      sentence_correction: parsed.sentenceCorrection,
      translation_sentences: parsed.translationSentences,
      time_limit_minutes: parsed.timeLimitMinutes,
      task1_title: fields.task1Title.trim() || null,
      task1_instructions: fields.task1Instructions.trim() || null,
      task2_title: fields.task2Title.trim() || null,
      task2_instructions: fields.task2Instructions.trim() || null,
      task3_title: fields.task3Title.trim() || null,
      task3_instructions: fields.task3Instructions.trim() || null,
    })
    .eq("id", id);
  if (error) {
    console.error("saveExamPrompt failed:", error);
    return fail("No pude guardar el examen. Inténtalo de nuevo.");
  }
  const preview = [
    `Vocabulario: ${nextCounts.vocab}`,
    `Tarea 1 huecos: ${nextCounts.fillSlots}`,
    `Tarea 2: ${nextCounts.task2}`,
    `Tarea 3: ${nextCounts.task3}`,
  ].join(" · ");
  return { ok: true, preview };
}

export type PresentationForEdit = {
  id: string;
  title: string;
  theme: string | null;
  warmupQuestion: string | null;
  segments: PresentationSegment[];
  responseCount: number;
};

export async function loadPresentationForEdit(
  supabase: SupabaseClient,
  id: string
): Promise<PresentationForEdit | null> {
  const { data, error } = await supabase
    .from("presentation_prompts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const mapped = mapPresentationPromptRow(data as PresentationPromptRow);
  const { count } = await supabase
    .from("presentation_responses")
    .select("id", { count: "exact", head: true })
    .eq("presentation_prompt_id", id);
  return {
    id: mapped.id,
    title: mapped.title,
    theme: mapped.theme,
    warmupQuestion: mapped.warmupQuestion,
    segments: mapped.segments,
    responseCount: count ?? 0,
  };
}

export async function savePresentationPrompt(
  supabase: SupabaseClient,
  id: string,
  fields: {
    title: string;
    theme: string | null;
    warmupQuestion: string | null;
    segments: PresentationSegment[];
  }
): Promise<EditorSaveResult> {
  const title = fields.title.trim();
  if (!title) return fail("Ponle un título a la presentación.");
  if (fields.segments.length < 1) {
    return fail("Necesito al menos un segmento.");
  }
  const normalized: PresentationSegment[] = [];
  for (const [index, segment] of fields.segments.entries()) {
    const parsed = parseSessionYoutubeUrl(segment.youtubeUrl);
    if (!parsed.ok || !parsed.value) {
      return fail(`Segmento ${index + 1}: pega un link de YouTube.`);
    }
    if (
      segment.comprehensionQuestions.some(
        (q) => !q.question.trim() || !q.answer.trim()
      )
    ) {
      return fail(
        `Segmento ${index + 1}: cada pregunta necesita pregunta y respuesta.`
      );
    }
    normalized.push({
      ...segment,
      youtubeUrl: parsed.value,
      vocabulary: segment.vocabulary.filter(
        (item) => item.english.trim() && item.spanish.trim()
      ),
      comprehensionQuestions: segment.comprehensionQuestions.filter(
        (item) => item.question.trim() && item.answer.trim()
      ),
    });
  }
  const segments = serializePresentationSegments(normalized);
  const { error } = await supabase
    .from("presentation_prompts")
    .update({
      title,
      theme: fields.theme?.trim() || null,
      warmup_question: fields.warmupQuestion?.trim() || null,
      segments,
    })
    .eq("id", id);
  if (error) {
    console.error("savePresentationPrompt failed:", error);
    return fail("No pude guardar la presentación. Inténtalo de nuevo.");
  }
  return { ok: true };
}

export type ConversationForEdit = {
  id: string;
  title: string;
  theme: string | null;
  level: CourseLevel;
  questions: ConversationQuestion[];
};

export async function loadConversationForEdit(
  supabase: SupabaseClient,
  id: string
): Promise<ConversationForEdit | null> {
  const { data, error } = await supabase
    .from("conversation_prompts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const mapped = mapConversationPromptRow(data as ConversationPromptRow);
  return {
    id: mapped.id,
    title: mapped.title,
    theme: mapped.theme,
    level: mapped.level,
    questions: mapped.questions,
  };
}

export async function saveConversationPrompt(
  supabase: SupabaseClient,
  id: string,
  fields: {
    title: string;
    theme: string | null;
    questions: ConversationQuestion[];
  }
): Promise<EditorSaveResult> {
  const title = fields.title.trim();
  if (!title) return fail("Ponle un título a la conversación.");
  const questions = fields.questions
    .map((row) => ({ id: row.id, question: row.question.trim() }))
    .filter((row) => row.question);
  if (questions.length < 3 || questions.length > 6) {
    return fail("La conversación lleva de 3 a 6 preguntas.");
  }
  const { error } = await supabase
    .from("conversation_prompts")
    .update({
      title,
      theme: fields.theme?.trim() || null,
      questions: serializeConversationQuestions(questions),
    })
    .eq("id", id);
  if (error) {
    console.error("saveConversationPrompt failed:", error);
    return fail("No pude guardar. Inténtalo de nuevo.");
  }
  return { ok: true };
}

export const CONTENT_KIND_FILTERS: { id: ContentKind | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  ...STORY_KINDS.map((kind) => ({
    id: kind as ContentKind,
    label: contentKindLabel(kind),
  })),
  { id: "writing", label: "Escritura" },
  { id: "exam", label: "Examen" },
  { id: "presentation", label: "Presentación" },
  { id: "conversation", label: "Conversación" },
];

export const CONTENT_LEVEL_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "beginner", label: "Principiante" },
  { id: "pre-intermediate", label: "Pre-intermedio" },
  { id: "intermediate", label: "Intermedio" },
];

export type { StoryKind, StoryLevel };
