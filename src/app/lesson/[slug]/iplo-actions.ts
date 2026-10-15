"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSelfPacedLessonGate } from "@/lib/library-access";
import { recordTopicEvidence } from "@/lib/topic-evidence";
import {
  calendarDateKey,
  parseAudioScript,
  promptRefs,
  resolveTimeZone,
  scoreAttempt,
} from "@/lib/iplo";

const attemptSchema = z.object({
  storyId: z.string().uuid(),
  timeZone: z.string().min(1).max(80),
  answers: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        given: z.string().max(500).optional(),
        skipped: z.boolean().optional(),
      })
    )
    .max(200),
});

export type IploAttemptResult =
  | { ok: true; closingLine: boolean }
  | { ok: false; blocked: true }
  | { ok: false; blocked?: false; error: string };

export async function completeIploAttempt(input: unknown): Promise<IploAttemptResult> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Algo salió mal. Intenta de nuevo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entra con tu email para guardar esta lección." };

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "teacher") return { ok: true, closingLine: false };

  const admin = createAdminClient();
  const { data: story, error: storyError } = await admin
    .from("stories")
    .select("id, kind, audio_script")
    .eq("id", parsed.data.storyId)
    .maybeSingle();
  if (storyError || !story || story.kind !== "audio_course") {
    return { ok: false, error: "No encontré esa lección." };
  }

  let gate: "skip" | "allow" | "denied" | "locked" = "skip";
  try {
    gate = await loadSelfPacedLessonGate({
      userId: user.id,
      storyId: story.id,
      isTeacher: false,
      sessionOk: false,
    });
  } catch (error) {
    console.error(
      "completeIploAttempt gate:",
      error instanceof Error ? error.message : error
    );
    return { ok: false, error: "Algo salió mal. Intenta de nuevo." };
  }
  if (gate === "denied" || gate === "locked") {
    return { ok: false, error: "Esta lección todavía no está abierta." };
  }

  const script = parseAudioScript(story.audio_script);
  if (!script) return { ok: false, error: "Esta lección todavía no tiene audio." };

  const zone = resolveTimeZone(parsed.data.timeZone);
  const today = calendarDateKey(zone, new Date());
  const { data: prior, error: priorError } = await admin
    .from("learning_events")
    .select("occurred_at, detail")
    .eq("user_id", user.id)
    .eq("event_type", "iplo_attempt")
    .order("occurred_at", { ascending: false })
    .limit(40);
  if (priorError) {
    console.error("completeIploAttempt prior:", priorError.message);
    return { ok: false, error: "Algo salió mal. Intenta de nuevo." };
  }
  const alreadyToday = (prior ?? []).some((row) => {
    const detail = row.detail as { story_id?: string } | null;
    if (detail?.story_id !== story.id) return false;
    return calendarDateKey(zone, new Date(row.occurred_at as string)) === today;
  });
  if (alreadyToday) return { ok: false, blocked: true };

  const prompts = promptRefs(script);
  const score = scoreAttempt(
    prompts,
    parsed.data.answers.map((answer) => ({
      index: answer.index,
      given: answer.given ?? "",
      skipped: answer.skipped === true || !(answer.given ?? "").trim(),
    }))
  );

  const { data: progress, error: progressError } = await admin
    .from("user_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("story_id", story.id)
    .maybeSingle();
  if (progressError) {
    console.error("completeIploAttempt progress:", progressError.message);
    return { ok: false, error: "Algo salió mal. Intenta de nuevo." };
  }
  const completedOnce = progress?.status === "completed";
  if (!completedOnce && !score.full) {
    return { ok: false, error: "Falta responder una pregunta." };
  }

  const { error: eventError } = await admin.from("learning_events").insert({
    user_id: user.id,
    event_type: "iplo_attempt",
    detail: {
      story_id: story.id,
      firstTryCorrect: score.firstTryCorrect,
      totalPrompts: score.totalPrompts,
      wrongPrompts: score.wrongPrompts,
      partial: !score.full,
      timeZone: zone,
    },
  });
  if (eventError) {
    console.error("completeIploAttempt event:", eventError.message);
    return { ok: false, error: "Algo salió mal. Intenta de nuevo." };
  }

  if (!completedOnce) {
    const { error: writeProgress } = await admin.from("user_progress").upsert(
      {
        user_id: user.id,
        story_id: story.id,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,story_id" }
    );
    if (writeProgress) {
      console.error("completeIploAttempt progress write:", writeProgress.message);
    }
  }

  if (score.full && (score.shouldFlag || score.shouldClear)) {
    let clearExisting = false;
    if (score.shouldClear) {
      const { data: existing } = await admin
        .from("user_topic_evidence")
        .select("status")
        .eq("user_id", user.id)
        .eq("tag_type", "grammar")
        .eq("tag_id", script.grammarTagId)
        .maybeSingle();
      clearExisting = existing?.status === "needs_more_practice";
    }
    if (score.shouldFlag || clearExisting) {
      try {
        await recordTopicEvidence(admin, {
          userId: user.id,
          sourceType: "iplo_course",
          sourceId: story.id,
          evidenceDetail: {
            firstTryCorrect: score.firstTryCorrect,
            totalPrompts: score.totalPrompts,
          },
          writes: [
            {
              tagType: "grammar",
              tagId: script.grammarTagId,
              status: score.shouldFlag ? "needs_more_practice" : "practiced",
            },
          ],
        });
      } catch (error) {
        console.error(
          "completeIploAttempt evidence:",
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  const { data: lesson } = await admin
    .from("course_lessons")
    .select("position")
    .eq("story_id", story.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ok: true, closingLine: lesson?.position === 23 };
}
