// Checks environment variables against the manifest and prints a grouped
// report. Run it before a deploy, or wire it into CI:
//
//   npm run check-env
//
// Exits non-zero only when a REQUIRED var is missing, so it can gate a deploy
// without blocking on optional feature keys. Missing feature keys print as
// warnings and still exit 0.
//
// Locally it reads .env.local. On Vercel/CI the real environment is already
// populated, so the dotenv load is a harmless no-op.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { checkEnv, formatEnvReport } from "../src/lib/env-manifest";

const result = checkEnv();

if (result.missingRequired.length === 0 && result.missingByFeature.size === 0) {
  console.log("[env-check] All expected environment variables are present.");
  process.exit(0);
}

console.log(formatEnvReport(result));

if (result.missingRequired.length > 0) {
  console.error(
    `\n[env-check] ${result.missingRequired.length} required variable(s) missing. Failing.`
  );
  process.exit(1);
}

process.exit(0);
