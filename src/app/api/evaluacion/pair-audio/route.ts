import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { evalErrorResponse, guestTokenHash } from "@/lib/evaluacion/http";
import { pairAudioPathFor } from "@/lib/evaluacion/service";

const ItemSchema = z.string().regex(/^pair\.[A-Za-z]+\.[0-9]+$/).max(60);

const pending = () =>
  NextResponse.json({ error: "Audio pendiente." }, { status: 404, headers: { "Cache-Control": "no-store" } });

/** Streams the played word so its file name never reaches the client. Missing file = 404. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = ItemSchema.safeParse(url.searchParams.get("item"));
  if (!parsed.success) return pending();

  try {
    const tokenHash = await guestTokenHash();
    if (!tokenHash) return pending();
    const path = await pairAudioPathFor(createAdminClient(), { tokenHash, itemId: parsed.data });
    if (!path) return pending();

    const file = await fetch(new URL(path, url.origin), { cache: "no-store" });
    if (!file.ok || !file.body) return pending();
    return new Response(file.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return evalErrorResponse(error, "GET /api/evaluacion/pair-audio");
  }
}
