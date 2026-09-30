import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth-server";
import { submitDrillAttempt } from "@/lib/drill-attempt";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  itemId: z.string().uuid(),
  answer: z.string().max(500),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Entra con tu email para guardar la práctica." },
        { status: 401 },
      );
    }

    const profile = await getProfile(user.id);
    if (!profile || profile.role === "teacher") {
      return NextResponse.json(
        { error: "La vista de estudiante no guarda práctica." },
        { status: 403 },
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const result = await submitDrillAttempt({
      client: supabase,
      adminClient: createAdminClient(),
      userId: user.id,
      itemId: parsed.data.itemId,
      answer: parsed.data.answer,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError && error.statusCode < 500) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("drills/attempt failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Algo salió mal. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
