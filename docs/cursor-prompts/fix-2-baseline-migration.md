# Fix 2 of 5 — Audit: baseline migration for the 42 untracked tables

**Source:** Milestone code audit 2026-09-19, finding HIGH-2.

## Problem
`supabase/migrations/` (11 files, 4 tables) is treated by the Supabase CLI as the migration history, but ~42 tables actually live in 27 loose root-level `supabase/schema-*.sql` files applied by hand — some dated AFTER the newest tracked migration. `supabase db` operations that replay migrations would produce a database missing most of our schema. The audit's exact words: "the migration history lies to you."

## Requirements
1. Generate a one-time baseline migration capturing the CURRENT live schema: `supabase db dump` via the linked CLI (repo already linked — see `supabase/.temp/linked-project.json`), saved as `supabase/migrations/<timestamp>_baseline_existing_schema.sql`.
2. Exclude rows/data — schema only (the dump default; confirm no INSERT statements leak in).
3. Do NOT modify or delete the loose `schema-*.sql` files in this task — they remain as historical documentation. The fix only adds the baseline so the tracked history becomes complete going forward.
4. After the baseline exists, add one line to `docs/PRD.md` (or the relevant doc section) stating the convention going forward: ALL new schema changes go through `supabase/migrations/` with `supabase migration new`, never loose schema files. New loose files are a build-discipline violation.
5. Sanity check: the dump should contain our known tables (`stories`, `courses`, `exam_prompts`, `presentation_prompts`, `word_flags`, `song_lyric_attempts`, etc.) and RLS statements for tables that have them.

## Verify before commit
- File lands in `supabase/migrations/` with a proper UTC timestamp prefix.
- `supabase migration list` shows it as the newest.
- Commit message notes this is a baseline capture, not a schema change.
