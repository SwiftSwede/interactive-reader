/** PostHog project token (public). Wizard uses KEY; docs often use PROJECT_TOKEN. */
export function getPostHogProjectToken(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_KEY ??
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  );
}

export function getPostHogHost(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST;
}

export const postHogProjectTokenEnvHint =
  "NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";
