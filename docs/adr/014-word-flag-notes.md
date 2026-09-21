# ADR 014: Word-flag notes (amends ADR 009)

## Context

ADR 009 shipped mark-only flags: bold = meaning, underline = pronunciation, teacher-only rendering, no note field. Movie Talk (Slice 64) replaces Google Slides, so students need Kyle's in-class explanation on their phones. The same note is useful on story and dialogue, where Kyle already flags words.

ADR 011 is classroom vs consumer product lines. This record is the next number.

## Decision

1. Add nullable `word_flags.note`. The UNIQUE anchor stays `(story_id, flag_text, occurrence_index, flag_type)`. The note is optional metadata on either flag type. Underline still means pronunciation; bold still means meaning.
2. Teacher writes the note from the pinned WordTooltip after a word is flagged.
3. Enrolled classroom students on `story`, `dialogue`, and `movie_talk` (live and review) see flags and tap a noted word to open a centered lightbox. Consumer / open readers stay flag-blind.
4. Do not edit ADR 009. Do not add Realtime publication for `word_flags`. Live-class students poll flags about every 3 seconds so a new mark or note appears without a refresh.

## Consequences

- Student SELECT RLS on `word_flags` is enrollment-scoped (`course_sessions.story_id` + `is_enrolled_in_course`).
- Notes work on every text-centric kind without a kind gate in the tooltip.
- Screen-share is no longer required for Movie Talk vocabulary. Story and dialogue students in a classroom session can also read notes on their phones.
