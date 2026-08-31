// Apply schema-phase4a.sql then schema-phase4b.sql via the Supabase SQL API.
//
//   npx tsx scripts/apply-phase4-schema.ts
//
// Needs DATABASE_URL or SUPABASE_DB_URL in .env.local (the Postgres URI from
// the Supabase dashboard, not the REST URL). Falls back to printing the files
// to run in the SQL Editor.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const FILES = ["schema-phase4a.sql", "schema-phase4b.sql"];

function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL
  );
}

function main() {
  const url = databaseUrl();
  const sqlDir = join("supabase");

  if (!url) {
    console.error(
      "No DATABASE_URL / SUPABASE_DB_URL. Run these in the SQL Editor:"
    );
    for (const file of FILES) {
      console.error(`  supabase/${file}`);
    }
    process.exit(1);
  }

  for (const file of FILES) {
    const path = join(sqlDir, file);
    const sql = readFileSync(path, "utf8");
    console.log(`Applying ${file}...`);
    const result = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-f", path], {
      encoding: "utf8",
    });

    if (result.error || result.status !== 0) {
      // psql missing: try node-postgres-less fallback via a one-shot python.
      console.error(result.stderr || result.error?.message || "psql failed");
      console.error(`Run ${path} in the SQL Editor. (${sql.length} chars)`);
      process.exit(1);
    }

    if (result.stdout.trim()) console.log(result.stdout.trim());
    console.log(`  ${file} applied`);
  }
}

main();
