// Next.js requires this file at src/instrumentation.ts. The startup env check
// itself lives in scripts/check-env-startup.ts so all env tooling is in one place.

import { runStartupEnvCheck } from "../scripts/check-env-startup";

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  runStartupEnvCheck();
}
