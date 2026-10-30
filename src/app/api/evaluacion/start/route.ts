import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  attachGuestToken,
  evalCopy,
  evalEnv,
  evalErrorResponse,
  readGuestToken,
  requestIpHash,
} from "@/lib/evaluacion/http";
import { startEvaluacion } from "@/lib/evaluacion/service";
import { hashGuestToken, newGuestToken } from "@/lib/evaluacion/token";
import { OPENERS } from "@/lib/evaluacion/types";

const BodySchema = z.object({ opener: z.enum(OPENERS) });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: evalCopy.datos }, { status: 400 });
  }

  try {
    const existing = await readGuestToken();
    const token = existing ?? newGuestToken();
    const view = await startEvaluacion(createAdminClient(), {
      tokenHash: hashGuestToken(token),
      ipHash: requestIpHash(request),
      opener: parsed.data.opener,
      env: evalEnv(),
    });
    const response = NextResponse.json({ view });
    return existing ? response : attachGuestToken(response, token);
  } catch (error) {
    return evalErrorResponse(error, "POST /api/evaluacion/start");
  }
}
