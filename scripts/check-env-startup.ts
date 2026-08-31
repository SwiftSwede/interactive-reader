// Server startup environment check. Next.js calls src/instrumentation.ts once
// when a server instance boots; that file delegates here.
//
// Intentionally non-fatal: crashing the whole server because one optional
// feature key is absent would take the site down over a video embed. Missing
// REQUIRED vars log at error level; missing feature vars log at warn.

import { checkEnv, formatEnvReport } from "./env-manifest";

export function runStartupEnvCheck(): void {
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
