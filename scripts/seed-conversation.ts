// Seed Conversation class question sets (Class 4, both levels).
//
//   npx tsx scripts/seed-conversation.ts                 # seed all example sets
//   npx tsx scripts/seed-conversation.ts --title Gabo    # seed matching title(s)
//
// These are examples to replace later. Idempotent by title+level (upsert in
// place, never deletes the row). No student responses table, so re-seeding
// only overwrites the question list.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

type ConversationSeed = {
  title: string;
  level: "pre-intermediate" | "intermediate";
  theme: string;
  questions: string[];
};

const CONVERSATIONS: ConversationSeed[] = [
  {
    title: "Gabo",
    level: "pre-intermediate",
    theme: "Gabriel García Márquez",
    questions: [
      "Have you ever read a book by García Márquez? Which one?",
      "Magical realism mixes the impossible with everyday life. Does that appeal to you, or does it annoy you?",
      "Would you rather live in a tiny town where everybody knows you, or in a big city where nobody does?",
      "If you could sit down for coffee with Gabo, what would you ask him?",
    ],
  },
  {
    title: "Gabo",
    level: "intermediate",
    theme: "Gabriel García Márquez",
    questions: [
      "Have you ever read One Hundred Years of Solitude, or is it one of those books you keep meaning to start?",
      "Magical realism treats the impossible like it's nothing. Does that draw you in, or do you check out?",
      "Gabo grew up in a small town full of stories. Did you grow up somewhere like that, or was it the opposite?",
      "If you had to explain magical realism to a friend who doesn't read, how would you do it?",
    ],
  },
];

async function seedConversation(
  admin: ReturnType<typeof createAdminClient>,
  conversation: ConversationSeed
) {
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (teacherError || !teacher) {
    throw new Error(
      `No teacher profile found: ${teacherError?.message ?? "none"}`
    );
  }

  const payload = {
    title: conversation.title,
    level: conversation.level,
    theme: conversation.theme,
    questions: conversation.questions.map((question, index) => ({
      id: index + 1,
      question,
    })),
    created_by: teacher.id,
  };

  const { data: existing } = await admin
    .from("conversation_prompts")
    .select("id")
    .eq("title", conversation.title)
    .eq("level", conversation.level)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("conversation_prompts")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      throw new Error(
        `${conversation.title} (${conversation.level}): update failed — ${error.message}`
      );
    }
    console.log(
      `✓ Updated "${conversation.title}" (${conversation.level}) — id: ${existing.id}`
    );
  } else {
    const { data, error } = await admin
      .from("conversation_prompts")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      throw new Error(
        `${conversation.title} (${conversation.level}): insert failed — ${error?.message ?? "no data"}`
      );
    }
    console.log(
      `✓ Seeded "${conversation.title}" (${conversation.level}) — id: ${data.id}`
    );
  }

  conversation.questions.forEach((question, index) => {
    console.log(`  ${index + 1}. ${question}`);
  });
}

async function main() {
  const admin = createAdminClient();

  const titleArgIdx = process.argv.indexOf("--title");
  const title = titleArgIdx !== -1 ? process.argv[titleArgIdx + 1] : undefined;

  const conversations = title
    ? CONVERSATIONS.filter(
        (row) => row.title.toLowerCase() === title.toLowerCase()
      )
    : CONVERSATIONS;
  if (conversations.length === 0) {
    console.error(`No conversation found with title "${title}". Available:`);
    CONVERSATIONS.forEach((row) =>
      console.error(`  ${row.title} (${row.level})`)
    );
    process.exit(1);
  }

  for (const conversation of conversations) {
    console.log(
      `\n========== Seeding: ${conversation.title} (${conversation.level}) ==========`
    );
    await seedConversation(admin, conversation);
  }

  console.log(`\nDone. Seed successful.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
