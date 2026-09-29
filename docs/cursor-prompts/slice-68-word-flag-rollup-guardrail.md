# Cursor prompt — P0 guardrail: word-flag-request rollup before delete (Slice 68)

## Context

Read `docs/adr/015-deficiency-queue.md` first (Decision 1 is this slice). `word_flag_requests` rows are the per-student "No entendí" signal. They are deleted in two places today, and in both the per-student data dies with no rollup:

1. `ON DELETE CASCADE` via `word_flag_requests_course_session_id_fkey` when a `course_sessions` row is deleted (session delete / cleanup paths).
2. `deleteSessionRequests()` in `src/app/lesson/[slug]/word-flag-actions.ts` (targeted per-word delete when the teacher converts requests into a flag).

Note: `endClassSession` (`src/app/teacher/end-class-action.ts`) does NOT delete requests — do not touch it for this slice.

## Build

### 1. Migration: rollup table + delete trigger

New table `word_flag_request_rollup`:

- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE`
- `flag_text text NOT NULL`
- `occurrence_index integer NOT NULL`
- `times_requested integer NOT NULL DEFAULT 1`
- `last_requested_at timestamptz NOT NULL`
- `first_requested_at timestamptz NOT NULL`
- PRIMARY KEY `(user_id, story_id, flag_text, occurrence_index)`

RLS: teacher SELECT-only (teacher owns course with enrollment matching user_id, same enrollment-scoped pattern as other teacher reads). No student policy — this is deficiency data and must be structurally invisible on student routes (ADR 015 Decision 11).

Trigger `trg_word_flag_requests_rollup` — BEFORE DELETE (row-level) on `word_flag_requests`, SECURITY DEFINER function that upserts into the rollup: increment `times_requested`, set `last_requested_at = GREATEST(existing, OLD.created_at)`, `first_requested_at = LEAST(existing, OLD.created_at)`. Use a single upsert with `times_requested = word_flag_request_rollup.times_requested + 1`. Handle both delete paths for free (cascade and targeted) with no application-code changes. Keep `SET search_path = public` on the function.

### 2. Event log (small, same slice per ADR 015)

New append-only table `learning_events`: `id uuid`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `event_type text NOT NULL`, `occurred_at timestamptz NOT NULL DEFAULT now()`, `course_session_id uuid NULL REFERENCES public.course_sessions(id) ON DELETE SET NULL`, `detail jsonb NOT NULL DEFAULT '{}'`, index on `(user_id, event_type, occurred_at)`. Append-only: no UPDATE policy, no DELETE policy, only insert+teacher-read RLS. Extend the same trigger (or add a second trigger) to insert one `learning_events` row with `event_type = 'word_flag_request'` and `detail = {story_id, flag_text, occurrence_index}` on each request deletion. Do NOT backfill history — the log starts now. Do not add any other event types in this slice.

### 3. Verification

- Migration applies clean on the current schema (`supabase db push` locally).
- Test: insert a request row, delete its session, assert rollup row exists and a `learning_events` row exists. Delete the same word for the same student in a second session, assert `times_requested = 2`.
- `npx tsc --noEmit` passes (no src/ changes expected in this slice beyond possibly re-exporting types; if no src changes, say so).

## Constraints

- Do not modify `word_flag_requests` schema or ADR 009's anchor semantics. Requests remain session-scoped live signals; the rollup is the durable per-student layer.
- No UI in this slice. No new npm deps. One migration file: `supabase/migrations/20260928_slice68_word_flag_rollup.sql`.
- Commit the migration alone; do not sweep unrelated working-tree changes into the commit.
