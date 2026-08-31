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

### Check environment variables

Checks all required env vars against the manifest and prints a grouped report. Run before a deploy.

```bash
npx tsx scripts/check-env.ts
```

### Check auth redirect

Prints where a production magic link would send the user. Does not print the full token URL. Useful for debugging login issues.

```bash
npx tsx scripts/check-auth-redirect.ts
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
