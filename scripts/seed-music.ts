// Seed Music class songs (Story.kind = "song") with lyric blanks + YouTube URL.
//
//   npx tsx scripts/seed-music.ts            # seeds all unseeded songs in SONGS
//   npx tsx scripts/seed-music.ts --slug summer-of-69
//
// After seeding, annotate with:
//   npx tsx scripts/annotate-story.ts --slug <slug>
//
// Word annotations (translations + IPA) are NOT inserted here — annotate-story.ts
// handles those via LLM. Comprehension/personal questions are intentionally NOT
// seeded: the Music class has no question steps (blanks → ghosting → karaoke).
// The artist bio waits for the Slice 57 build (no stories column for it yet).

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

type Song = {
  slug: string;
  title: string;
  artist: string;
  level: "pre-intermediate" | "intermediate";
  body: string; // clean lyrics, stanza breaks as blank lines
  youtubeUrl: string;
  lyricBlanks: Array<{ id: number; prompt: string; answer: string }>;
};

// Blank conventions (from music-class-methodology wiki page):
// - ids match Kyle's deck numbering, in order of first appearance
// - repeated words reuse the same id (one prompt/answer entry per unique blank)
// - answers are lowercase-insensitive-checked by MusicBlanks.tsx
const SONGS: Song[] = [
  {
    slug: "summer-of-69",
    title: "Summer of '69",
    artist: "Bryan Adams",
    level: "pre-intermediate",
    youtubeUrl: "https://www.youtube.com/watch?v=9f06QZCVUHg",
    body: `I got my first real six-string
Bought it at the five-and-dime
Played it 'til my fingers bled
Was the summer of '69

Me and some guys from school
Had a band and we tried real hard
Jimmy quit, Jody got married
I should've known we'd never get far

Oh, when I look back now
That summer seemed to last forever
And if I had the choice
Yeah, I'd always wanna be there
Those were the best days of my life

Ain't no use in complainin'
When you've got a job to do
Spent my evenings down at the drive-in
And that's when I met you, yeah

Standin' on your mama's porch
You told me that you'd wait forever
Oh, and when you held my hand
I knew that it was now or never
Those were the best days of my life

Oh, yeah.
Back in the summer of '69

Man we were killin' time
We were young and restless
We needed to unwind
I guess nothin' can last forever, forever, no

And now the times are changin'
Look at everything that's come and gone
Sometimes when I play that old six-string
I think about you, wonder what went wrong
Standin' on your mama's porch
You told me that it'd last forever
Oh, and when you held my hand
I knew that it was now or never
Those were the best days of my life

Oh, yeah.
Back in the summer of '69, oh.
It was the summer of '69, oh, yeah.
Me and my baby in '69, oh.
It was the summer, the summer, the summer of '69, yeah.`,
    lyricBlanks: [
      { id: 1, prompt: "Played it 'til my fingers ____", answer: "bled" },
      { id: 2, prompt: "Jimmy ____, Jody got married", answer: "quit" },
      {
        id: 3,
        prompt: "I should've known we'd never get ___",
        answer: "far",
      },
      {
        id: 4,
        prompt: "That summer seemed to ____ forever",
        answer: "last",
      },
      {
        id: 5,
        prompt: "Ain't no use in _________'",
        answer: "complainin'",
      },
      { id: 6, prompt: "And that's when I ___ you", answer: "met" },
      { id: 7, prompt: "Oh, and when you ____ my hand", answer: "held" },
      { id: 8, prompt: "We were young and ________", answer: "restless" },
      {
        id: 9,
        prompt: "Look at everything that's come and ____",
        answer: "gone",
      },
    ],
  },
];

function tokensOf(body: string): number {
  return body
    .split("\n")
    .filter((line) => line.trim() && !/^\*+\s*$/.test(line.trim()))
    .flatMap((line) => line.split(/\s+/).filter(Boolean)).length;
}

async function seedSong(
  admin: ReturnType<typeof createAdminClient>,
  song: Song
) {
  const { data: story, error } = await admin
    .from("stories")
    .upsert(
      {
        slug: song.slug,
        title: song.title,
        kind: "song",
        level: song.level,
        cefr: song.level === "pre-intermediate" ? "A2/B1" : "B1/B2",
        body_text: song.body,
        body_html: song.body,
        word_count: tokensOf(song.body),
        is_free: false,
        youtube_url: song.youtubeUrl,
        lyric_blanks: song.lyricBlanks,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .maybeSingle();

  if (error || !story) {
    throw new Error(error?.message ?? `No pude guardar ${song.slug}`);
  }

  console.log(
    `Seeded ${song.slug} — ${song.title} (${song.artist}), ${tokensOf(
      song.body
    )} words, ${song.lyricBlanks.length} blanks`
  );
  console.log(
    `Next: npx tsx scripts/annotate-story.ts --slug ${song.slug}  (~$0.01-0.02, 5-12 min)`
  );
}

async function main() {
  const admin = createAdminClient();
  const slugArgIdx = process.argv.indexOf("--slug");
  const slugArg = slugArgIdx >= 0 ? process.argv[slugArgIdx + 1] : null;

  const songs = slugArg
    ? SONGS.filter((s) => s.slug === slugArg)
    : SONGS;

  if (songs.length === 0) {
    console.error(`No song with slug "${slugArg}" in SONGS.`);
    process.exit(1);
  }

  for (const song of songs) {
    await seedSong(admin, song);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
