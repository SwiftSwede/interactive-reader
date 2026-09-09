# Scripts Reference

> All runnable scripts for the interactive reader app.
> Open this file to see what's available and how to run it.

## How to run

All scripts are TypeScript files run with `npx tsx`:

```bash
cd ~/Desktop/WebDev/interactive-reader
npx tsx scripts/<script-name>.ts [arguments]
```

You need `.env.local` in the project root with Supabase + OpenRouter keys. If you're missing keys, run `npx tsx scripts/check-env.ts` to see what's needed.

---

## Adding New Content

### Seed a story from the Obsidian vault into the database

Parses the vault markdown file (story body, comprehension questions, personal questions, pronunciation drill) and inserts it into Supabase. If comprehension questions have no answers, calls Claude Sonnet to generate them automatically.

```bash
# Explicit file path (relative to vault raw/stories/ folder):
npx tsx scripts/seed-story.ts --slug flustered-and-driving --file "pre-int stories/Pre-Flustered-and-Driving.md"

# Auto-resolve from slug (searches pre-int and int folders):
npx tsx scripts/seed-story.ts --slug flustered-and-driving

# Flags:
#   --slug <slug>         URL-safe slug (default: derived from filename)
#   --file <path>         Path relative to vault raw/stories/, or absolute
#   --free                Mark as free story (default: false)
#   --level <level>       Override level (default: from frontmatter)
#   --no-answers          Skip AI answer generation for answerless questions

# Example: seed an intermediate story
npx tsx scripts/seed-story.ts --slug the-lottery --file "int stories/The-Lottery.md"
```

**Cost:** ~$0.01 if AI answer generation runs (only when questions have no answers).
**Time:** 5-10 seconds.

### Annotate a story (word-by-word translations + IPA + expressions)

Fetches the story from the database, splits into paragraphs, sends each to Claude Sonnet via OpenRouter. Each word gets: Spanish translation, IPA transcription, part of speech, transparent flag, expression grouping.

```bash
npx tsx scripts/annotate-story.ts --slug flustered-and-driving
```

**Cost:** ~$0.01-0.02 per story.
**Time:** 5-12 minutes (depends on paragraph count — dialogue-heavy stories have more chunks).

### Seed Phase 5 sample lessons (dialogue, movie talk, song)

Seeds the stub sample lessons for dialogue, Movie Talk, and music lesson types. These are display stubs, not real content.

```bash
npx tsx scripts/seed-phase5-samples.ts
```

### Seed a Music class song (Class 6)

Inserts (or updates by slug) a real song lesson: `Story.kind = "song"` with clean lyrics in `body_text`, `lyric_blanks` (numbered, deck-convention IDs), and `youtube_url`. Optional Slice 63 fields: `artist_bio`, `song_meaning`, `lyrics_ipa`, `line_timestamps`. No word annotations, no comprehension/personal questions (those steps auto-hide). `annotate-story.ts` only rewrites `words.source = 'body'` so lyric re-annotation cannot wipe bios. `--force` still refuses when `song_lyric_attempts` exist.

```bash
npx tsx scripts/seed-music.ts            # seed all songs in the SONGS array
npx tsx scripts/seed-music.ts --slug summer-of-69
npx tsx scripts/seed-music.ts --slug summer-of-69 --force
```

To add a song: append an entry to `SONGS` in `scripts/seed-music.ts` (lyrics from the current Music deck on Google Drive, blanks with Kyle's numbering where repeated words reuse the same ID). Then annotate:

```bash
npx tsx scripts/annotate-story.ts --slug <slug>   # ~$0.01-0.02, 5-12 min
```

**Cost / time / status:** Free. A few seconds per song. Idempotent by slug. First real song: Summer of '69 (pre-intermediate, September 2026) with Kyle-voice bio + meaning and draft IPA. No line timestamps (karaoke degrades until studio-aligned data exists).

### Seed a Video Summary Translation lesson (Pre-Int Class 3)

Inserts (or updates by slug) a video summary lesson: `Story.kind = "video_summary"` with the English summary in `body_text` (teacher-only answer key), the English-structured Spanish summary in `spanish_summary`, and the Spanish paragraphs in `video_summary_paragraphs` (translations start empty — Kyle fills them live in class).

```bash
npx tsx scripts/seed-video-summary.ts                  # seed all lessons
npx tsx scripts/seed-video-summary.ts --slug <slug>    # seed one lesson
```

To add a lesson: append an entry to `LESSONS` in `scripts/seed-video-summary.ts` (YouTube URL, English summary, English-structured Spanish summary — same number of paragraphs in both). No annotation, no IPA, no questions — those steps don't apply.

⚠️ Re-seeding a lesson whose paragraphs already contain live teacher translations (i.e. after the class happened) requires `--force` — it deletes the paragraphs and wipes the class record.

**Cost / time / status:** Free. A few seconds. Idempotent by slug. Seeded: Shaun the Sheep "Cabbage Football", Mr. Bean "Late for the Dentist", Shaun the Sheep "Babysitting Timmy" (September 2026).

### Seed a presentation class (intermediate Class 3 Format A)

Inserts (or updates) an intermediate presentation lesson into `presentation_prompts`. Schema: `supabase/schema-phase5-presentation.sql`.

```bash
npx tsx scripts/seed-presentation.ts                  # seed all lessons
npx tsx scripts/seed-presentation.ts --slug gabo      # seed one lesson
```

To add a lesson: append an entry to `PRESENTATIONS` in `scripts/seed-presentation.ts` (title, theme, warmup question, segments array). Source: Kyle's "2. Presentation: \<Title\>" Google Slides deck on Drive — download with the google-workspace skill (`drive download <id> --export-mime text/plain`), then transcribe each video/part block into a segment: YouTube URL (`&t=` is when THAT part starts; a title like "Part 1 (5:00)" means part 1 ends at 5:00, so Part 1 has no `t=` and Part 2 gets `&t=300s`), vocabulary (English=Spanish, optional example sentence), comprehension questions **with answers**. No annotation, no IPA, no pronunciation — those steps don't apply to this lesson type.

⚠️ Re-seeding a lesson that already has student responses (i.e. after the class happened) requires `--force` — content would be overwritten while students' answers reference the old segment/question ids. Without `--force` the guard refuses and the class data is safe.

**Cost / time / status:** Free. A few seconds. Idempotent by title+level (upserts in place — never deletes the row). Seeded: Paris (May 2026), Gabo / Gabriel García Márquez (September 2026).

### Seed a conversation class (Class 4, both levels)

Inserts (or updates) example question sets into `conversation_prompts`. Schema: `supabase/schema-phase5-conversation.sql`. These are examples to replace later.

```bash
npx tsx scripts/seed-conversation.ts                 # seed all example sets
npx tsx scripts/seed-conversation.ts --title Gabo    # seed matching title(s)
```

To add a set: append an entry to `CONVERSATIONS` in `scripts/seed-conversation.ts` (title, level `pre-intermediate` or `intermediate`, optional theme, 3-6 spoken questions). No answers, no roles. Upserts by title+level and never deletes the row.

**Cost / time / status:** Free. A few seconds. Idempotent by title+level. Seeded: Gabo (pre-intermediate and intermediate example sets).

### Generate word timestamps for karaoke (Whisper)

Uses OpenAI Whisper to transcribe the story audio and generate word-level timing data for the karaoke highlight feature.

```bash
python3.11 scripts/generate-timestamps.py --audio public/audio/stories/{slug}.mp3 --slug {slug} --model base
```

Models: `tiny` (fastest, least accurate), `base` (good for clear narration), `small` (better accuracy, slower), `turbo` (best, 1.5GB download). `base` is recommended for Kyle's clear narration.

**Cost:** Free (runs locally).
**Time:** 30-60 seconds with `base` model.

**Python setup (one-time):** The project has a venv at `.venv/` with Whisper installed. Run the script with:
```bash
cd ~/Desktop/WebDev/interactive-reader
.venv/bin/python scripts/generate-timestamps.py --audio public/audio/stories/{slug}.mp3 --slug {slug} --model base
```

### Align timestamps to story positions (REQUIRED after Whisper, prevents karaoke desync)

`generate-timestamps.py` numbers words in **Whisper's heard order**, but the karaoke highlights the Nth rendered `.word-span`, which follows **story word positions**. Any drift between the two (Kyle saying "even more late", an annotation LLM normalizing "'em" to "them") accumulates and desyncs the highlight — on Flustered and Driving this compounded to a +234-word jump at the 4-minute mark (2026-09-08).

ALWAYS run this after generate-timestamps.py. It aligns Whisper timing onto story positions, cross-checks the words table against `body_text` (fails loudly on mismatch — fix words first, e.g. re-run annotate-story.ts), enforces monotonic starts, and writes a `.bak` alongside.

```bash
python3 scripts/align-story-timestamps.py --slug {slug}             # write
python3 scripts/align-story-timestamps.py --slug {slug} --dry-run  # report only
```

**Cost / time:** Free, a few seconds. Stdlib Python only (no venv needed).

### Verify karaoke sync (diagnosis + render simulation)

Two diagnosis scripts (stdlib Python, free):

```bash
python3 scripts/karaoke-sync-diagnosis.py [slugs...]         # offset profile: where sync drifts, by how much
python3 scripts/karaoke-render-simulation.py [slugs...]     # replicates the component's render + binary search;
                                                             # reports excluded spans, paragraph jumps, error at sampled times
```

Expected healthy output: `DOM spans == tokens`, `excluded: 0`, `err 0` at every sample. Any `excluded > 0` means the words table diverged from body_text; any nonzero `err` means timestamps need re-alignment.

### Align song lyrics to the YouTube video (karaoke de canciones)

Songs cannot reuse the Whisper story pipeline: the class plays the official YouTube embed (copyright — we never host song audio), so line timestamps must live against the VIDEO's clock, not Kyle's MP3. The tap-align tool records line timings while the official video plays — no MP3, no Whisper, no API cost.

```bash
open scripts/tap-align-lyrics.command      # or double-click the .command file
```

**Workflow:** paste the song's `youtube_url` + `body_text` (with the empty stanza lines) → play the video → tap the big button (or Space) as each line starts → **Generar JSON** → paste into `stories.line_timestamps` in the Supabase Table Editor.

- Line numbering matches the app exactly (non-empty lines, 0-based — same as `indexedLyricLines()`), so it also lines up with `lyrics_ipa`.
- Skipped or fumbled a line? Click that line in the list and continue from there (clears from that point). Undo with the button or U.
- Reaction compensation (-0.25 s default) is adjustable mid-run and only affects new taps.
- Partial export is fine — untapped lines simply don't highlight.
- Sessions auto-save per video; the reopen screen offers to continue.
- **Rules:** official music-video URLs only (live versions desync). Any offset gets baked into the stored JSON — there is no offset column and there must not be one.
- **Before class (1 min):** open the lesson page, play verse 1 + chorus, confirm the highlight follows. Eyes, not JSON.
- **Fallback (Hermes only, not a repo script):** if a song is too dense to tap, Whisper line-align on a Kyle-owned studio MP3 can draft the same `{line_index, start_seconds, end_seconds}` JSON. It must still match the official video clock (any MP3/video drift bakes into that JSON). Do not add a Whisper song script to this repo or a Whisper button on Vercel.

**Cost / time:** Free. ~5 minutes per song.

### Dedupe expressions after annotation (per-chunk duplication)

annotate-story.ts chunks per paragraph, and separate chunks can each claim the same multi-word expression, inserting duplicate `expressions` rows. Run this after every annotation:

```bash
npx tsx scripts/dedupe-expressions.ts --slug {slug} --dry-run  # report
npx tsx scripts/dedupe-expressions.ts --slug {slug}           # repoint words to keeper, delete duplicates
```

**Cost / time:** Free, a few seconds.

### Generate Práctica Coral IPA

Generates the IPA transcription for a story's Práctica Coral sentence and saves it to the pronunciation_drills table. Needed for the dictation step to show IPA.

```bash
npx tsx scripts/generate-coral-ipa.ts --slug flustered-and-driving
```

**Cost:** ~$0.001 (one short LLM call).
**Time:** 3-5 seconds.

### Update word audio URLs

Updates the `audio_url` field in Supabase for word rows based on an audio mapping JSON file. Used after generating MP3s with Edge TTS.

```bash
npx tsx scripts/update-word-audio.ts
```

---

## Content Tagging (Phase 4)

### Propose content tags for all stories

Runs an LLM over every story in the database to propose grammar/vocabulary/phonetic tags. Outputs a JSON file for Kyle to review.

```bash
npx tsx scripts/propose-content-tags.ts
```

### Apply reviewed content tags

Writes the reviewed ContentTag rows into the database after Kyle approves the proposed tags.

```bash
npx tsx scripts/apply-content-tags.ts
```

### Seed the Phase 4 tag catalogs

Seeds the GrammarTag, VocabularyTag, and PhoneticTag catalogs after the Phase 4 schema is applied.

```bash
npx tsx scripts/seed-knowledge-tags.ts
```

---

## Database & Schema

### Apply Phase 4 schema

Applies `schema-phase4a.sql` then `schema-phase4b.sql` via the Supabase SQL API. Run once when setting up Phase 4.

```bash
npx tsx scripts/apply-phase4-schema.ts
```

### Apply presentation schema (slice 56a)

Creates `presentation_prompts`, `presentation_responses`, and `presentation_vocab_notes`, adds `presentation_prompt_id` and `presentation_step` to `course_sessions`, and updates session_type / activity / content_tags CHECK constraints. Apply in the Supabase SQL Editor, or via the MCP migration, then seed Paris.

The SQL file is `supabase/schema-phase5-presentation.sql`.

### Apply Zoom room URL (slice 58b)

Adds nullable `courses.zoom_url` (one Zoom room per group/month). Apply in the Supabase SQL Editor, or it is already applied via MCP on the live project.

The SQL file is `supabase/schema-slice-58b-zoom-url.sql`.

### Apply attendance override (slice 59)

Makes `session_attendance.first_opened_at` nullable and adds teacher INSERT/UPDATE RLS so Kyle can mark asistió / no asistió. Apply in the Supabase SQL Editor, or via the MCP migration.

The SQL file is `supabase/schema-slice-59-attendance.sql`.

### Seed classroom_level from Stripe

Sets `profiles.classroom_level` from the live Stripe price when the field is empty. Does not overwrite a teacher move. Run once after adding the classroom_level column.

```bash
npx tsx scripts/seed-classroom-level.ts
```

### Seed Phase 2.5 data

Applies Phase 2.5 seed data (sound videos) after `schema-phase2.5.sql` is run in the Supabase SQL Editor.

```bash
npx tsx scripts/seed-phase2.5.ts
```

### Probe Phase 4 tables

Quick check that the Phase 4 tables exist and have data. Useful for debugging.

```bash
npx tsx scripts/probe-phase4.ts
```

---

## Diagnostics

### Environment variable checks

All env-check tooling lives under `scripts/`:

| Script | When it runs | What it does |
|--------|--------------|--------------|
| `check-env.ts` | Before deploy (manual or CI) | Prints a grouped report; exits non-zero if a **required** var is missing |
| `check-env-startup.ts` | Server boot (via `src/instrumentation.ts`) | Logs missing vars to runtime logs; never crashes the server |
| `env-manifest.ts` | (imported by both) | Single source of truth for expected env vars |

**Predeploy check** (run before shipping):

```bash
npm run check-env
# or: npx tsx scripts/check-env.ts
```

Locally it reads `.env.local`. On Vercel/CI the real environment is already populated.

### Check auth redirect

Prints where a production magic link would send the user. Does not print the full token URL. Useful for debugging login issues.

```bash
npx tsx scripts/check-auth-redirect.ts
```

Students log in with an 8-digit code on `/login`. Magic links should not use the PKCE `/auth/callback?code=` flow: Gmail and Samsung/Chrome handoffs burn that code. After deploy, do this once in the Supabase dashboard:

1. Authentication → URL Configuration → Redirect URLs: add `https://learn.profekyle.com/auth/confirm**` (keep `/auth/callback` too).
2. Authentication → Emails → Magic Link template, replace the button URL with:

```html
<h2>Entra a Profe Kyle</h2>
<p>Escribe este código de 8 números en la app. Quédate en la misma pantalla. No hace falta abrir otro navegador:</p>
<p style="font-size:28px;letter-spacing:4px;"><strong>{{ .Token }}</strong></p>
<p>O, si el link se abre en este mismo teléfono, toca Entrar:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar</a></p>
```

### Check Stripe schema

Confirms the `idx_subscription_periods_stripe_sub` index exists by attempting a duplicate insert of a throwaway period, then deleting it.

```bash
npx tsx scripts/check-stripe-schema.ts
```

### Verify a student import

Checks that a specific student was imported correctly (profile, enrollment, subscription period).

```bash
npx tsx scripts/verify-import.ts
```

---

## One-Off Scripts (already run, kept for reference)

### Import Stripe subscribers

One-off import of existing live Stripe (ThriveCart) subscriptions. Creates classroom users and periods. Only active (still-paying) subs are enrolled in the current course.

```bash
npx tsx scripts/import-stripe-subscribers.ts
```

**Status:** Already run. Only needed again if new legacy subscribers need importing.

---

## Common Workflows

### Add a new story to the app (monthly process)

```bash
# 1. Seed the story (with AI answers if needed)
npx tsx scripts/seed-story.ts --slug <slug> --file "pre-int stories/Pre-Story-Name.md"

# 2. Annotate words
npx tsx scripts/annotate-story.ts --slug <slug>

# 3. Generate Práctica Coral IPA
npx tsx scripts/generate-coral-ipa.ts --slug <slug>

# 4. (Optional) Generate audio — Kyle records his own, drops MP3s into public/audio/stories/{slug}.mp3

# 5. (Optional) Propose content tags
npx tsx scripts/propose-content-tags.ts
```

Then go to the teacher dashboard on the website, create a session, pick the story, set the date, and paste the generated link in Zoom.

### Debug a student's access issue

```bash
# 1. Check env vars are set
npx tsx scripts/check-env.ts

# 2. Check where magic links redirect
npx tsx scripts/check-auth-redirect.ts

# 3. Verify the student's profile and enrollment
npx tsx scripts/verify-import.ts
```
