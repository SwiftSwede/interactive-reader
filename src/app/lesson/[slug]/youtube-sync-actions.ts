"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";

export type YoutubeSyncResult = { ok: true } | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const secondsSchema = z.number().min(0).max(86400);
const rateSchema = z.number().min(0.25).max(2);

export async function publishYoutubeSync(input: {
  sessionId: string;
  playing: boolean;
  seconds: number;
  rate: number;
}): Promise<YoutubeSyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Tienes que entrar con tu email." };
  }

  const profile = await getProfile(user.id);
  if (profile?.role !== "teacher") {
    return { ok: false, error: "Solo el profe mueve el video." };
  }

  const sessionId = uuidSchema.safeParse(input.sessionId);
  const seconds = secondsSchema.safeParse(input.seconds);
  const rate = rateSchema.safeParse(input.rate);
  if (!sessionId.success || !seconds.success || !rate.success) {
    return { ok: false, error: "No pude sincronizar el video." };
  }

  const { error } = await supabase
    .from("course_sessions")
    .update({
      video_playing: Boolean(input.playing),
      video_seconds: seconds.data,
      video_rate: rate.data,
      video_updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId.data);

  if (error) {
    console.error("publishYoutubeSync failed:", error);
    return { ok: false, error: "No pude sincronizar el video." };
  }

  return { ok: true };
}
