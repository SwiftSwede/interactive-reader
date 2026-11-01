import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSpeakingAccess } from "@/lib/speakingAccess";
import { markSpeakingReference } from "@/lib/speakingAttempts";

export const runtime = "nodejs";

const BodySchema = z.object({
  attemptId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Necesitas entrar." }, { status: 401 });
    }
    const access = await getSpeakingAccess(user.id, user.email);
    if (!access.owner) {
      return NextResponse.json({ error: "No está disponible." }, { status: 404 });
    }
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }
    await markSpeakingReference(createAdminClient(), {
      userId: user.id,
      attemptId: parsed.data.attemptId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("speaking reference failed:", error);
    return NextResponse.json({ error: "Algo salió mal." }, { status: 500 });
  }
}
