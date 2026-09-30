# Cursor prompt — drill engine: items, state, deck, spacing (Slice 75, ADR 015 Phase 2)

## Context

Read `docs/adr/015-deficiency-queue.md` Decision 6 first (drill ladder, interleaving, spacing, graduation), then `docs/drill-content/` — the three authored content files (make-vs-do, age-expression, present-perfect) this slice seeds. This is the second brain slice: Slice 74 picks the mission, this slice stores the drills, selects the deck, and owns the spacing/graduation state machine. **No UI** — the mission card and Drill Lab are the next slice and consume this engine.

Code reality (verified):
- `student_missions` (Slice 74) — one active mission per student; `getOrCreateActiveMission` in `src/lib/missions.ts`.
- Catalogs `grammar_tags` / `phonetic_tags` / `error_tags` — id keyed by `name`; the content files target `make_vs_do`, `age_expression` (error), `present_perfect` (grammar).
- Seed conventions: `scripts/seed-knowledge-tags.ts` (dotenv `.env.local`, `createAdminClient` from `../src/lib/supabase/admin`, idempotent upsert, update `SCRIPTS.md`).
- `learning_events` — admin-client inserts only (no student INSERT policy, by design).

## Build

### 1. Migration `supabase/migrations/20260929_slice75_drill_items.sql`

**`drill_items`** (catalog):
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tag_type text NOT NULL CHECK (tag_type IN ('grammar','phonetic','error'))` — same family rule as missions
- `tag_id uuid NOT NULL` (catalog row; no FK per house convention)
- `format text NOT NULL CHECK (format IN ('teach','cloze','translation','order'))` — 'order' ships empty, future word-order items
- `level text NOT NULL CHECK (level IN ('pre_int','int'))`
- `content jsonb NOT NULL` — shape per format: `teach`: `{hook, wordBank?, sourceUrl}`; `cloze`: `{text (with ___), answer, mcq: [options]?, sourceUrl}`; `translation`: `{prompt (ES), answer (EN), sourceUrl}`
- `active boolean NOT NULL DEFAULT true`
- `created_at/updated_at timestamptz`
- UNIQUE `(tag_id, format, level, ((content->>'text')))` is awkward — instead dedupe in the seeder by `(tag_id, format, content->>'text', content->>'prompt')` lookup before insert; add a plain index on `(tag_id, format)` for the deck queries.
- RLS: authenticated SELECT (content is practice material, not deficiency data); writes service-role only (seed script). No INSERT/UPDATE/DELETE policies.

**`drill_item_state`** (per student per item):
- `id uuid PK`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `item_id uuid NOT NULL REFERENCES drill_items(id) ON DELETE CASCADE`
- `rounds int NOT NULL DEFAULT 0` — attempts on this item
- `clean_recalls int NOT NULL DEFAULT 0` — toward graduation (3)
- `mcq_used boolean NOT NULL DEFAULT false` — MCQ is first-round only, never again
- `last_practiced_at timestamptz`, `next_practice_at timestamptz` (null = not scheduled)
- `status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','graduated'))`, `graduated_at timestamptz`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- UNIQUE `(user_id, item_id)`
- RLS: student SELECT/INSERT/UPDATE own (`user_id = auth.uid()`); teacher SELECT for own students (mirror slice 74's mission policy).

### 2. `scripts/seed-drill-content.ts` (update SCRIPTS.md)

Parses every `docs/drill-content/*.md`. File → tag mapping: read the heading line `# Drill content — <display> (…tag: \`<name>\`)`; the make-vs-do file's heading says `(error family, tag: \`make_vs_do\`)`, age and present-perfect follow the same pattern. Resolve `tag_id` + `tag_type` from the catalogs by name; error if the tag is missing (seed is deliberate, never invents).

Format contract (the files are machine-regular — keep the parser strict, fail loudly on a line that doesn't match):
- **Teach card**: the HOOK paragraph under `## Teach card` (the paragraph starting `**HOOK (from` or `**HOOK (PROVISIONAL` — take the full paragraph text after the `:**`); sourceUrl from the `*Source: <url>*` line; wordBank from the `## Word bank` bullet list (optional; store `{make: [...], do: [...]}` raw strings or null). One teach item per file, level 'int' (teach cards are level-agnostic — use 'int' and exclude teach from level filtering).
- **Cloze**: lines matching `N. **P|I** — <text> → **<answer>** (MCQ: <opt1 / opt2 / opt3>)` — MCQ optional. Level P → 'pre_int', I → 'int'.
- **Translation**: lines matching `N. **P|I** — <ES> → *<EN>*` (answer may contain ` / ` alternates — store the string whole).
- Ignore sections `## Source-mined notes`, `## What I deliberately avoided` (prose only), and parenthetical commentary after the MCQ (store the trailing commentary as `content.note` if trivially extractable, else drop).

Idempotent: upsert keyed on (tag_id, format, content->>'text'/'prompt'); print per-file counts. Expected totals from the current files: 3 teach + 26 cloze + 12 translation = **41 items** (fail with a printed diff if the count differs — the files are the spec).

### 3. `src/lib/drills.ts` — the engine (pure where possible)

- `SPACING = [2 days, 7 days, 14 days]` (ADR: ~2d → 1wk → 2wk), `CLEAN_RECALLS_TO_GRADUATE = 3`, `DECK_SIZE = 6`.
- `nextPracticeAt(stage int, from timestamptz)` — pure: stage index into SPACING.
- `applyResult(state, {correct})` — pure state transition: correct → `clean_recalls + 1`; `clean_recalls >= 3` → graduated; `next_practice_at = nextPracticeAt(clean_recalls, now)`; incorrect → `clean_recalls` reset to 0 (sticky re-flag philosophy: a miss restarts the ladder) but `rounds + 1` always; set `mcq_used = true` after any first round.
- `buildDeck({missionTagId, items, state, now, level})` — pure:
  - Session 1 of a new mission (no state rows for the mission's items) → **focused**: the teach card + mission-tag items at the student's level (fill to DECK_SIZE; if fewer than 6 exist, take all — small families are fine).
  - Session 2+ → mission items due (`next_practice_at <= now` or unscheduled-but-ungraduated) + **repaso**: due graduated items from other tags, oldest due first, until DECK_SIZE.
  - Never two formats of the same underlying sentence... (n/a — keep simple: no dedupe rule beyond item identity).
  - Order: teach card first (if it's session 1), then mission items, then repaso interleaved at the end.
- `recordDrillAttempt(adminClient, {userId, itemId, correct})` — the write path: upsert `drill_item_state` via `applyResult`, then insert `learning_events` `drill_attempt` (detail: `{item_id, correct}`), and on graduation also `drill_item_graduated` (detail: `{item_id}`). Admin client, server-side only.

### 4. Tests (`src/lib/drills.test.ts`)

- Spacing ladder values; `applyResult`: 3 correct → graduated; a miss resets clean_recalls and re-schedules at stage 0; mcq_used flips once.
- `buildDeck`: session-1 focused deck includes teach + only mission items; session-2 deck mixes due repaso; DECK_SIZE respected; level filter (pre_int student never receives 'int' cloze; teach card exempt).
- Seed parser: unit-test the line regexes against sample lines from the actual files (including the `→`-with-commentary shapes).
- All existing tests stay green; `tsc` clean.

## Verification

- Migration applies clean; run `npx tsx scripts/seed-drill-content.ts` → prints 3 teach + 26 cloze + 12 translation; re-run → no duplicates.
- Probe: `buildDeck` for a mission on `make_vs_do` with a pre-int level returns ≤6 items, teach card first, no 'int'-only items.

## Constraints

- No UI. No student routes. No changes to missions.ts or the content files (they are authored input).
- PRD row: Slice 75 (next free; note in this file's header if taken).
- Commit only: migration, seeder + SCRIPTS.md, `src/lib/drills.ts` (+ test), PRD row, this file. Do not sweep the working tree.
