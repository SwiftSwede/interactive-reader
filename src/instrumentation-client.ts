import posthog from "posthog-js";
import {
  getPostHogHost,
  getPostHogProjectToken,
  postHogProjectTokenEnvHint,
} from "@/lib/posthog-public-env";

const posthogKey = getPostHogProjectToken();
const posthogHost = getPostHogHost();

if (!posthogKey || !posthogHost) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !posthogKey
      ? postHogProjectTokenEnvHint
      : "NEXT_PUBLIC_POSTHOG_HOST";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
