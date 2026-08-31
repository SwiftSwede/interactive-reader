// Single source of truth for the environment variables the app expects.
//
// Three consumers read this manifest:
//   - scripts/check-env-startup.ts runs at server boot (via src/instrumentation.ts)
//     and logs a grouped report, so a missing key shows up in Vercel runtime logs
//     instead of when a student taps a feature.
//   - scripts/check-env.ts runs the same check before a deploy and exits non-zero
//     when a REQUIRED var is missing.
//
// When you add a new env var to the app, add it here too. That is the whole
// point: the manifest is what turns "someone forgot to set it on Vercel" into
// a loud, early signal.

export type EnvSeverity = "required" | "feature";

export type EnvVarSpec = {
  name: string;
  severity: EnvSeverity;
  /** Human-readable feature this var powers. Groups the report. */
  feature: string;
  /**
   * NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
   * setting them on Vercel only takes effect after a fresh deploy.
   */
  publicVar?: boolean;
};

// Order here is the order the report prints in.
export const ENV_MANIFEST: EnvVarSpec[] = [
  // Core: without these the app cannot serve authenticated pages at all.
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    severity: "required",
    feature: "Supabase (database + auth)",
    publicVar: true,
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    severity: "required",
    feature: "Supabase (database + auth)",
    publicVar: true,
  },
  {
    name: "SUPABASE_SECRET_KEY",
    severity: "required",
    feature: "Supabase (database + auth)",
  },

  // Feature groups: a missing var disables that feature but the app still runs.
  {
    name: "STRIPE_SECRET_KEY",
    severity: "feature",
    feature: "Payments (Stripe checkout + webhooks)",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    severity: "feature",
    feature: "Payments (Stripe checkout + webhooks)",
  },
  {
    name: "STRIPE_PRICE_PRE_INTERMEDIATE",
    severity: "feature",
    feature: "Payments (Stripe checkout + webhooks)",
  },
  {
    name: "STRIPE_PRICE_INTERMEDIATE",
    severity: "feature",
    feature: "Payments (Stripe checkout + webhooks)",
  },
  {
    name: "OPENROUTER_API_KEY",
    severity: "feature",
    feature: "AI answer and writing feedback",
  },
  {
    name: "AZURE_SPEECH_KEY",
    severity: "feature",
    feature: "Pronunciation assessment (Azure)",
  },
  {
    name: "AZURE_SPEECH_REGION",
    severity: "feature",
    feature: "Pronunciation assessment (Azure)",
  },
  {
    name: "NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID",
    severity: "feature",
    feature: "Pronunciation videos (Bunny Stream)",
    publicVar: true,
  },
  {
    name: "TEACHER_EMAILS",
    severity: "feature",
    feature: "Teacher access",
  },
];

export type EnvCheckResult = {
  /** True when every REQUIRED var is present. Feature vars do not affect this. */
  ok: boolean;
  missingRequired: EnvVarSpec[];
  /** Missing feature vars, grouped by feature label, in manifest order. */
  missingByFeature: Map<string, EnvVarSpec[]>;
};

function isPresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function checkEnv(
  env: Record<string, string | undefined> = process.env
): EnvCheckResult {
  const missingRequired: EnvVarSpec[] = [];
  const missingByFeature = new Map<string, EnvVarSpec[]>();

  for (const spec of ENV_MANIFEST) {
    if (isPresent(env[spec.name])) continue;

    if (spec.severity === "required") {
      missingRequired.push(spec);
      continue;
    }

    const group = missingByFeature.get(spec.feature) ?? [];
    group.push(spec);
    missingByFeature.set(spec.feature, group);
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingByFeature,
  };
}

const PUBLIC_NOTE = "public, inlined at build time: redeploy after setting";

export function formatEnvReport(result: EnvCheckResult): string {
  const lines: string[] = ["[env-check] Missing environment variables:"];

  if (result.missingRequired.length > 0) {
    lines.push("", "  REQUIRED (app will not work correctly):");
    for (const spec of result.missingRequired) {
      const note = spec.publicVar ? `  (${PUBLIC_NOTE})` : "";
      lines.push(`    - ${spec.name}${note}`);
    }
  }

  for (const [feature, specs] of result.missingByFeature) {
    lines.push("", `  Feature disabled: ${feature}`);
    for (const spec of specs) {
      const note = spec.publicVar ? `  (${PUBLIC_NOTE})` : "";
      lines.push(`    - ${spec.name}${note}`);
    }
  }

  lines.push(
    "",
    "  Set these in Vercel (Settings > Environment Variables) and redeploy."
  );

  return lines.join("\n");
}
