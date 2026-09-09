import type { SupabaseClient } from "@supabase/supabase-js";
import type { LyricBlank } from "@/types";
import { allLyricBlanksFilled, scoreBlank } from "@/lib/music";

export type SavedSongAttempt = {
  blankId: number;
  typedText: string;
  isCorrect: boolean | null;
  submittedAt: string | null;
};

type AttemptRow = {
  blank_id: number;
  typed_text: string | null;
  is_correct: boolean | null;
  submitted_at: string | null;
  user_id: string;
  updated_at: string;
};

export function mapAttemptRows(rows: AttemptRow[]): SavedSongAttempt[] {
  return rows.map((row) => ({
    blankId: row.blank_id,
    typedText: row.typed_text ?? "",
    isCorrect: row.is_correct,
    submittedAt: row.submitted_at,
  }));
}

export type SongBlankStat = {
  blankId: number;
  prompt: string;
  answer: string;
  submitted: number;
  correct: number;
};

export type SongStudentScore = {
  userId: string;
  displayName: string;
  correct: number;
  total: number;
  submittedAt: string;
};

export function aggregateSongAnalytics(
  rows: AttemptRow[],
  blanks: LyricBlank[],
  namesByUser: Map<string, string>
): { blanks: SongBlankStat[]; students: SongStudentScore[] } {
  const submittedRows = rows.filter((row) => row.submitted_at);

  const blankStats: SongBlankStat[] = blanks.map((blank) => {
    const forBlank = submittedRows.filter((row) => row.blank_id === blank.id);
    return {
      blankId: blank.id,
      prompt: blank.prompt,
      answer: blank.answer,
      submitted: forBlank.length,
      correct: forBlank.filter((row) => row.is_correct === true).length,
    };
  });

  const byUser = new Map<string, AttemptRow[]>();
  for (const row of submittedRows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const total = blanks.length;
  const students: SongStudentScore[] = [];
  for (const [userId, list] of byUser) {
    const submittedAt = list
      .map((row) => row.submitted_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    if (!submittedAt) continue;
    students.push({
      userId,
      displayName: namesByUser.get(userId) ?? "Estudiante",
      correct: list.filter((row) => row.is_correct === true).length,
      total,
      submittedAt,
    });
  }
  students.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));

  return { blanks: blankStats, students };
}

export function scoreTypedBlanks(
  values: Record<number, string>,
  blanks: LyricBlank[]
): { blankId: number; typedText: string; isCorrect: boolean }[] {
  return blanks.map((blank) => {
    const typedText = values[blank.id] ?? "";
    return {
      blankId: blank.id,
      typedText,
      isCorrect: scoreBlank(typedText, blank.answer),
    };
  });
}

export async function loadOwnSongLyricAttempts(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<SavedSongAttempt[]> {
  const { data, error } = await supabase
    .from("song_lyric_attempts")
    .select("blank_id, typed_text, is_correct, submitted_at, user_id, updated_at")
    .eq("course_session_id", sessionId)
    .eq("user_id", userId);

  if (error || !data) return [];
  return mapAttemptRows(data as AttemptRow[]);
}

export async function getSongBlankAnalytics(
  supabase: SupabaseClient,
  sessionId: string,
  blanks: LyricBlank[]
): Promise<{ blanks: SongBlankStat[]; students: SongStudentScore[] }> {
  const { data: rows, error } = await supabase
    .from("song_lyric_attempts")
    .select("blank_id, typed_text, is_correct, submitted_at, user_id, updated_at")
    .eq("course_session_id", sessionId)
    .not("submitted_at", "is", null);

  if (error || !rows) {
    return { blanks: aggregateSongAnalytics([], blanks, new Map()).blanks, students: [] };
  }

  const userIds = [...new Set((rows as AttemptRow[]).map((row) => row.user_id))];
  const namesByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: session } = await supabase
      .from("course_sessions")
      .select("course_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (session?.course_id) {
      const { data: names } = await supabase
        .from("course_enrollments")
        .select("student_id, display_name")
        .eq("course_id", session.course_id)
        .in("student_id", userIds);
      for (const row of (names ?? []) as {
        student_id: string;
        display_name: string | null;
      }[]) {
        namesByUser.set(
          row.student_id,
          row.display_name?.trim() || "Estudiante"
        );
      }
    }
  }

  return aggregateSongAnalytics(rows as AttemptRow[], blanks, namesByUser);
}

export async function upsertSongLyricAttempt(
  supabase: SupabaseClient,
  input: {
    sessionId: string;
    userId: string;
    storyId: string;
    blankId: number;
    typedText: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from("song_lyric_attempts")
    .select("submitted_at")
    .eq("course_session_id", input.sessionId)
    .eq("user_id", input.userId)
    .eq("blank_id", input.blankId)
    .maybeSingle();

  if (existing && typeof existing.submitted_at === "string") {
    return { ok: false, error: "Ya entregaste tus respuestas." };
  }

  const { error } = await supabase.from("song_lyric_attempts").upsert(
    {
      course_session_id: input.sessionId,
      user_id: input.userId,
      story_id: input.storyId,
      blank_id: input.blankId,
      typed_text: input.typedText.slice(0, 200),
      is_correct: null,
      submitted_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "course_session_id,user_id,blank_id" }
  );

  if (error) {
    console.error("upsertSongLyricAttempt failed:", error);
    return { ok: false, error: "No pude guardar. Intenta de nuevo." };
  }
  return { ok: true };
}

export async function submitSongLyricWorksheet(
  supabase: SupabaseClient,
  input: {
    sessionId: string;
    userId: string;
    storyId: string;
    blanks: LyricBlank[];
    values: Record<number, string>;
  }
): Promise<
  { ok: true; attempts: SavedSongAttempt[] } | { ok: false; error: string }
> {
  const { data: existing } = await supabase
    .from("song_lyric_attempts")
    .select("submitted_at")
    .eq("course_session_id", input.sessionId)
    .eq("user_id", input.userId)
    .not("submitted_at", "is", null)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: false, error: "Ya entregaste tus respuestas." };
  }

  if (!allLyricBlanksFilled(input.values, input.blanks)) {
    return { ok: false, error: "Llena todos los huecos para entregar." };
  }

  const scored = scoreTypedBlanks(input.values, input.blanks);
  const submittedAt = new Date().toISOString();

  for (const item of scored) {
    const { error } = await supabase.from("song_lyric_attempts").upsert(
      {
        course_session_id: input.sessionId,
        user_id: input.userId,
        story_id: input.storyId,
        blank_id: item.blankId,
        typed_text: item.typedText.slice(0, 200),
        is_correct: item.isCorrect,
        submitted_at: submittedAt,
        updated_at: submittedAt,
      },
      { onConflict: "course_session_id,user_id,blank_id" }
    );
    if (error) {
      console.error("submitSongLyricWorksheet failed:", error);
      return { ok: false, error: "No pude entregar. Intenta de nuevo." };
    }
  }

  return {
    ok: true,
    attempts: scored.map((item) => ({
      blankId: item.blankId,
      typedText: item.typedText,
      isCorrect: item.isCorrect,
      submittedAt,
    })),
  };
}
