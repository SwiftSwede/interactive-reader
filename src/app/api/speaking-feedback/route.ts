import { after, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getAppOrigin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSpeakingAccess } from "@/lib/speakingAccess";
import { speakingJobSecret } from "@/lib/speakingJob";
import { getSpeakingAttempt, submitSpeakingAttempt } from "@/lib/speakingAttempts";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  try {
    const { user, owner } = await viewer();
    const attemptId = new URL(request.url).searchParams.get("attemptId") ?? "";
    if (!attemptId) {
      return NextResponse.json(
        { error: "Pedido inválido.", code: "BAD_QUERY" },
        { status: 400 }
      );
    }
    const attempt = await getSpeakingAttempt(createAdminClient(), {
      attemptId,
      userId: user.id,
      owner,
    });
    if (!attempt) {
      return NextResponse.json(
        { error: "No encontré ese intento.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json({ attempt });
  } catch (error) {
    return errorResponse(error);
  }
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

    const origin = await getAppOrigin();
    const secret = speakingJobSecret();
    after(() => {
      void fetch(`${origin}/api/speaking-feedback/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-speaking-job": secret,
        },
        body: JSON.stringify({ attemptId: result.attemptId }),
      }).catch((error: unknown) => {
        console.error(
          "speaking run kick failed:",
          error instanceof Error ? error.message : "unknown"
        );
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
