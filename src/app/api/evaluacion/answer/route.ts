import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { evalCopy, evalEnv, evalErrorResponse, guestTokenHash } from "@/lib/evaluacion/http";
import { answerEvaluacion } from "@/lib/evaluacion/service";

const BodySchema = z.object({
  itemId: z.string().regex(/^[a-z0-9_]+\.[a-z0-9]+$/).max(80),
  optionId: z.string().regex(/^(no_se|o[0-9a-f]{8})$/),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: evalCopy.datos }, { status: 400 });
  }

  try {
    const tokenHash = await guestTokenHash();
    if (!tokenHash) {
      return NextResponse.json({ error: evalCopy.desorden }, { status: 404 });
    }
    const view = await answerEvaluacion(createAdminClient(), {
      tokenHash,
      itemId: parsed.data.itemId,
      optionId: parsed.data.optionId,
      env: evalEnv(),
    });
    return NextResponse.json({ view });
  } catch (error) {
    return evalErrorResponse(error, "POST /api/evaluacion/answer");
  }
}
