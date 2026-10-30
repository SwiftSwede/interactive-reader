import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { mailerLiteEnabled } from "@/lib/evaluacion/config";
import { evalErrorResponse, guestTokenHash } from "@/lib/evaluacion/http";
import { captureEvaluacionEmail } from "@/lib/evaluacion/service";
import { normalizeEmail } from "@/lib/evaluacion/token";

const BodySchema = z.object({
  email: z.string().trim().email().max(200),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa tu email." }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true });

  try {
    const tokenHash = await guestTokenHash();
    if (!tokenHash) {
      return NextResponse.json({ error: "Termina la evaluación primero." }, { status: 404 });
    }
    await captureEvaluacionEmail(createAdminClient(), {
      tokenHash,
      email: normalizeEmail(parsed.data.email),
    });
    if (mailerLiteEnabled()) {
      console.info("evaluacion: MailerLite tagging is stubbed; email stored on the attempt only.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return evalErrorResponse(error, "POST /api/evaluacion/email");
  }
}
