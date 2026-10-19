import { z } from "zod";
import { AppError } from "@/lib/errors";
import { aggregatePhonemePatterns } from "@/lib/pronunciation/aggregatePhonemes";
import { assessUnscriptedPronunciation } from "@/lib/pronunciation/azureUnscripted";
import {
  FeedbackCardSchema,
  GrammarAgentSchema,
  PronunciationAgentSchema,
  VocabularyAgentSchema,
  clampFeedbackCard,
  grammarPrompt,
  pronunciationPrompt,
  synthesizerPrompt,
  vocabularyPrompt,
  type AgentOutputs,
  type FeedbackCard,
} from "@/lib/speakingFeedback";
import type { PhonemeAggregate } from "@/lib/pronunciation/aggregatePhonemes";

const MODEL = "openai/gpt-4o-mini";

function parseModelJson(content: string): unknown {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

async function completeJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AppError(
      "Todavía no puedo revisar esto.",
      "OPENROUTER_MISSING",
      503
    );
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You return one JSON object. No markdown. No scores. No em dashes.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new AppError(
      "No pude armar la nota. Intenta de nuevo.",
      "OPENROUTER_FAILED",
      502
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError(
      "No pude armar la nota. Intenta de nuevo.",
      "OPENROUTER_EMPTY",
      502
    );
  }

  try {
    return parseModelJson(content);
  } catch {
    throw new AppError(
      "No pude armar la nota. Intenta de nuevo.",
      "OPENROUTER_JSON",
      502
    );
  }
}

async function specialist<T>(
  prompt: string,
  schema: z.ZodType<T>,
  code: string
): Promise<T> {
  const parsed = schema.safeParse(await completeJson(prompt));
  if (!parsed.success) {
    throw new AppError(
      "No pude armar la nota. Intenta de nuevo.",
      code,
      502
    );
  }
  return parsed.data;
}

export async function runSpeakingAgents(input: {
  transcript: string;
  aggregate: PhonemeAggregate;
}): Promise<{ agents: AgentOutputs; card: FeedbackCard }> {
  const [grammar, vocabulary, pronunciation] = await Promise.all([
    specialist(grammarPrompt(input.transcript), GrammarAgentSchema, "GRAMMAR_AGENT"),
    specialist(
      vocabularyPrompt(input.transcript),
      VocabularyAgentSchema,
      "VOCAB_AGENT"
    ),
    specialist(
      pronunciationPrompt(input.transcript, input.aggregate),
      PronunciationAgentSchema,
      "PRON_AGENT"
    ),
  ]);

  const agents = { grammar, vocabulary, pronunciation };
  const drafted = FeedbackCardSchema.safeParse(
    await completeJson(synthesizerPrompt({ transcript: input.transcript, ...agents }))
  );
  if (!drafted.success) {
    throw new AppError(
      "No pude armar la nota. Intenta de nuevo.",
      "SYNTH_AGENT",
      502
    );
  }

  return {
    agents,
    card: clampFeedbackCard(
      drafted.data,
      agents,
      input.transcript,
      input.aggregate
    ),
  };
}

export async function analyzeSpeakingWav(wavPath: string): Promise<{
  transcript: string;
  aggregate: PhonemeAggregate;
  agents: AgentOutputs;
  card: FeedbackCard;
  azureRaw: unknown[];
}> {
  const assessment = await assessUnscriptedPronunciation({ wavPath });
  if (!assessment.transcript || assessment.words.length === 0) {
    throw new AppError(
      "No escuché palabras. Graba otra vez, un poco más cerca del micrófono.",
      "NO_SPEECH",
      422
    );
  }

  const phonemeCount = assessment.words.reduce(
    (total, word) => total + word.phonemes.length,
    0
  );
  if (phonemeCount === 0) {
    throw new AppError(
      "Azure no devolvió sonidos. Hay que parar y revisar la región.",
      "NO_PHONEMES",
      502
    );
  }

  const aggregate = aggregatePhonemePatterns(assessment.words);
  const { agents, card } = await runSpeakingAgents({
    transcript: assessment.transcript,
    aggregate,
  });

  return {
    transcript: assessment.transcript,
    aggregate,
    agents,
    card,
    azureRaw: assessment.rawSegments,
  };
}
