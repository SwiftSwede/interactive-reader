// Seed Inglés por los Oídos audio-course lessons.
//
// Column ownership (ADR 012):
//   Owns on insert: stories.slug, title, level, cefr, body_text (one-line
//     placeholder), word_count 0, is_free false, kind audio_course, audio_script.
//   Owns on update: stories.audio_script, stories.kind.
//   Never nulls other story columns. Never flips courses.is_published.
//   Course row is inserted only when the name is missing, unpublished.
//   course_lessons position is inserted only when that story is not already
//   on the course. Does not reorder an existing row.
//
//   npx tsx scripts/iplo-import.ts --only 1
//
// Days 2-23 stay unmapped until their grammar tags and segment files exist.

import { existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const COURSE_NAME = "Inglés por los Oídos";
const GRAMMAR_BY_DAY: Record<number, string> = {
  1: "present_simple",
  2: "present_simple",
  3: "present_simple",
};

function onlyDay(): number {
  const flag = process.argv.indexOf("--only");
  const raw = flag >= 0 ? process.argv[flag + 1] : "";
  const day = Number(raw);
  if (!Number.isInteger(day) || day < 1 || day > 23) {
    throw new Error("Pass --only with a day from 1 to 23.");
  }
  return day;
}

async function main() {
  const day = onlyDay();
  const tagName = GRAMMAR_BY_DAY[day];
  if (!tagName) {
    throw new Error(`Day ${day} has no grammar tag yet. Add it before importing.`);
  }
  const path = `scripts/iplo/day${day}-segments.json`;
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    lesson?: number;
    segments?: unknown[];
  };
  if (!Array.isArray(raw.segments) || raw.segments.length === 0) {
    throw new Error(`${path} has no segments.`);
  }
  const durationSeconds = raw.segments.reduce((max, item) => {
    if (!item || typeof item !== "object") return max;
    const end = (item as { end?: number }).end;
    return typeof end === "number" ? Math.max(max, end) : max;
  }, 0);

  const admin = createAdminClient();
  const { data: tag, error: tagError } = await admin
    .from("grammar_tags")
    .select("id")
    .eq("name", tagName)
    .maybeSingle();
  if (tagError || !tag) {
    throw new Error(tagError?.message ?? `Missing grammar tag ${tagName}`);
  }

  const slug = `iplo-day-${day}`;
  const audioScript = {
    audioUrl: `/audio/iplo/day-${day}${existsSync(`public/audio/iplo/day-${day}-filled.m4a`) ? "-filled" : ""}.m4a`,
    grammarTagId: tag.id as string,
    durationSeconds,
    seedVersion: new Date().toISOString(),
    segments: raw.segments,
  };

  const { data: existing, error: existingError } = await admin
    .from("stories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  let storyId = existing?.id as string | undefined;
  if (!storyId) {
    const { data: inserted, error } = await admin
      .from("stories")
      .insert({
        slug,
        title: `Día ${day}`,
        level: "beginner",
        cefr: "A1",
        body_text: "Lección de audio.",
        word_count: 0,
        is_free: false,
        kind: "audio_course",
        audio_script: audioScript,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "story insert failed");
    storyId = inserted.id as string;
  } else {
    const { error } = await admin
      .from("stories")
      .update({ kind: "audio_course", audio_script: audioScript })
      .eq("id", storyId);
    if (error) throw new Error(error.message);
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id")
    .eq("name", COURSE_NAME)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);

  let courseId = course?.id as string | undefined;
  if (!courseId) {
    const { data: teacher, error: teacherError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "teacher")
      .limit(1)
      .maybeSingle();
    if (teacherError || !teacher) {
      throw new Error(teacherError?.message ?? "No teacher profile to own the course.");
    }
    const { data: created, error } = await admin
      .from("courses")
      .insert({
        name: COURSE_NAME,
        level: "beginner",
        format: "self_paced",
        is_published: false,
        teacher_id: teacher.id,
        description: null,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "course insert failed");
    courseId = created.id as string;
  }

  const { data: link, error: linkError } = await admin
    .from("course_lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("story_id", storyId)
    .maybeSingle();
  if (linkError) throw new Error(linkError.message);
  if (!link) {
    const { error } = await admin.from("course_lessons").insert({
      course_id: courseId,
      story_id: storyId,
      position: day,
    });
    if (error) throw new Error(error.message);
  }

  console.log(`Seeded ${slug} on ${COURSE_NAME} (unpublished).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
