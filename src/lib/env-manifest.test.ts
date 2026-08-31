import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ENV_MANIFEST,
  checkEnv,
  formatEnvReport,
} from "./env-manifest";

function envWith(present: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of present) env[name] = "value";
  return env;
}

const ALL_NAMES = ENV_MANIFEST.map((spec) => spec.name);

test("a fully populated environment reports ok with nothing missing", () => {
  const result = checkEnv(envWith(ALL_NAMES));
  assert.equal(result.ok, true);
  assert.equal(result.missingRequired.length, 0);
  assert.equal(result.missingByFeature.size, 0);
});

test("an empty environment flags every required var and every feature", () => {
  const result = checkEnv({});
  assert.equal(result.ok, false);

  const requiredCount = ENV_MANIFEST.filter(
    (spec) => spec.severity === "required"
  ).length;
  assert.equal(result.missingRequired.length, requiredCount);

  const featureLabels = new Set(
    ENV_MANIFEST.filter((spec) => spec.severity === "feature").map(
      (spec) => spec.feature
    )
  );
  assert.equal(result.missingByFeature.size, featureLabels.size);
});

test("missing feature vars do not make the result not-ok", () => {
  const required = ENV_MANIFEST.filter(
    (spec) => spec.severity === "required"
  ).map((spec) => spec.name);
  const result = checkEnv(envWith(required));
  assert.equal(result.ok, true);
  assert.ok(result.missingByFeature.size > 0);
});

test("the Azure and Bunny regression is caught when those keys are absent", () => {
  // Reproduces the production incident: everything set except the three keys
  // that were never added to Vercel.
  const present = ALL_NAMES.filter(
    (name) =>
      name !== "AZURE_SPEECH_KEY" &&
      name !== "AZURE_SPEECH_REGION" &&
      name !== "NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID"
  );
  const result = checkEnv(envWith(present));

  // These are feature-level, so the app is still "ok".
  assert.equal(result.ok, true);

  const azure = result.missingByFeature.get("Pronunciation assessment (Azure)");
  assert.deepEqual(
    azure?.map((spec) => spec.name),
    ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"]
  );

  const bunny = result.missingByFeature.get(
    "Pronunciation videos (Bunny Stream)"
  );
  assert.deepEqual(
    bunny?.map((spec) => spec.name),
    ["NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID"]
  );
});

test("blank or whitespace-only values count as missing", () => {
  const env = envWith(ALL_NAMES);
  env.SUPABASE_SECRET_KEY = "   ";
  const result = checkEnv(env);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.missingRequired.map((spec) => spec.name),
    ["SUPABASE_SECRET_KEY"]
  );
});

test("the report notes that public vars need a redeploy", () => {
  const result = checkEnv(
    envWith(ALL_NAMES.filter((n) => n !== "NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID"))
  );
  const report = formatEnvReport(result);
  assert.match(report, /NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID/);
  assert.match(report, /inlined at build time/);
});
