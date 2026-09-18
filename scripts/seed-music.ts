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

// Exported for verification scripts (e.g. check-white-is-red.ts). Direct-run is
// guarded below so importing this module never seeds the database.

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
// - repeated words reuse the same id (one prompt/answer entry per unique blank;
//   a word repeated in TWO different lines gets TWO entries with the same id)
// - answers: trim, lowercase, collapse whitespace; keep apostrophes
// - artistBio: PASTE KYLE'S DECK TEXT VERBATIM. NEVER rewrite, summarize, or
//   "improve" it. The deck is the authored source.
// - songMeaning: ALWAYS ASK KYLE for his interpretation FIRST, then paste his
//   text VERBATIM (ratified 2026-09-16). NEVER AI-draft a meaning, even a good
//   one. "Kyle's voice" applies to UI micro-copy only, not to his content.
export const SONGS: Song[] = [
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
        id: 4,
        prompt: "I guess nothin' can ____ forever, forever, no",
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
    artistBio: `Bryan Adams is a Canadian singer, songwriter, and guitarist known for his rock songs and powerful ballads. He was born on November 5, 1959, in Kingston, Ontario, and grew up in Canada and Europe because of his father’s work. Adams began his music career as a teenager and became internationally famous in the 1980s with songs such as “Run to You,” “Summer of ’69,” and “Heaven.” His 1984 album Reckless was a major success and made him one of Canada’s best-known rock musicians.

Adams continued his success in the 1990s with songs like “Everything I Do (I Do It for You),” which was written for the film Robin Hood: Prince of Thieves and became one of the biggest songs of the decade. He has won multiple Juno Awards and Grammy Awards and has also written music for films and Broadway productions. Outside music, Adams is an active photographer whose work has appeared in major magazines and exhibitions. He has also supported animal welfare and environmental causes.`,
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
  {
    slug: "white-is-red",
    title: "White Is Red",
    artist: "Death from Above 1979",
    level: "pre-intermediate",
    youtubeUrl: "https://www.youtube.com/watch?v=n0JEG_wf0pQ",
    body: `Frankie was a heartbreaker
I didn't know it at the start
She was only sixteen
when she went and broke my heart

And she pulled up in her dad's car wearin' white
She said she knew a place where we could hide
She didn't have her license, but she told me I could drive
So I drove all night

"Why don't you leave me?" she asked that night
I said, "I'll stay
I know the kid is mine
I'd never leave you
it isn't right
Let's stay together
until the end of time"

Oh, now the white is red
Can't get it outta my head
Oh, now the white is red

"I heard that there's a place where we can go
Across the state there's no one that we know
Or maybe rent a place where we can stay
Where what we have would go a longer way"

Then Frankie turned to me
she looked me in the eye
She said that I looked tired
she told me she could drive
I pulled up to the station
walked through the neon lights
Then she put her foot down, down, down, down

Why did you leave me alone that night?
You took off racing
the kid is mine
You left me standing
out on the yellow line
The taillight's fading
into the night

We crossed the line
We crossed the line
We crossed the line
We crossed the line

Oh, now the white is red
Can't get it outta my head
Oh, now the white is red

I don't know why she left, took off racing
I ran down, yellow line, red lights fading
She went left, double line, outta love, outta time
I covered eyes; I know she crossed the line

She crossed the line
She crossed the line
She crossed the line
She crossed the line
She crossed the line
She crossed the line
She crossed the line
She crossed the line

Oh, now the white is red
Can't get it outta my head
Oh, now the white is red`,
    lyricBlanks: [
      { id: 1, prompt: "Frankie was a _______", answer: "heartbreaker" },
      { id: 2, prompt: "She was only ____", answer: "sixteen" },
      { id: 3, prompt: "And she ____ __ in her dad's car wearin' white", answer: "pulled up" },
      { id: 3, prompt: "I ____ __ to the station", answer: "pulled up" },
      { id: 4, prompt: "She said she knew a place where we could ____", answer: "hide" },
      { id: 5, prompt: "I said, \"I'll ____", answer: "stay" },
      { id: 5, prompt: "Or maybe rent a place where we can ____", answer: "stay" },
      { id: 6, prompt: "it isn't _____", answer: "right" },
      { id: 7, prompt: "Across the _____ there's no one that we know", answer: "state" },
      { id: 8, prompt: "Then she put her ____ down, down, down, down", answer: "foot" },
      { id: 9, prompt: "You took off ______", answer: "racing" },
      { id: 9, prompt: "I don't know why she left, took off ______", answer: "racing" },
      { id: 10, prompt: "You left me  ______", answer: "standing" },
      { id: 11, prompt: "The taillight's ______", answer: "fading" },
      { id: 11, prompt: "I ran down, yellow line, red lights ______", answer: "fading" },
    ],
    // Synced 2026-09-16 with Kyle's Supabase edit (10 = standing, his renumbering;
    // the old seed had 10 = fading, now 11). Ids 3, 5, 9, 11 have TWO entries each:
    // same id, different prompts, because the repeated word appears in two
    // DIFFERENT lines; one typed value per id fills both spots.
    // Id 1 blanks the full word "heartbreaker": placement matches whole tokens only,
    // so the deck's "heart-(1)____" partial style can't be encoded.
    // PLACEMENT RULE: an entry renders only where prompt+answer reconstruct the
    // lyric line exactly. The final verse SINGS "racin'/fadin'" but the answers are
    // the clean forms, so those two body lines carry the CLEAN spelling and the sung
    // reduction lives in the IPA overlay. A shared id cannot span two differently-
    // spelled sung forms with one answer.
    artistBio: `Death from Above 1979 is a Canadian rock duo from Toronto, formed in 2001 by Jesse F. Keeler and Sebastien Grainger. Keeler plays bass and synthesizer, while Grainger plays drums and sings. Their music combines punk, hard rock, and dance music, creating a loud and energetic sound without a traditional guitar player. Their debut album, You’re a Woman, I’m a Machine, was released in 2004 and became their best-known early work and a cult classic.

The band originally called themselves Death From Above, but in 2004 they added “1979” to their name after a legal dispute with DFA Records, the New York label associated with James Murphy and LCD Soundsystem. The duo broke up in 2006 but reunited in 2011 and continued making music. They briefly returned to the name Death From Above in 2017, but brought “1979” back in 2020. Their later albums include The Physical World (2014), Outrage! Is Now (2017), and Is 4 Lovers (2021).`,
    songMeaning: `This is a bit of a sad love story, sung by Sebastian, with what appears to be a teenage pregnancy. A young man in love with a 16-year-old girl decides to run away with his sweetheart. While they are running away, for whatever reason, the young girl decides to abandon her young lover. As she's abandoning him, she gets involved in a tragic car accident, which the young man is never able to forget.`,
    lyricsIpa: [
      { line_index: 0, ipa_text: "fɹæŋki wəz ə hɑɹt bɹeɪkɚ" },
      { line_index: 1, ipa_text: "aɪ dɪdənt noʊ ɪt æt ðə stɑɹt" },
      { line_index: 2, ipa_text: "ʃi wəz oʊnli sɪkstin" },
      { line_index: 3, ipa_text: "wɛn ʃi wɛnt ən bɹoʊk maɪ hɑɹt" },
      { line_index: 4, ipa_text: "ən ʃi pʊld ʌp ɪn hɚ dædz kɑɹ wɛɹɪn waɪt" },
      { line_index: 5, ipa_text: "ʃi sɛd ʃi nu ə pleɪs wɛɹ wi kʊd haɪd" },
      { line_index: 6, ipa_text: "ʃi dɪdənt hæv hɚ laɪsəns, bət ʃi toʊld mi aɪ kʊd dɹaɪv" },
      { line_index: 7, ipa_text: "soʊ aɪ dɹoʊv ɑl naɪt" },
      { line_index: 8, ipa_text: "waɪ doʊnt ju liv mi, ʃi æskt ðæt naɪt" },
      { line_index: 9, ipa_text: "aɪ sɛd, aɪl steɪ" },
      { line_index: 10, ipa_text: "aɪ noʊ ðə kɪd ɪz maɪn" },
      { line_index: 11, ipa_text: "aɪd nɛvɚ lɛf ju" },
      { line_index: 12, ipa_text: "ɪt ɪzənt ɹaɪt" },
      { line_index: 13, ipa_text: "lɛts steɪ təɡɛðɚ" },
      { line_index: 14, ipa_text: "ʌntɪl ði ɛnd əv taɪm" },
      { line_index: 15, ipa_text: "oʊ, naʊ ðə waɪt ɪz ɹɛd" },
      { line_index: 16, ipa_text: "kænt ɡɛt ɪt aʊtə maɪ hɛd" },
      { line_index: 17, ipa_text: "oʊ, naʊ ðə waɪt ɪz ɹɛd" },
      { line_index: 18, ipa_text: "aɪ hɜɹd ðæt ðɛɹz ə pleɪs wɛɹ wi kæn ɡoʊ" },
      { line_index: 19, ipa_text: "əkɹɔs ðə steɪt ðɛɹz noʊ wʌn ðæt wi noʊ" },
      { line_index: 20, ipa_text: "ɔɹ meɪbi ɹɛnt ə pleɪs wɛɹ wi kæn steɪ" },
      { line_index: 21, ipa_text: "wɛɹ wʌt wi hæv wʊd ɡoʊ ə lɔŋɡɚ weɪ" },
      { line_index: 22, ipa_text: "ðɛn fɹæŋki tɜɹnd tə mi" },
      { line_index: 23, ipa_text: "ʃi lʊkt mi ɪn ði aɪ" },
      { line_index: 24, ipa_text: "ʃi sɛd ðæt aɪ lʊkt taɪɹd" },
      { line_index: 25, ipa_text: "ʃi toʊld mi ʃi kʊd dɹaɪv" },
      { line_index: 26, ipa_text: "aɪ pʊld ʌp tə ðə steɪʃən" },
      { line_index: 27, ipa_text: "wɔkt θɹu ðə nioʊn laɪts" },
      { line_index: 28, ipa_text: "ðɛn ʃi pʊt hɚ fʊt daʊn, daʊn, daʊn, daʊn" },
      { line_index: 29, ipa_text: "waɪ dɪd ju liv mi əloʊn ðæt naɪt" },
      { line_index: 30, ipa_text: "ju tʊk ɑf ɹeɪsɪŋ" },
      { line_index: 31, ipa_text: "ðə kɪd ɪz maɪn" },
      { line_index: 32, ipa_text: "ju lɛf mi stændɪŋ" },
      { line_index: 33, ipa_text: "aʊt ɑn ðə jɛloʊ laɪn" },
      { line_index: 34, ipa_text: "ðə teɪlaɪts feɪdɪŋ" },
      { line_index: 35, ipa_text: "ɪntə ðə naɪt" },
      { line_index: 36, ipa_text: "wi kɹɔst ðə laɪn" },
      { line_index: 37, ipa_text: "wi kɹɔst ðə laɪn" },
      { line_index: 38, ipa_text: "wi kɹɔst ðə laɪn" },
      { line_index: 39, ipa_text: "wi kɹɔst ðə laɪn" },
      { line_index: 40, ipa_text: "oʊ, naʊ ðə waɪt ɪz ɹɛd" },
      { line_index: 41, ipa_text: "kænt ɡɛt ɪt aʊtə maɪ hɛd" },
      { line_index: 42, ipa_text: "oʊ, naʊ ðə waɪt ɪz ɹɛd" },
      { line_index: 43, ipa_text: "aɪ doʊnt noʊ waɪ ʃi lɛft, tʊk ɑf ɹeɪsɪn" },
      { line_index: 44, ipa_text: "aɪ ɹæn daʊn, jɛloʊ laɪn, ɹɛd laɪts feɪdɪn" },
      { line_index: 45, ipa_text: "ʃi wɛnt lɛft, dʌbəl laɪn, aʊtə lʌv, aʊtə taɪm" },
      { line_index: 46, ipa_text: "aɪ kʌvɚd aɪz; aɪ noʊ ʃi kɹɔst ðə laɪn" },
      { line_index: 47, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 48, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 49, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 50, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 51, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 52, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 53, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 54, ipa_text: "ʃi kɹɔst ðə laɪn" },
      { line_index: 55, ipa_text: "oʊ, naʊ ðə waɪt ɪz ɹɛd" },
      { line_index: 56, ipa_text: "kænt ɡɛt ɪt aʊtə maɪ hɛd" },
      { line_index: 57, ipa_text: "oʊ, naʊ ðə waɪt ɪz ɹɛd" },
    ],
  },
  {
    slug: "why-dont-you-get-a-job",
    title: "Why Don't You Get a Job?",
    artist: "The Offspring",
    level: "intermediate",
    youtubeUrl: "https://www.youtube.com/watch?v=LH-i8IvYIcg",
    body: `My friend's got a girlfriend, man, he hates that bitch
He tells me every day
He says, "Man, I really gotta lose my chick
In the worst kind of way"

She sits on her ass, he works his hands to the bone
To give her money every payday
But she wants more dinero just to stay at home
Well, my friend, you gotta say

I won't pay, I won't pay ya, no way-ay-ay-ay
Na-na, why don't you get a job?
Say no way, say no way-ah, no way-ay-ay-ay
Na-na, why don't you get a job?

I guess all his money, well, it isn't enough
To keep the bill collectors at bay
I guess all his money, well, it isn't enough
'Cause that girl's got expensive taste

I won't pay, I won't pay ya, no way-ay-ay-ay
Na-na, why don't you get a job?
Say no way, say no way-ah, no way-ay-ay-ay
Na-na, why don't you get a job?

Well, I guess it ain't easy doing nothing at all, oh yeah
But, hey man, free rides just don't come along every day

My friend's got a boyfriend, man, she hates that dick
She tells me every day
He wants more dinero just to stay at home
Well, my friend, you gotta say

I won't pay, I won't pay ya, no way-ay-ay-ay
Na-na, why don't you get a job?
Say no way, say no way-ah, no way-ay-ay-ay
Na-na, why don't you get a job?

I won't give you no money, I always pay
Na-na, why don't you get a job?
Say no way, say no way-ah, no way-ay-ay-ay
Na-na, why don't you get a job?`,
    // Blanks transcribed from the deck's own numbering (1)-(8), Sept 2026 deck.
    // - (4) "gotta" appears in TWO verses, but the two lines are IDENTICAL
    //   ("Well, my friend, you gotta say" x2), so ONE entry places at both —
    //   the checker's legitimate multi-line case (like Summer of '69 porch).
    // - (3) is 3 words, (5) is 2 words: one entry, multi-slot.
    // - Body carries CLEAN spellings (deck sings the same forms here — no
    //   sung-vs-clean split like White Is Red's final verse).
    // - Curly deck quotes/apostrophes straightened to match prompt matching
    //   (normalizeForMatch does not fold ' vs ').
    lyricBlanks: [
      {
        id: 1,
        prompt: "My friend's got a girlfriend, man, he hates that _____",
        answer: "bitch",
      },
      {
        id: 2,
        prompt: 'He says, "Man, I really gotta ____ my chick',
        answer: "lose",
      },
      {
        id: 3,
        prompt: "She sits on her ass, he works his hands __ ___ ____",
        answer: "to the bone",
      },
      {
        id: 4,
        prompt: "Well, my friend, you _____ say",
        answer: "gotta",
      },
      {
        id: 5,
        prompt: "To keep the bill collectors __ ___",
        answer: "at bay",
      },
      {
        id: 6,
        prompt: "'Cause that girl's got expensive _____",
        answer: "taste",
      },
      {
        id: 7,
        prompt:
          "But, hey man, free _____ just don't come along every day",
        answer: "rides",
      },
      {
        id: 8,
        prompt: "My friend's got a boyfriend, man, she hates that ____",
        answer: "dick",
      },
    ],
    // VERBATIM from the deck bio slide. Never rewrite.
    artistBio: `The Offspring is an American punk rock band formed in Garden Grove, California, in 1984 by guitarist Dexter Holland and bassist Greg K. The band became part of the Southern California punk scene and gained a larger audience with their third album, Smash, released in 1994. The album became one of the best-selling independent-label albums ever and included songs such as “Come Out and Play” and “Self Esteem.”

The Offspring became one of the most successful punk bands of the 1990s, combining fast guitar-driven music with catchy melodies and humorous lyrics. They continued their success with albums such as Ixnay on the Hombre (1997) and Americana (1998), which featured hits including “Pretty Fly (For a White Guy)” and “The Kids Aren’t Alright.” The band has continued recording and touring, with Holland remaining its lead singer and a central member throughout its history.`,
    // songMeaning intentionally ABSENT — ratification 2026-09-16: Kyle dictates
    // his interpretation first; it gets pasted verbatim. Never AI-draft.
    lyricsIpa: [
      { line_index: 0, ipa_text: "maɪ fɹɛndz ɡɑt ə ɡɝlfɹɛnd, mæn, hi heɪts ðæt bɪtʃ" },
      { line_index: 1, ipa_text: "hi tɛlz mi ɛvɹi deɪ" },
      { line_index: 2, ipa_text: "hi sɛz, mæn, aɪ ɹiəli ɡɑtə luz maɪ tʃɪk" },
      { line_index: 3, ipa_text: "ɪn ðə wɝst kaɪnd əv weɪ" },
      { line_index: 4, ipa_text: "ʃi sɪts ɑn hɚ æs, hi wɝks ɪz hændz tə ðə boʊn" },
      { line_index: 5, ipa_text: "tə ɡɪv hɚ mʌni ɛvɹi peɪdeɪ" },
      { line_index: 6, ipa_text: "bət ʃi wɑnts mɔɹ dɪneɹoʊ dʒəst tə steɪ æt hoʊm" },
      { line_index: 7, ipa_text: "wɛl, maɪ fɹɛnd, ju ɡɑtə seɪ" },
      { line_index: 8, ipa_text: "aɪ woʊnt peɪ, aɪ woʊnt peɪ jə, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 9, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 10, ipa_text: "seɪ noʊ weɪ, seɪ noʊ weɪ ɑ, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 11, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 12, ipa_text: "aɪ ɡɛs ɔl ɪz mʌni, wɛl, ɪt ɪzənt ɪnʌf" },
      { line_index: 13, ipa_text: "tə kip ðə bɪl kəlɛktɚz æt beɪ" },
      { line_index: 14, ipa_text: "aɪ ɡɛs ɔl ɪz mʌni, wɛl, ɪt ɪzənt ɪnʌf" },
      { line_index: 15, ipa_text: "kəz ðæt ɡɝlz ɡɑt ɪkspɛnsɪv teɪst" },
      { line_index: 16, ipa_text: "aɪ woʊnt peɪ, aɪ woʊnt peɪ jə, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 17, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 18, ipa_text: "seɪ noʊ weɪ, seɪ noʊ weɪ ɑ, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 19, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 20, ipa_text: "wɛl, aɪ ɡɛs ɪt eɪnt izi duɪŋ nʌθɪŋ æt ɔl, oʊ jɛ" },
      { line_index: 21, ipa_text: "bət, heɪ mæn, fɹi ɹaɪdz dʒəst doʊnt kʌm əlɔŋ ɛvɹi deɪ" },
      { line_index: 22, ipa_text: "maɪ fɹɛndz ɡɑt ə bɔɪfɹɛnd, mæn, ʃi heɪts ðæt dɪk" },
      { line_index: 23, ipa_text: "ʃi tɛlz mi ɛvɹi deɪ" },
      { line_index: 24, ipa_text: "hi wɑnts mɔɹ dɪneɹoʊ dʒəst tə steɪ æt hoʊm" },
      { line_index: 25, ipa_text: "wɛl, maɪ fɹɛnd, ju ɡɑtə seɪ" },
      { line_index: 26, ipa_text: "aɪ woʊnt peɪ, aɪ woʊnt peɪ jə, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 27, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 28, ipa_text: "seɪ noʊ weɪ, seɪ noʊ weɪ ɑ, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 29, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 30, ipa_text: "aɪ woʊnt ɡɪv ju noʊ mʌni, aɪ ɔlweɪz peɪ" },
      { line_index: 31, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
      { line_index: 32, ipa_text: "seɪ noʊ weɪ, seɪ noʊ weɪ ɑ, noʊ weɪ eɪ eɪ eɪ" },
      { line_index: 33, ipa_text: "næ næ, waɪ doʊnt ju ɡɛt ə dʒɑb" },
    ],
  },
];

function tokensOf(body: string): number {
  return body
    .split("\n")
    .filter((line) => line.trim() && !/^\*+\s*$/.test(line.trim()))
    .flatMap((line) => line.split(/\s+/).filter(Boolean)).length;
}

// Canonical JSON string: object keys sorted (Postgres jsonb does not preserve
// key order), arrays keep order, values compared deeply.
function canon(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canon).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canon(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value ?? null);
}

async function seedSong(
  admin: ReturnType<typeof createAdminClient>,
  song: Song,
  force: boolean
) {
  const { data: existing } = await admin
    .from("stories")
    .select(
      "id, line_timestamps, body_text, lyric_blanks, artist_bio, song_meaning, youtube_url, lyrics_ipa"
    )
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
    // Visibility: when the DB row carries tap-aligned timestamps and this
    // seed entry defines none, say so. The upsert itself omits the column
    // (see the payload spread), so the data survives — this log proves it.
    const existingStamps = Array.isArray(existing?.line_timestamps)
      ? (existing.line_timestamps as unknown[]).length
      : 0;
    if (existingStamps > 0 && !song.lineTimestamps) {
      console.log(
        `${song.slug}: preserving ${existingStamps} existing line_timestamps (tap-align data — the seed never wipes them).`
      );
    }
    // Diff visibility: these columns are seed-owned. If the DB row has drifted
    // (e.g., Kyle edited in the Supabase Table Editor), say so BEFORE
    // overwriting so the operator can sync the SONGS entry back instead of
    // silently reverting his edits. Log-only; --force stays the conscious
    // overwrite switch.
    const diffs: string[] = [];
    if (existing.body_text !== song.body) diffs.push("body_text");
    if (canon(existing.lyric_blanks) !== canon(song.lyricBlanks))
      diffs.push("lyric_blanks");
    if ((existing.artist_bio ?? "") !== (song.artistBio ?? ""))
      diffs.push("artist_bio");
    if ((existing.song_meaning ?? "") !== (song.songMeaning ?? ""))
      diffs.push("song_meaning");
    if ((existing.youtube_url ?? "") !== song.youtubeUrl)
      diffs.push("youtube_url");
    if (canon(existing.lyrics_ipa) !== canon(song.lyricsIpa ?? null))
      diffs.push("lyrics_ipa");
    if (diffs.length > 0) {
      console.log(
        `${song.slug}: DB differs from the SONGS entry on ${diffs.join(", ")}. ` +
          `If you edited these in Supabase, sync scripts/seed-music.ts first. ` +
          `--force overwrites the DB on purpose.`
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
        // line_timestamps is TAP-ALIGN-OWNED data (Kyle taps them in the tool,
        // pastes into Supabase). The seed must NEVER overwrite them: include the
        // column in the upsert only when the entry explicitly defines timestamps.
        // (Regression fixed 2026-09-16: a bare `?? null` here wiped Kyle's
        // tap-aligned karaoke JSON on every re-seed.)
        ...(song.lineTimestamps
          ? { line_timestamps: song.lineTimestamps }
          : {}),
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

// Direct-run guard: only seed when invoked as the main script
// (npx tsx scripts/seed-music.ts). Importing SONGS from another script
// must never touch the database.
if (process.argv[1]?.includes("seed-music")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
