import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { readFileSync } from "node:fs";
import type {
  PhonemeEntry,
  WordBreakFeedback,
  WordCoaching,
} from "./types";

export type { PhonemeEntry, WordBreakFeedback, WordCoaching };

export type WordEntry = {
  word: string;
  accuracy: number;
  errorType?: string;
  phonemes: PhonemeEntry[];
  breakFeedback?: WordBreakFeedback;
  reasonCodes: string[];
  coaching?: WordCoaching;
};

export type NormalizedAssessment = {
  referenceText: string;
  recognizedText: string;
  overall: {
    accuracy: number;
    fluency: number;
    completeness: number;
    prosody?: number;
  };
  words: WordEntry[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}.`);
  return value;
}

function parseSpokenGuesses(raw: unknown): PhonemeEntry["nBestPhonemes"] {
  if (!Array.isArray(raw)) return undefined;
  const guesses = raw
    .map((item) => {
      const row = item as { Phoneme?: unknown; Score?: unknown };
      const phoneme = typeof row?.Phoneme === "string" ? row.Phoneme : "";
      const score = typeof row?.Score === "number" ? row.Score : 0;
      return { phoneme, score };
    })
    .filter((entry) => entry.phoneme.length > 0);
  return guesses.length > 0 ? guesses : undefined;
}

function parsePhonemes(phonemesArr: unknown): PhonemeEntry[] {
  if (!Array.isArray(phonemesArr)) return [];
  return phonemesArr
    .map((item) => {
      const row = item as {
        Phoneme?: unknown;
        PronunciationAssessment?: {
          AccuracyScore?: unknown;
          NBestPhonemes?: unknown;
        };
      };
      const phoneme = typeof row?.Phoneme === "string" ? row.Phoneme : "";
      const accuracy =
        typeof row?.PronunciationAssessment?.AccuracyScore === "number"
          ? row.PronunciationAssessment.AccuracyScore
          : 0;
      const nBestPhonemes = parseSpokenGuesses(
        row?.PronunciationAssessment?.NBestPhonemes
      );
      return {
        phoneme,
        accuracy,
        spokenPhoneme: nBestPhonemes?.[0]?.phoneme,
        nBestPhonemes,
      };
    })
    .filter((entry) => entry.phoneme.length > 0);
}

function parseRecognizedText(json: unknown, resultText: string): string {
  const obj = json as {
    Display?: unknown;
    NBest?: Array<{ Display?: unknown; DisplayText?: unknown }>;
  };
  const nBestDisplay = obj?.NBest?.[0]?.Display;
  const nBestDisplayText = obj?.NBest?.[0]?.DisplayText;
  const candidates = [
    resultText,
    typeof obj?.Display === "string" ? obj.Display : "",
    typeof nBestDisplay === "string" ? nBestDisplay : "",
    typeof nBestDisplayText === "string" ? nBestDisplayText : "",
  ];
  return (
    candidates
      .map((value) => value.trim())
      .find((value) => value.length > 0) ?? ""
  );
}

function parseBreakFeedback(word: unknown): WordBreakFeedback | undefined {
  const row = word as {
    PronunciationAssessment?: {
      Feedback?: {
        Prosody?: {
          Break?: {
            UnexpectedBreak?: { Confidence?: unknown };
            MissingBreak?: { Confidence?: unknown };
          };
        };
      };
    };
  };
  const feedback = row?.PronunciationAssessment?.Feedback?.Prosody?.Break;
  if (!feedback) return undefined;
  const unexpectedBreakConfidence =
    typeof feedback?.UnexpectedBreak?.Confidence === "number"
      ? feedback.UnexpectedBreak.Confidence
      : 0;
  const missingBreakConfidence =
    typeof feedback?.MissingBreak?.Confidence === "number"
      ? feedback.MissingBreak.Confidence
      : 0;
  if (unexpectedBreakConfidence === 0 && missingBreakConfidence === 0) {
    return undefined;
  }
  return { unexpectedBreakConfidence, missingBreakConfidence };
}

function parseAzureWordEntries(json: unknown): WordEntry[] {
  const obj = json as {
    NBest?: Array<{ Words?: unknown[] }>;
  };
  const words = obj?.NBest?.[0]?.Words;
  if (!Array.isArray(words)) return [];

  return words
    .map((item) => {
      const row = item as {
        Word?: unknown;
        AccuracyScore?: unknown;
        PronunciationAssessment?: {
          AccuracyScore?: unknown;
          ErrorType?: unknown;
        };
        Phonemes?: unknown;
      };
      const word = typeof row?.Word === "string" ? row.Word : "";
      const accuracy =
        typeof row?.PronunciationAssessment?.AccuracyScore === "number"
          ? row.PronunciationAssessment.AccuracyScore
          : typeof row?.AccuracyScore === "number"
            ? row.AccuracyScore
            : 0;
      const errorType =
        typeof row?.PronunciationAssessment?.ErrorType === "string"
          ? row.PronunciationAssessment.ErrorType
          : undefined;

      return {
        word,
        accuracy,
        errorType,
        phonemes: parsePhonemes(row?.Phonemes),
        breakFeedback: parseBreakFeedback(item),
        reasonCodes: [] as string[],
        coaching: undefined as WordCoaching | undefined,
      };
    })
    .filter((entry) => entry.word.trim().length > 0);
}

export async function assessPronunciationWithAzure(params: {
  wavPath: string;
  referenceText: string;
  locale: string;
}): Promise<NormalizedAssessment> {
  const key = getRequiredEnv("AZURE_SPEECH_KEY");
  const region = getRequiredEnv("AZURE_SPEECH_REGION");

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = params.locale;

  const wavBytes = readFileSync(params.wavPath);
  const audioConfig = sdk.AudioConfig.fromWavFileInput(wavBytes);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  const pronConfig = new sdk.PronunciationAssessmentConfig(
    params.referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true
  );
  pronConfig.phonemeAlphabet = "IPA";
  pronConfig.nbestPhonemeCount = 5;

  if (params.locale.startsWith("en-US")) {
    pronConfig.enableProsodyAssessment = true;
  }

  pronConfig.applyTo(recognizer);

  const result: sdk.SpeechRecognitionResult = await new Promise(
    (resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (recognized) => resolve(recognized),
        (err) => reject(err)
      );
    }
  );

  recognizer.close();

  if (
    result.reason !== sdk.ResultReason.RecognizedSpeech &&
    result.reason !== sdk.ResultReason.NoMatch
  ) {
    const details = sdk.CancellationDetails.fromResult(result);
    throw new Error(
      `Azure recognition failed: ${details?.reason ?? "Unknown"} ${details?.errorDetails ?? ""}`.trim()
    );
  }

  const assessment = sdk.PronunciationAssessmentResult.fromResult(result);
  const overall: NormalizedAssessment["overall"] = {
    accuracy: assessment.accuracyScore ?? 0,
    fluency: assessment.fluencyScore ?? 0,
    completeness: assessment.completenessScore ?? 0,
  };

  const prosodyScore = (
    assessment as sdk.PronunciationAssessmentResult & { prosodyScore?: number }
  ).prosodyScore;
  if (typeof prosodyScore === "number") {
    overall.prosody = prosodyScore;
  }

  const jsonStr = result.properties.getProperty(
    sdk.PropertyId.SpeechServiceResponse_JsonResult
  );
  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(jsonStr);
  } catch {
    parsedJson = null;
  }

  const words = parsedJson ? parseAzureWordEntries(parsedJson) : [];
  const recognizedText = parseRecognizedText(parsedJson, result.text ?? "");

  return {
    referenceText: params.referenceText,
    recognizedText,
    overall,
    words,
  };
}
