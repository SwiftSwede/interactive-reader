import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSpeakingJob } from "@/lib/speakingJob";
import { runSpeakingAttempt } from "@/lib/speakingAttempts";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  attemptId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    assertSpeakingJob(request);
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }
    await runSpeakingAttempt(createAdminClient(), parsed.data.attemptId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("speaking run failed:", error);
    return NextResponse.json({ error: "Algo salió mal." }, { status: 500 });
  }
}
