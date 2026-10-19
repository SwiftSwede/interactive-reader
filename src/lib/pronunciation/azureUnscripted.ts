import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { readFileSync } from "node:fs";
import type { SpokenWord } from "./aggregatePhonemes";

export type UnscriptedAssessment = {
  transcript: string;
  words: SpokenWord[];
  rawSegments: unknown[];
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}.`);
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseWords(json: unknown): SpokenWord[] {
  const root = asRecord(json);
  const nBest = Array.isArray(root?.NBest) ? root.NBest : [];
  const first = asRecord(nBest[0]);
  const words = Array.isArray(first?.Words) ? first.Words : [];
  return words.flatMap((item) => {
    const row = asRecord(item);
    const word = typeof row?.Word === "string" ? row.Word.trim() : "";
    if (!word) return [];
    const assessment = asRecord(row?.PronunciationAssessment);
    const phonemes = Array.isArray(row?.Phonemes) ? row.Phonemes : [];
    return [
      {
        word,
        accuracy: numberField(assessment?.AccuracyScore),
        phonemes: phonemes.flatMap((phoneme) => {
          const phonemeRow = asRecord(phoneme);
          const symbol =
            typeof phonemeRow?.Phoneme === "string"
              ? phonemeRow.Phoneme.trim()
              : "";
          if (!symbol) return [];
          const phonemeAssessment = asRecord(phonemeRow?.PronunciationAssessment);
          return [
            {
              phoneme: symbol,
              accuracy: numberField(phonemeAssessment?.AccuracyScore),
            },
          ];
        }),
      },
    ];
  });
}

function parseTranscript(json: unknown, fallback: string): string {
  const root = asRecord(json);
  const nBest = Array.isArray(root?.NBest) ? root.NBest : [];
  const first = asRecord(nBest[0]);
  const display = typeof first?.Display === "string" ? first.Display.trim() : "";
  const lexical = typeof first?.Lexical === "string" ? first.Lexical.trim() : "";
  return display || fallback.trim() || lexical;
}

/**
 * Unscripted pronunciation assessment. Continuous mode, no reference text.
 * Sibling of azurePronunciation.ts. Do not fold this back into the scripted path.
 */
export async function assessUnscriptedPronunciation(params: {
  wavPath: string;
  locale?: string;
  timeoutMs?: number;
}): Promise<UnscriptedAssessment> {
  const key = requiredEnv("AZURE_SPEECH_KEY");
  const region = requiredEnv("AZURE_SPEECH_REGION");
  const locale = params.locale ?? "en-US";

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = locale;

  const wavBytes = readFileSync(params.wavPath);
  const audioConfig = sdk.AudioConfig.fromWavFileInput(wavBytes);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  const pronConfig = new sdk.PronunciationAssessmentConfig(
    "",
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    false
  );
  pronConfig.phonemeAlphabet = "IPA";
  pronConfig.nbestPhonemeCount = 5;
  if (locale.startsWith("en-US")) {
    pronConfig.enableProsodyAssessment = true;
  }
  pronConfig.applyTo(recognizer);

  const rawSegments: unknown[] = [];
  const words: SpokenWord[] = [];
  const transcriptParts: string[] = [];
  let failure = "";

  const timeoutMs = params.timeoutMs ?? 120_000;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        failure = "Azure unscripted assessment timed out.";
        recognizer.stopContinuousRecognitionAsync(
          () => resolve(),
          () => resolve()
        );
      }, timeoutMs);

      recognizer.recognized = (_sender, event) => {
        if (event.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
        const jsonText = event.result.properties.getProperty(
          sdk.PropertyId.SpeechServiceResponse_JsonResult
        );
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          parsed = null;
        }
        rawSegments.push(parsed);
        words.push(...parseWords(parsed));
        const line = parseTranscript(parsed, event.result.text ?? "");
        if (line) transcriptParts.push(line);
      };

      recognizer.canceled = (_sender, event) => {
        if (event.reason === sdk.CancellationReason.Error) {
          failure = event.errorDetails || "Azure canceled the assessment.";
        }
      };

      recognizer.sessionStopped = () => {
        clearTimeout(timer);
        recognizer.stopContinuousRecognitionAsync(
          () => resolve(),
          (error) => reject(error)
        );
      };

      recognizer.startContinuousRecognitionAsync(
        () => undefined,
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  } finally {
    recognizer.close();
  }

  if (failure && words.length === 0) {
    throw new Error(failure);
  }

  return {
    transcript: transcriptParts.join(" ").replace(/\s+/g, " ").trim(),
    words,
    rawSegments,
  };
}
