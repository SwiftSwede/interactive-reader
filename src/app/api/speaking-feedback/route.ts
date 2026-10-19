import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSpeakingAccess } from "@/lib/speakingAccess";
import { submitSpeakingAttempt } from "@/lib/speakingAttempts";

export const runtime = "nodejs";
export const maxDuration = 300;

async function viewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("Necesitas entrar.", "UNAUTHORIZED", 401);
  }
  const access = await getSpeakingAccess(user.id, user.email);
  if (!access.allowed) {
    throw new AppError("No está disponible.", "FORBIDDEN", 404);
  }
  return { user, owner: access.owner };
}

function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  console.error("speaking-feedback failed:", error);
  return NextResponse.json(
    { error: "Algo salió mal. Intenta de nuevo.", code: "UNEXPECTED" },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const { user, owner } = await viewer();
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Pedido inválido.", code: "BAD_FORM" },
        { status: 400 }
      );
    }

    const audio = form.get("audio");
    const durationRaw = form.get("durationS");
    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "No recibí el audio.", code: "NO_AUDIO" },
        { status: 400 }
      );
    }

    const durationS = typeof durationRaw === "string" ? Number(durationRaw) : NaN;
    const result = await submitSpeakingAttempt(createAdminClient(), {
      userId: user.id,
      owner,
      audio: Buffer.from(await audio.arrayBuffer()),
      filename: audio.name || "audio.webm",
      contentType: audio.type || "audio/webm",
      durationS,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
