import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { convertToWavPcm16kMono } from "@/lib/pronunciation/audioConvert";
import { assessPronunciationWithAzure } from "@/lib/pronunciation/azurePronunciation";
import { applySpanishCoaching } from "@/lib/pronunciation/spanishCoachRules";
import { analyzeConnectedSpeech } from "@/lib/pronunciation/connectedSpeechHeuristics";
import { getOverride } from "@/lib/pronunciation/coachingTips";
import { mapAssessmentPhonemes } from "@/lib/pronunciation/azure-ipa";
import {
  focusIpaForIssue,
  isActionableIssue,
} from "@/lib/pronunciation/focus-sound";
import {
  allowAssessment,
  clientIp,
  hashRateLimitKey,
} from "@/lib/pronunciation/rateLimit";
import type { PronunciationAssessmentResponse } from "@/lib/pronunciation/types";
import { azureReferenceText } from "@/lib/pronunciation/referenceText";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

const FieldsSchema = z.object({
  referenceText: z.string().trim().min(1).max(500),
  locale: z.string().trim().min(2).max(16).optional(),
});

function audioExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("mp4")) return "mp4";
  if (file.type.includes("mpeg")) return "mp3";
  if (file.type.includes("wav")) return "wav";
  return "webm";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const skipRateLimit = process.env.NODE_ENV === "development";
    if (!skipRateLimit) {
      const ipKey = hashRateLimitKey(`ip:${clientIp(request)}`);
      const keys = user ? [ipKey, hashRateLimitKey(`user:${user.id}`)] : [ipKey];
      if (!allowAssessment(keys)) {
        return NextResponse.json(
          { error: "Has intentado muchas veces hoy. Vuelve manana." },
          { status: 429 }
        );
      }
    }

    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      return NextResponse.json(
        { error: "Todavia no puedo revisar pronunciacion. Intenta mas tarde." },
        { status: 503 }
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });
    }

    const parsed = FieldsSchema.safeParse({
      referenceText: form.get("referenceText"),
      locale: form.get("locale") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });
    }

    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { error: "No recibi el audio. Graba otra vez." },
        { status: 400 }
      );
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Esa grabacion es muy larga. Intenta de nuevo con una mas corta." },
        { status: 400 }
      );
    }

    const locale = parsed.data.locale ?? "en-US";
    const buffer = Buffer.from(await audio.arrayBuffer());
    const { wavPath, cleanup } = await convertToWavPcm16kMono({
      inputBuffer: buffer,
      inputExtensionHint: audioExtension(audio),
    });

    try {
      const assessment = await assessPronunciationWithAzure({
        wavPath,
        referenceText: azureReferenceText(parsed.data.referenceText),
        locale,
      });

      for (const word of assessment.words) {
        word.phonemes = mapAssessmentPhonemes(word.phonemes);
      }
      applySpanishCoaching(assessment.words);
      for (const word of assessment.words) {
        if (word.coaching && !isActionableIssue(word)) {
          word.coaching = undefined;
          word.reasonCodes = [];
        }
      }

      const connectedSpeechRaw = analyzeConnectedSpeech(assessment.words);
      const connectedSpeechIssues = connectedSpeechRaw.map((issue) => {
        const override = getOverride(
          issue.code,
          `${issue.leftWord} ${issue.rightWord}`
        );
        return {
          leftWord: issue.leftWord,
          rightWord: issue.rightWord,
          code: issue.code,
          coaching: override ?? issue.coaching,
        };
      });

      const wordsWithCoaching = assessment.words
        .filter((word) => word.coaching != null && isActionableIssue(word))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 2);

      const topIssues = wordsWithCoaching.map((word) => {
        const focusIpa = focusIpaForIssue(word.reasonCodes, word.phonemes);
        const focusPhonemes = focusIpa
          ? word.phonemes.filter((entry) => entry.phoneme === focusIpa)
          : word.phonemes;
        return {
          word: word.word,
          focusIpa,
          accuracy: word.accuracy,
          errorType: word.errorType,
          reasonCodes: word.reasonCodes,
          shortWhyEs: word.coaching!.shortWhyEs,
          tipEs: word.coaching!.tipEs,
          practiceEs: word.coaching!.practiceEs,
          phonemes: focusPhonemes.length > 0 ? focusPhonemes : word.phonemes,
        };
      });

      const body: PronunciationAssessmentResponse = {
        referenceText: assessment.referenceText,
        recognizedText: assessment.recognizedText,
        overall: assessment.overall,
        words: assessment.words.map((word) => ({
          word: word.word,
          accuracy: word.accuracy,
          errorType: word.errorType,
          reasonCodes: word.reasonCodes,
          coaching: word.coaching ?? null,
          phonemes: word.phonemes,
          breakFeedback: word.breakFeedback ?? null,
        })),
        topIssues,
        connectedSpeechIssues,
      };

      return NextResponse.json(body);
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("assess failed:", error);
    return NextResponse.json(
      { error: "Algo salio mal. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
