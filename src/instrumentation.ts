// Next.js calls register() once when a server instance boots, before it serves
// any request. We use it to check environment variables against the manifest so
// a key that was never set on Vercel shows up in the runtime logs at startup,
// not when a student taps an IPA symbol or tries to pay.
//
// This is intentionally non-fatal. Crashing the whole server because one
// optional feature key is absent would take the site down over a video embed.
// Missing REQUIRED vars log at error level; missing feature vars log at warn.

import { checkEnv, formatEnvReport } from "@/lib/env-manifest";

export function register() {
  // Only meaningful in the Node.js server runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const result = checkEnv();
  if (result.missingRequired.length === 0 && result.missingByFeature.size === 0) {
    return;
  }

  const report = formatEnvReport(result);
  if (result.missingRequired.length > 0) {
    console.error(report);
  } else {
    console.warn(report);
  }
}
