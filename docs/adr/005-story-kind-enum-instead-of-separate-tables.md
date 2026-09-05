# ADR 005: Story Kind Enum Instead of Separate Tables

## Context

The app has multiple content types: stories, dialogues, movie talks, songs, video summaries. These share most fields (slug, title, level, cefr, body_text, word_count, comprehension questions, personal questions, pronunciation drill). Only a few fields are type-specific (e.g., `spanish_summary` and `free_write_minutes` for video summaries).

Two options:
1. Separate tables per content type (`stories`, `dialogues`, `movie_talks`, etc.) with duplicate column definitions.
2. One `stories` table with a `kind` enum column and nullable type-specific columns.

## Decision

Use one `stories` table with a `kind` column. Dialogues, movie talks, songs, and video summaries are all `Story` rows with different `kind` values. Type-specific columns are nullable on the same table.

## Consequences

- All content types share the same slug-based URL structure (`/lesson/[slug]`), annotation pipeline, word lookup tracking, and comprehension/personal question infrastructure. No duplicate code.
- The `kind` column has a CHECK constraint (`stories_kind_check`) that must be updated every time a new kind is added. This is the #1 most common schema migration error. The pattern: `ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_kind_check; ALTER TABLE stories ADD CONSTRAINT stories_kind_check CHECK (kind IN (...))`.
- CourseSession references `story_id` regardless of kind. Session types (`session_type` enum) are a separate axis from content kind.
- The `ContentTag` polymorphic junction uses `content_type = 'story'` for all kinds. Dialogues and movie talks are not separate content types in the tagging system.
- Downside: the `stories` table accumulates nullable columns for type-specific data. This is acceptable given the small number of types and high field overlap.
