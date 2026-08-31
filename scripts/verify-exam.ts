// Verify the seeded exam prompt.
//   npx tsx scripts/verify-exam.ts
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_prompts")
    .select(
      "id, title, level, theme, vocabulary_list, fill_in_translation, task2_type, paragraph_restructuring, sentence_correction, translation_sentences, time_limit_minutes"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Query error:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No exam prompts found in the database.");
    return;
  }

  for (const row of data) {
    console.log("========================================");
    console.log("Title:", row.title);
    console.log("Level:", row.level);
    console.log("Theme:", row.theme);
    console.log("Time limit:", row.time_limit_minutes, "min");
    console.log("Task2 type:", row.task2_type);
    console.log(
      "Vocab count:",
      row.vocabulary_list?.length ?? 0
    );
    console.log(
      "Task1 sentences:",
      row.fill_in_translation?.length ?? 0
    );
    console.log(
      "Task1 total slots:",
      (row.fill_in_translation ?? []).reduce(
        (n: number, s: { slots: unknown[] }) => n + s.slots.length,
        0
      )
    );
    const sc = row.sentence_correction;
    if (sc) {
      console.log("Task2 (sentence_correction):", sc.length);
      console.log(
        "  ok:",
        sc.filter((i: { isCorrect: boolean }) => i.isCorrect).length
      );
      console.log(
        "  fix:",
        sc.filter((i: { isCorrect: boolean }) => !i.isCorrect).length
      );
    }
    const pr = row.paragraph_restructuring;
    if (pr) {
      console.log("Task2 (paragraph_restructuring):", pr.length);
      console.log(
        "  positions:",
        pr.map((i: { correctPosition: string }) => i.correctPosition).join(", ")
      );
    }
    console.log(
      "Task3 translations:",
      row.translation_sentences?.length ?? 0
    );

    // Show first sample from each task
    console.log("\n--- Task 1 sample (sentence 1) ---");
    console.log(
      JSON.stringify(row.fill_in_translation?.[0] ?? null, null, 2)
    );
    console.log("\n--- Task 2 sample (items 1-2) ---");
    const task2Sample = sc ?? pr ?? [];
    console.log(
      JSON.stringify(task2Sample.slice(0, 2), null, 2)
    );
    console.log("\n--- Task 3 sample (items 1-2) ---");
    console.log(
      JSON.stringify(row.translation_sentences?.slice(0, 2) ?? null, null, 2)
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
