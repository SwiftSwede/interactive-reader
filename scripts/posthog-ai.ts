import { randomUUID } from "crypto";
import { config } from "dotenv";
import { PostHog } from "posthog-node";

config({ path: ".env.local", override: true });

const posthogKey =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if ((!posthogKey || !posthogHost) && process.env.NODE_ENV === "development") {
  const missingVariable = posthogKey
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : "NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
  );
}

const posthog =
  posthogKey && posthogHost
    ? new PostHog(posthogKey, {
        host: posthogHost,
        flushAt: 1,
        flushInterval: 0,
        privacyMode: false,
        enableExceptionAutocapture: true,
      })
    : null;

const aiSessionId = randomUUID();

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type CaptureOpenRouterGenerationOptions = {
  spanName: string;
  model: string;
  messages: ChatMessage[];
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  temperature: number;
  maxTokens: number;
  latencySeconds: number;
};

export async function captureOpenRouterGeneration({
  spanName,
  model,
  messages,
  content,
  usage,
  temperature,
  maxTokens,
  latencySeconds,
}: CaptureOpenRouterGenerationOptions) {
  if (!posthog) return;

  const traceId = randomUUID();
  posthog.capture({
    // These local content tools have no authenticated app user. The process-run
    // session id keeps the event anonymous and prevents a person profile.
    distinctId: aiSessionId,
    event: "$ai_generation",
    properties: {
      $process_person_profile: false,
      $ai_trace_id: traceId,
      $ai_session_id: aiSessionId,
      $ai_span_id: randomUUID(),
      $ai_span_name: spanName,
      $ai_model: model,
      $ai_provider: "openrouter",
      $ai_input: messages,
      $ai_input_tokens: usage?.prompt_tokens,
      $ai_output_choices: [{ role: "assistant", content }],
      $ai_output_tokens: usage?.completion_tokens,
      $ai_latency: latencySeconds,
      $ai_temperature: temperature,
      $ai_max_tokens: maxTokens,
    },
  });

  await posthog.flush();
}

export async function shutdownPosthogAi() {
  await posthog?.shutdown();
}
