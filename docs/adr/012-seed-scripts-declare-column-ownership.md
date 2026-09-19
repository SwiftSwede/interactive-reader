# ADR 012: Seed Scripts Must Declare Column Ownership

## Context

On 2026-09-16, `seed-music.ts` wiped Kyle's tap-aligned karaoke JSON in `stories.line_timestamps`. The seed's upsert used a bare `?? null` for the column when the song entry defined no timestamps — so re-seeding overwrote tool-generated data with null. The timestamps represented hours of manual tap-alignment work in `scripts/tap-align-lyrics.html`.

## Decision

Every seed script must declare which columns it owns versus which it never touches:

1. **Owned columns** — the seed is the source of truth and may overwrite.
2. **Never-touch columns** — the seed MUST omit them from the upsert entirely (not write null). `line_timestamps` is tap-align-owned; `seed-music.ts` omits it when the song entry defines none.
3. **Pre-overwrite logging** — when a DB row differs from the seed payload, log the difference before overwriting so the operator sees what is about to change.
4. **Never write null** over tool-generated or teacher-entered data.
5. **Student data guards stay**: `--force` refuses to run when student data exists (e.g. `song_lyric_attempts`).

## Consequences

- Adding a new tool-generated or teacher-entered column requires classifying it in every relevant seed script before that script is next run.
- Seed scripts are content-delivery tools, not schema-of-record: the migration that creates a column is the live source for its constraints (see ADR 007).
- `.cursorrules` keeps a short evergreen rule pointing here; the incident detail lives in this ADR only.
