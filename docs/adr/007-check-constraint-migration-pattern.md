# ADR 007: CHECK Constraint Migration Pattern for Enum Columns

## Context

The `stories` table has a `kind` column with a CHECK constraint (`stories_kind_check`) that limits allowed values. This was introduced to enforce data integrity at the database level rather than relying solely on application code. When a new `Story.kind` value is added (e.g., `video_summary`), the CHECK constraint must be updated to include the new value.

This was the #1 most common schema migration error. The initial schema file for `video_summary` omitted the constraint update, causing a blocking seed error: `violates check constraint "stories_kind_check"`. The same pattern applies to `CourseSession.session_type`.

## Decision

Every schema migration that adds a new value to an enum-like column (CHECK-constrained, not native Postgres enum) must include an explicit constraint drop-and-recreate block:

```sql
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_kind_check;
ALTER TABLE stories ADD CONSTRAINT stories_kind_check
  CHECK (kind IN ('story', 'dialogue', 'movie_talk', 'song', 'video_summary', '<new_kind>'));
```

This pattern is documented in:
- `.cursorrules` (Build discipline > Decisions review, with this as the canonical example)
- The Hermes `interactive-learning-platform` skill (CHECK constraint pitfall section)
- Every schema migration file that adds a new kind value

## Consequences

- New `kind` or `session_type` values cannot be added without updating the constraint. This is intentional: it forces an explicit migration step.
- The constraint history is:
  - `schema-phase4a.sql`: `('story', 'dialogue', 'movie_talk')`
  - `schema-phase5-song.sql`: added `'song'`
  - `schema-phase5-video-summary.sql`: added `'video_summary'`
- The "decisions review" question (added to `.cursorrules`) is designed to surface this: after adding a new kind, the agent should report "I added the kind to the enum but I'm not sure if the CHECK constraint needs updating."
- Migration files use `IF NOT EXISTS` and `DROP CONSTRAINT IF EXISTS` for idempotency, so re-running them is safe.
