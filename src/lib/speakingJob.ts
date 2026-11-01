import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

export function speakingJobSecret(): string {
  const material = process.env.SPEAKING_JOB_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!material) {
    throw new AppError("Todavía no puedo revisar esto.", "JOB_SECRET", 503);
  }
  return createHash("sha256").update(`speaking-job:${material}`).digest("hex");
}

export function assertSpeakingJob(request: Request): void {
  const got = request.headers.get("x-speaking-job") ?? "";
  const expected = speakingJobSecret();
  const left = Buffer.from(got);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new AppError("No está disponible.", "FORBIDDEN", 404);
  }
}
