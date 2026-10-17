import { SeverityNumber } from "@opentelemetry/api-logs";
import { after } from "next/server";
import { posthogLogProvider } from "@/instrumentation";

const logger = posthogLogProvider?.getLogger("interactive-reader.posthog-logs");

const severityNumbers = {
  INFO: SeverityNumber.INFO,
  ERROR: SeverityNumber.ERROR,
} as const;

type PosthogLogAttributes = Record<string, string | number | boolean>;

export function emitPosthogLog(
  body: string,
  severity: keyof typeof severityNumbers,
  attributes: PosthogLogAttributes,
) {
  logger?.emit({
    body,
    severityNumber: severityNumbers[severity],
    severityText: severity,
    attributes,
  });
}

export async function flushPosthogLogs() {
  await posthogLogProvider?.forceFlush();
}

/** Uses Next `after` in real requests; falls back when route handlers run in tests. */
export function schedulePosthogLogFlush() {
  try {
    after(flushPosthogLogs);
  } catch {
    void flushPosthogLogs();
  }
}
