// Next.js requires this file at src/instrumentation.ts. The startup env check
// itself lives in scripts/check-env-startup.ts so all env tooling is in one place.

import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import {
  getPostHogHost,
  getPostHogProjectToken,
  postHogProjectTokenEnvHint,
} from "@/lib/posthog-public-env";
import { runStartupEnvCheck } from "../scripts/check-env-startup";

const posthogKey = getPostHogProjectToken();
const posthogHost = getPostHogHost();

// This provider is intentionally not global: only log records emitted through
// src/lib/posthog-logs.ts leave the application for PostHog.
export const posthogLogProvider =
  posthogKey && posthogHost
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "interactive-reader" }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: new URL("/i/v1/logs", posthogHost).toString(),
              headers: {
                Authorization: `Bearer ${posthogKey}`,
                "Content-Type": "application/json",
              },
            }),
          }),
        ],
      })
    : null;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.NODE_ENV === "development") {
    if (!posthogKey) {
      throw new Error(
        `${postHogProjectTokenEnvHint} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once a project token env var is configured`,
      );
    }
    if (!posthogHost) {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
      );
    }
  }

  runStartupEnvCheck();
}
