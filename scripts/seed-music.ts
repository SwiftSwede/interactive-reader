// Seed Music class songs (Story.kind = "song") with lyric blanks + YouTube URL.
// Optional Slice 63 fields: artist_bio, song_meaning, lyrics_ipa, line_timestamps.
//
//   npx tsx scripts/seed-music.ts            # seeds all songs in SONGS
//   npx tsx scripts/seed-music.ts --slug summer-of-69
//   npx tsx scripts/seed-music.ts --slug summer-of-69 --force
//
// After seeding, annotate lyrics with:
//   npx tsx scripts/annotate-story.ts --slug <slug>
//
// Word annotations (translations + IPA) are NOT inserted here. annotate-story.ts
// only rewrites words.source = 'body'. Bio words are a later pipeline.
// Comprehension/personal questions are intentionally NOT seeded.
// --force still refuses if song_lyric_attempts exist for this story.

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
  artistBio?: string;
  songMeaning?: string;
  lyricsIpa?: Array<{ line_index: number; ipa_text: string }>;
  lineTimestamps?: Array<{
    line_index: number;
    start_seconds: number;
    end_seconds: number;
  }>;
};

// Blank conventions (from music-class-methodology wiki page):
// - ids match Kyle's deck numbering, in order of first appearance
// - repeated words reuse the same id (one prompt/answer entry per unique blank)
// - answers: trim, lowercase, collapse whitespace; keep apostrophes
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
    artistBio: `Bryan Adams is a Canadian singer who got famous in the 80s. Summer of '69 came out in 1985, but it isn't really a history lesson about 1969. Adams has said the title is also a joke. The song is nostalgia: a guy looking back at being young, playing guitar, and thinking those were the best days.

I use this one a lot with pre-intermediate groups because the story is simple and the verbs are the ones we actually need: got, bought, played, quit, met, held. You don't need to know Bryan Adams. You need to hear how English sounds when somebody remembers.`,
    songMeaning: `The song is a memory. A kid buys a cheap guitar, starts a band with school friends, the band falls apart, then he meets a girl on a porch and thinks this is it.

The trick is the title. People hear 1969 and think history. Adams has said it is also a wink. For class, I treat it as looking back: you think the past was better, and you say you'd always wanna be there.

Listen for the past verbs and for "those were the best days of my life." That's the whole feeling.`,
    lyricsIpa: [
      { line_index: 0, ipa_text: "aɪ ɡɑt maɪ fɝst ɹil sɪks stɹɪŋ" },
      { line_index: 1, ipa_text: "bɑt ɪt æt ðə faɪv ən daɪm" },
      { line_index: 2, ipa_text: "pleɪd ɪt tɪl maɪ fɪŋɡɚz blɛd" },
      { line_index: 3, ipa_text: "wʌz ðə sʌmɚ əv sɪksti naɪn" },
      { line_index: 4, ipa_text: "mi ən sʌm ɡaɪz frəm skul" },
      { line_index: 5, ipa_text: "hæd ə bænd ən wi tɹaɪd ɹil hɑɹd" },
      { line_index: 6, ipa_text: "dʒɪmi kwɪt dʒoʊdi ɡɑt mæɹid" },
      { line_index: 7, ipa_text: "aɪ ʃʊdəv noʊn wid nɛvɚ ɡɛt fɑɹ" },
      { line_index: 8, ipa_text: "oʊ wɛn aɪ lʊk bæk naʊ" },
      { line_index: 9, ipa_text: "ðæt sʌmɚ simd tə læst fɚɛvɚ" },
      { line_index: 10, ipa_text: "ən ɪf aɪ hæd ðə tʃɑɪs" },
      { line_index: 11, ipa_text: "jæ aɪd ɑlweɪz wɑnə bi ðɛɹ" },
      { line_index: 12, ipa_text: "ðoʊz wɚ ðə bɛst deɪz əv maɪ laɪf" },
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
  song: Song,
  force: boolean
) {
  const { data: existing } = await admin
    .from("stories")
    .select("id")
    .eq("slug", song.slug)
    .maybeSingle();

  if (existing?.id) {
    const { count, error: countError } = await admin
      .from("song_lyric_attempts")
      .select("id", { count: "exact", head: true })
      .eq("story_id", existing.id);

    if (countError) {
      throw new Error(
        `${song.slug}: no pude revisar song_lyric_attempts (${countError.message})`
      );
    }
    if ((count ?? 0) > 0) {
      throw new Error(
        `${song.slug}: ya hay respuestas de clase en song_lyric_attempts. ` +
          `Ni --force las borra. Cambia el slug o limpia esos intentos a mano.`
      );
    }
    if (!force) {
      console.log(
        `${song.slug} already exists. Upserting in place (lyrics, bio, meaning, IPA). ` +
          `Pass --force if you meant to overwrite on purpose.`
      );
    }
  }

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
        artist_bio: song.artistBio ?? null,
        song_meaning: song.songMeaning ?? null,
        lyrics_ipa: song.lyricsIpa ?? null,
        line_timestamps: song.lineTimestamps ?? null,
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
    )} words, ${song.lyricBlanks.length} blanks` +
      `${song.artistBio ? ", bio" : ""}` +
      `${song.songMeaning ? ", meaning" : ""}` +
      `${song.lyricsIpa ? `, ${song.lyricsIpa.length} IPA lines` : ""}` +
      `${song.lineTimestamps ? ", timestamps" : ", no timestamps"}`
  );
  console.log(
    `Next: npx tsx scripts/annotate-story.ts --slug ${song.slug}  (~$0.01-0.02, 5-12 min)`
  );
}

async function main() {
  const admin = createAdminClient();
  const slugArgIdx = process.argv.indexOf("--slug");
  const slugArg = slugArgIdx >= 0 ? process.argv[slugArgIdx + 1] : null;
  const force = process.argv.includes("--force");

  const songs = slugArg
    ? SONGS.filter((s) => s.slug === slugArg)
    : SONGS;

  if (songs.length === 0) {
    console.error(`No song with slug "${slugArg}" in SONGS.`);
    process.exit(1);
  }

  for (const song of songs) {
    await seedSong(admin, song, force);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
