import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { registerWorkshopLead } from "@/lib/workshop/mailerlite";
import { workshopLevels, type WorkshopLevelId } from "@/lib/workshop/levels";

const levelIds = workshopLevels.map((level) => level.id) as [
  WorkshopLevelId,
  ...WorkshopLevelId[],
];

const BodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  level: z.enum(levelIds),
  website: z.string().max(200).optional(),
});

const copy = {
  datos: "Revisa tu nombre, tu email y tu nivel.",
  espera: "La inscripción no está lista todavía. Intenta de nuevo en un rato.",
  error: "No pude guardar tu cupo. Intenta de nuevo.",
} as const;

type Aviso = keyof typeof copy;

function wantsRedirect(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  return !type.includes("application/json");
}

function fail(request: Request, aviso: Aviso, status: number) {
  if (wantsRedirect(request)) {
    const url = new URL("/workshop", request.url);
    url.searchParams.set("aviso", aviso);
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.json({ error: copy[aviso] }, { status });
}

function succeed(request: Request) {
  if (wantsRedirect(request)) {
    return NextResponse.redirect(new URL("/workshop/gracias", request.url), 303);
  }
  return NextResponse.json({ ok: true });
}

async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return request.json();
  }
  const form = await request.formData();
  const website = String(form.get("website") ?? "");
  return {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    level: String(form.get("level") ?? ""),
    website: website || undefined,
  };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await readBody(request);
  } catch {
    return fail(request, "datos", 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return fail(request, "datos", 400);
  }

  if (parsed.data.website) {
    return succeed(request);
  }

  const token = process.env.MAILERLITE_API_TOKEN?.trim();
  const groupId = process.env.MAILERLITE_GROUP_ID?.trim();
  if (!token || !groupId) {
    return fail(request, "espera", 503);
  }

  try {
    await registerWorkshopLead(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        level: parsed.data.level,
      },
      { fetch, token, groupId },
    );
    return succeed(request);
  } catch (error) {
    if (error instanceof AppError) {
      const aviso: Aviso = error.statusCode >= 500 ? "error" : "datos";
      if (wantsRedirect(request)) {
        return fail(request, aviso, error.statusCode);
      }
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(
      "Unexpected error in POST /api/workshop/register:",
      error instanceof Error ? error.message : "unknown",
    );
    return fail(request, "error", 500);
  }
}
