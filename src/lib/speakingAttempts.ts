import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { convertToWavPcm16kMono } from "@/lib/pronunciation/audioConvert";
import type { PhonemeAggregate } from "@/lib/pronunciation/aggregatePhonemes";
import {
  MAX_AUDIO_SECONDS,
  MAX_SPEAKING_AUDIO_BYTES,
  MIN_AUDIO_SECONDS,
  SPEAKING_DAILY_CAP,
  SPEAKING_PROMPT_ID,
} from "@/lib/pronunciation/speakingFeedbackConfig";
import {
  FeedbackCardSchema,
  remainingAttempts,
  startOfMexicoCityDay,
  type FeedbackCard,
} from "@/lib/speakingFeedback";
import { analyzeSpeakingWav } from "@/lib/speakingFeedbackRun";

const BUCKET = "speaking-attempts";

export type SpeakingAttemptView = {
  id: string;
  createdAt: string;
  durationS: number | null;
  playbackUrl: string | null;
  feedback: FeedbackCard | null;
  aggregate: PhonemeAggregate | null;
};

type AttemptRow = {
  id: string;
  user_id: string;
  created_at: string;
  duration_s: number | null;
  audio_path: string | null;
  aggregate: unknown;
  final_feedback: unknown;
};

function extensionFor(type: string, filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (type.includes("wav")) return "wav";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

function contentTypeFor(extension: string): string {
  if (extension === "wav") return "audio/wav";
  if (extension === "mp4" || extension === "m4a") return "audio/mp4";
  if (extension === "mp3") return "audio/mpeg";
  return "audio/webm";
}

function readFeedback(value: unknown): FeedbackCard | null {
  const parsed = FeedbackCardSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function readAggregate(value: unknown, include: boolean): PhonemeAggregate | null {
  if (!include || !value || typeof value !== "object") return null;
  const row = value as PhonemeAggregate;
  if (!Array.isArray(row.patterns) || !Array.isArray(row.mangledWords)) return null;
  return row;
}

async function playbackUrl(
  admin: SupabaseClient,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function toView(
  admin: SupabaseClient,
  row: AttemptRow,
  includeAggregate: boolean
): Promise<SpeakingAttemptView> {
  return {
    id: row.id,
    createdAt: row.created_at,
    durationS: row.duration_s,
    playbackUrl: await playbackUrl(admin, row.audio_path),
    feedback: readFeedback(row.final_feedback),
    aggregate: readAggregate(row.aggregate, includeAggregate),
  };
}

export async function countCompletedToday(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const start = startOfMexicoCityDay(new Date()).toISOString();
  const { count, error } = await admin
    .from("speaking_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("final_feedback", "is", null)
    .gte("created_at", start);

  if (error) {
    throw new AppError("No pude revisar tus intentos.", "ATTEMPT_COUNT", 500);
  }
  return count ?? 0;
}

export async function listSpeakingAttempts(
  admin: SupabaseClient,
  input: { userId: string; owner: boolean }
): Promise<SpeakingAttemptView[]> {
  let query = admin
    .from("speaking_attempts")
    .select("id, user_id, created_at, duration_s, audio_path, aggregate, final_feedback")
    .order("created_at", { ascending: false })
    .limit(40);

  if (!input.owner) query = query.eq("user_id", input.userId);

  const { data, error } = await query;
  if (error) {
    throw new AppError("No pude abrir los intentos.", "ATTEMPT_LIST", 500);
  }

  const rows = (data ?? []) as AttemptRow[];
  return Promise.all(rows.map((row) => toView(admin, row, input.owner)));
}

export async function submitSpeakingAttempt(
  admin: SupabaseClient,
  input: {
    userId: string;
    owner: boolean;
    audio: Buffer;
    filename: string;
    contentType: string;
    durationS: number;
  }
): Promise<{ attempt: SpeakingAttemptView; remaining: number | null }> {
  if (!Number.isFinite(input.durationS)) {
    throw new AppError("No recibí la duración.", "BAD_DURATION", 400);
  }
  if (input.durationS < MIN_AUDIO_SECONDS) {
    throw new AppError(
      "Muy corto. Cuéntame un poco más e intenta otra vez.",
      "TOO_SHORT",
      422
    );
  }
  if (input.durationS > MAX_AUDIO_SECONDS + 2) {
    throw new AppError("Ese audio se pasó del límite.", "TOO_LONG", 422);
  }
  if (input.audio.length === 0 || input.audio.length > MAX_SPEAKING_AUDIO_BYTES) {
    throw new AppError("No pude usar ese audio.", "BAD_AUDIO", 400);
  }

  const owner = input.owner;
  const completed = await countCompletedToday(admin, input.userId);
  if (!owner && completed >= SPEAKING_DAILY_CAP) {
    throw new AppError(
      "Ya usaste los intentos de hoy. Mañana puedes volver.",
      "DAILY_CAP",
      429
    );
  }

  const extension = extensionFor(input.contentType, input.filename);
  let converted: Awaited<ReturnType<typeof convertToWavPcm16kMono>>;
  try {
    converted = await convertToWavPcm16kMono({
      inputBuffer: input.audio,
      inputExtensionHint: extension,
    });
  } catch (error) {
    console.error("speaking ffmpeg failed:", error instanceof Error ? error.message : "unknown");
    throw new AppError(
      "No pude leer ese audio. Intenta de nuevo.",
      "FFMPEG_FAILED",
      422
    );
  }

  const id = randomUUID();
  const audioPath = `${input.userId}/${id}.${extension}`;

  const { error: insertError } = await admin.from("speaking_attempts").insert({
    id,
    user_id: input.userId,
    prompt_id: SPEAKING_PROMPT_ID,
    audio_path: audioPath,
    duration_s: Math.round(input.durationS * 10) / 10,
  });

  if (insertError) {
    await converted.cleanup();
    throw new AppError("No pude guardar el intento.", "ATTEMPT_INSERT", 500);
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(audioPath, input.audio, {
      contentType: contentTypeFor(extension),
      upsert: false,
    });

  if (uploadError) {
    await converted.cleanup();
    await admin.from("speaking_attempts").delete().eq("id", id);
    throw new AppError("No pude guardar el audio.", "AUDIO_UPLOAD", 500);
  }

  try {
    const analysis = await analyzeSpeakingWav(converted.wavPath);
    const { error: updateError } = await admin
      .from("speaking_attempts")
      .update({
        azure_raw: analysis.azureRaw,
        aggregate: analysis.aggregate,
        agent_outputs: analysis.agents,
        final_feedback: analysis.card,
      })
      .eq("id", id);

    if (updateError) {
      throw new AppError("No pude guardar la nota.", "ATTEMPT_UPDATE", 500);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(
      "speaking analysis failed:",
      error instanceof Error ? error.message : "unknown"
    );
    throw new AppError("No pude revisar el audio. Intenta de nuevo.", "ANALYSIS", 502);
  } finally {
    await converted.cleanup();
  }

  const { data, error } = await admin
    .from("speaking_attempts")
    .select("id, user_id, created_at, duration_s, audio_path, aggregate, final_feedback")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new AppError("Guardé el audio, pero no pude mostrarte la nota.", "ATTEMPT_READ", 500);
  }

  const nextCompleted = owner ? completed : completed + 1;
  return {
    attempt: await toView(admin, data as AttemptRow, owner),
    remaining: remainingAttempts(nextCompleted, owner),
  };
}
