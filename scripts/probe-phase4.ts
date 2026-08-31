import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const tables = [
    "grammar_tags",
    "vocabulary_tags",
    "phonetic_tags",
    "content_tags",
    "user_topic_evidence",
    "user_progress",
    "dictation_attempts",
    "pronunciation_attempts",
    "personal_responses",
  ];
  for (const table of tables) {
    const result = await admin.from(table).select("id").limit(3);
    console.log(
      `${table}: ${
        result.error
          ? result.error.message
          : `ok rows=${result.data?.length ?? 0}`
      }`
    );
  }
  const kind = await admin.from("stories").select("id, kind").limit(1);
  console.log(
    `stories.kind: ${kind.error ? kind.error.message : JSON.stringify(kind.data)}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
