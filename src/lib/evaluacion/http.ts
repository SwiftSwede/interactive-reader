import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { clientIp } from "@/lib/pronunciation/rateLimit";
import { getSupabaseSecretKey } from "@/lib/supabase/keys";
import { evaluacionConfig } from "./config";
import type { EvalEnv } from "./service";
import { hashGuestToken, hashIp, isGuestToken } from "./token";

export const evalCopy = {
  datos: "Revisa tu respuesta e intenta de nuevo.",
  limite: "Has empezado muchas veces seguidas. Intenta de nuevo en un rato.",
  noLista: "La evaluación no está lista todavía. Vuelve pronto.",
  desorden: "Algo se desordenó. Recarga la página para seguir donde ibas.",
  error: "Algo salió mal. Intenta de nuevo.",
} as const;

export function evalEnv(): EvalEnv {
  return { nodeEnv: process.env.NODE_ENV, includeDrafts: process.env.EVAL_INCLUDE_DRAFTS };
}

export async function readGuestToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(evaluacionConfig.cookieName)?.value;
  return isGuestToken(value) ? value : null;
}

export async function guestTokenHash(): Promise<string | null> {
  const token = await readGuestToken();
  return token ? hashGuestToken(token) : null;
}

export function attachGuestToken(response: NextResponse, token: string): NextResponse {
  response.cookies.set(evaluacionConfig.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: evaluacionConfig.cookieMaxAgeSeconds,
  });
  return response;
}

export function requestIpHash(request: Request): string | null {
  const ip = clientIp(request);
  const key = getSupabaseSecretKey();
  if (ip === "unknown" || !key) return null;
  return hashIp(ip, key);
}

export function evalErrorResponse(error: unknown, route: string): NextResponse {
  if (error instanceof AppError) {
    const status = error.statusCode;
    const message =
      status === 429
        ? evalCopy.limite
        : status === 503
          ? evalCopy.noLista
          : status === 404 || status === 409
            ? evalCopy.desorden
            : status === 422
              ? evalCopy.datos
              : evalCopy.error;
    if (status >= 500 && status !== 503) console.error(`${route}:`, error.code, error.message);
    return NextResponse.json({ error: message, code: error.code }, { status });
  }
  console.error(`Unexpected error in ${route}:`, error instanceof Error ? error.message : "unknown");
  return NextResponse.json({ error: evalCopy.error }, { status: 500 });
}
