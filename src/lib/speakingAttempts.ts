import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { convertToWavPcm16kMono } from "@/lib/pronunciation/audioConvert";
import type { SpeakingAggregate } from "@/lib/pronunciation/aggregatePatterns";
import type { SpokenWord } from "@/lib/pronunciation/aggregatePhonemes";
import { spokenWordsFromAzureJson } from "@/lib/pronunciation/azureUnscripted";
import {
  MAX_AUDIO_SECONDS,
  MAX_SPEAKING_AUDIO_BYTES,
  MIN_AUDIO_SECONDS,
  SPEAKING_DAILY_CAP,
  SPEAKING_PROMPT_ID,
  SPEAKING_STUCK_MS,
} from "@/lib/pronunciation/speakingFeedbackConfig";
import {
  FeedbackCardSchema,
  remainingAttempts,
  startOfMexicoCityDay,
  type FeedbackCard,
} from "@/lib/speakingFeedback";
import { analyzeSpeakingWav } from "@/lib/speakingFeedbackRun";

const BUCKET = "speaking-attempts";

export type SpeakingAttemptStatus = "processing" | "done" | "failed";

export type SpeakingAttemptView = {
  id: string;
  createdAt: string;
  durationS: number | null;
  playbackUrl: string | null;
  feedback: FeedbackCard | null;
  aggregate: SpeakingAggregate | null;
  status: SpeakingAttemptStatus;
  errorMessage: string | null;
  isReference: boolean;
  mine: boolean;
};

type AttemptRow = {
  id: string;
  user_id: string;
  prompt_id: string;
  created_at: string;
  duration_s: number | null;
  audio_path: string | null;
  aggregate: unknown;
  final_feedback: unknown;
  azure_raw?: unknown;
  status: string | null;
  error_message: string | null;
  is_reference: boolean | null;
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

function readAggregate(value: unknown, include: boolean): SpeakingAggregate | null {
  if (!include || !value || typeof value !== "object") return null;
  const row = value as SpeakingAggregate;
  if (!Array.isArray(row.patterns) || !Array.isArray(row.mangledWords)) return null;
  return row;
}

function readStatus(value: string | null, feedback: FeedbackCard | null): SpeakingAttemptStatus {
  if (value === "processing" || value === "done" || value === "failed") return value;
  return feedback ? "done" : "failed";
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
  viewerId: string,
  includeAggregate: boolean
): Promise<SpeakingAttemptView> {
  const feedback = readFeedback(row.final_feedback);
  return {
    id: row.id,
    createdAt: row.created_at,
    durationS: row.duration_s,
    playbackUrl: await playbackUrl(admin, row.audio_path),
    feedback,
    aggregate: readAggregate(row.aggregate, includeAggregate),
    status: readStatus(row.status, feedback),
    errorMessage: row.error_message,
    isReference: row.is_reference === true,
    mine: row.user_id === viewerId,
  };
}

const ATTEMPT_COLUMNS =
  "id, user_id, prompt_id, created_at, duration_s, audio_path, aggregate, final_feedback, status, error_message, is_reference";

export async function countCompletedToday(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const start = startOfMexicoCityDay(new Date()).toISOString();
  const { count, error } = await admin
    .from("speaking_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "done")
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
    .select(ATTEMPT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!input.owner) query = query.eq("user_id", input.userId);

  const { data, error } = await query;
  if (error) {
    throw new AppError("No pude abrir los intentos.", "ATTEMPT_LIST", 500);
  }

  const rows = (data ?? []) as AttemptRow[];
  return Promise.all(rows.map((row) => toView(admin, row, input.userId, input.owner)));
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
): Promise<{ attemptId: string; remaining: number | null }> {
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
  const id = randomUUID();
  const audioPath = `${input.userId}/${id}.${extension}`;

  const { error: insertError } = await admin.from("speaking_attempts").insert({
    id,
    user_id: input.userId,
    prompt_id: SPEAKING_PROMPT_ID,
    audio_path: audioPath,
    duration_s: Math.round(input.durationS * 10) / 10,
    status: "processing",
  });

  if (insertError) {
    throw new AppError("No pude guardar el intento.", "ATTEMPT_INSERT", 500);
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(audioPath, input.audio, {
      contentType: contentTypeFor(extension),
      upsert: false,
    });

  if (uploadError) {
    await admin.from("speaking_attempts").delete().eq("id", id);
    throw new AppError("No pude guardar el audio.", "AUDIO_UPLOAD", 500);
  }

  return {
    attemptId: id,
    remaining: remainingAttempts(completed, owner),
  };
}

const FAILED_COPY = "No pude revisar ese audio. Intenta de nuevo.";
const STUCK_COPY = "Tardó demasiado. Intenta de nuevo.";

async function loadReferenceWords(
  admin: SupabaseClient,
  promptId: string,
  attemptId: string
): Promise<SpokenWord[] | null> {
  const { data, error } = await admin
    .from("speaking_attempts")
    .select("azure_raw")
    .eq("prompt_id", promptId)
    .eq("is_reference", true)
    .neq("id", attemptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.azure_raw) return null;
  const words = spokenWordsFromAzureJson(data.azure_raw);
  return words.length > 0 ? words : null;
}

async function markFailed(
  admin: SupabaseClient,
  attemptId: string,
  message: string
): Promise<void> {
  await admin
    .from("speaking_attempts")
    .update({ status: "failed", error_message: message })
    .eq("id", attemptId)
    .eq("status", "processing");
}

export async function runSpeakingAttempt(
  admin: SupabaseClient,
  attemptId: string
): Promise<void> {
  const { data, error } = await admin
    .from("speaking_attempts")
    .select("id, prompt_id, audio_path, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (error || !data?.audio_path) {
    console.error("speaking run missing row:", attemptId);
    return;
  }
  if (data.status === "done") return;

  const extension = data.audio_path.split(".").pop() ?? "webm";
  const downloaded = await admin.storage.from(BUCKET).download(data.audio_path);
  if (downloaded.error || !downloaded.data) {
    await markFailed(admin, attemptId, FAILED_COPY);
    return;
  }

  let converted: Awaited<ReturnType<typeof convertToWavPcm16kMono>> | null = null;
  try {
    converted = await convertToWavPcm16kMono({
      inputBuffer: Buffer.from(await downloaded.data.arrayBuffer()),
      inputExtensionHint: extension,
    });
    const referenceWords = await loadReferenceWords(
      admin,
      data.prompt_id as string,
      attemptId
    );
    const analysis = await analyzeSpeakingWav(converted.wavPath, referenceWords);
    const { error: updateError } = await admin
      .from("speaking_attempts")
      .update({
        status: "done",
        error_message: null,
        azure_raw: analysis.azureRaw,
        aggregate: analysis.aggregate,
        agent_outputs: analysis.agents,
        final_feedback: analysis.card,
      })
      .eq("id", attemptId);

    if (updateError) {
      await markFailed(admin, attemptId, FAILED_COPY);
    }
  } catch (runError) {
    console.error(
      "speaking analysis failed:",
      runError instanceof Error ? runError.message : "unknown"
    );
    const message =
      runError instanceof AppError && runError.statusCode < 500
        ? runError.message
        : FAILED_COPY;
    await markFailed(admin, attemptId, message);
  } finally {
    await converted?.cleanup();
  }
}

export async function getSpeakingAttempt(
  admin: SupabaseClient,
  input: { attemptId: string; userId: string; owner: boolean }
): Promise<SpeakingAttemptView | null> {
  let query = admin
    .from("speaking_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", input.attemptId);
  if (!input.owner) query = query.eq("user_id", input.userId);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const row = data as AttemptRow;
  const age = Date.now() - new Date(row.created_at).getTime();
  if (row.status === "processing" && age > SPEAKING_STUCK_MS) {
    await markFailed(admin, row.id, STUCK_COPY);
    row.status = "failed";
    row.error_message = STUCK_COPY;
  }

  return toView(admin, row, input.userId, input.owner);
}

export async function markSpeakingReference(
  admin: SupabaseClient,
  input: { userId: string; attemptId: string }
): Promise<void> {
  const { data, error } = await admin
    .from("speaking_attempts")
    .select("id, user_id, prompt_id, status")
    .eq("id", input.attemptId)
    .maybeSingle();

  if (error || !data || data.user_id !== input.userId) {
    throw new AppError("No encontré ese intento.", "NOT_FOUND", 404);
  }
  if (data.status !== "done") {
    throw new AppError("Ese intento todavía no tiene nota.", "NOT_READY", 422);
  }

  const { error: clearError } = await admin
    .from("speaking_attempts")
    .update({ is_reference: false })
    .eq("prompt_id", data.prompt_id)
    .eq("is_reference", true);

  if (clearError) {
    throw new AppError("No pude guardar la referencia.", "REFERENCE", 500);
  }

  const { error: markError } = await admin
    .from("speaking_attempts")
    .update({ is_reference: true })
    .eq("id", input.attemptId);

  if (markError) {
    throw new AppError("No pude guardar la referencia.", "REFERENCE", 500);
  }
}
