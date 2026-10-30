import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evalEnv, evalErrorResponse, guestTokenHash } from "@/lib/evaluacion/http";
import { getEvaluacionView } from "@/lib/evaluacion/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tokenHash = await guestTokenHash();
    const view = await getEvaluacionView(createAdminClient(), { tokenHash, env: evalEnv() });
    return NextResponse.json({ view }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return evalErrorResponse(error, "GET /api/evaluacion/state");
  }
}
