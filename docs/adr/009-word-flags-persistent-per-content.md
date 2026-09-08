# ADR 009: Word flags are persistent per-content marks, not session records

## Context

Every Dialogue class (Sistema de 8, Class 5) ends with a 20-30 minute vocabulary review. Kyle walks the shared text and teaches two kinds of words: ones students mispronounced during the breakout read (he underlines them live), and ones his learner intuition says will block comprehension (he bolds them during prep). Today this lives as formatting in Google Slides — invisible to the app, redone by hand every month, and lost when a dialogue is reused.

The app already has an interaction-shaped precedent: `VideoSummaryTeachingNote` (Slice 54) — teacher selects a word, classifies it, saves a note. But that table is **session-tied**: every row belongs to a `course_session_id`, because each video-summary class creates fresh Spanish paragraphs and fresh translations. Notes are the record of one class.

Dialogue flags are the opposite shape. Kyle's rationale (2026-09-07 brainstorm): *the same ~99% of words trip up every group*. A word that blocks the pre-int group in September will block the pre-int group in October. Flags converge over iterations toward "the words this text always needs explained." They are **teaching annotations on the content**, not records of a class. And they must be fully CRUD — removing a wrong mark is as important as adding one, because the flag set is curated, not accreted.

## Decision

1. **New table `word_flags` — keyed on content, not session.** One row per flagged word: `story_id`, `flag_type` (`underline` | `bold`), `flag_text`, `occurrence_index`, `created_at`. No `course_session_id` column. No note field.
2. **Anchor on `{story_id, flag_text, occurrence_index}`, NOT `word_id`.** The `words` table is wiped and re-inserted on every re-annotation run (`annotate-story.ts`), which would orphan any FK-anchored flag. The text-occurrence anchor survives re-annotation and survives `body_text` edits that don't touch the flagged token. One flag per anchor: UNIQUE on `(story_id, flag_text, occurrence_index, flag_type)`.
3. **Mark-only, no notes.** Bold = explain meaning and use. Underline = explain pronunciation. The marks jog Kyle's memory; the tooltip layer already carries every word's translation and IPA. Classification notes are the VideoSummaryTeachingNote pattern and stay there.
4. **Two layers, two tables.** Students' "No entendí" signals are a different layer entirely: `word_flag_requests` (ADR scope: per-student, session-scoped, Realtime-aggregated into count badges). Only the teacher's flags mutate the shared text. The request table is deliberately session-scoped so the badge means "N students in this class asked" — the durable layer is the flags; requests are live classroom signals.
4. **Full CRUD, any time.** Create before class (prep), during class (live), after class (curation). Delete = unmark. The flags persist into every future class that assigns this dialogue.
5. **Rendering is teacher-only in v1.** Kyle screen-shares the text during vocabulary review; students see flags through Zoom. No Realtime fan-out for flags, no student-facing rendering. Review-mode visibility is a possible later read-policy change, not this decision.
6. **UI scope: story, dialogue, movie talk.** The table covers all Story-row kinds; the UI ships for the three. Song lyrics are excluded (Truquitos ghosting is a separate live-annotation workflow, Slice 57 territory), video summary excluded (Spanish text, has its own note system).

## Contrast with VideoSummaryTeachingNote

| | `word_flags` | `video_summary_teaching_notes` |
|---|---|---|
| Grain | Per-content, persistent | Per-session, class record |
| Why | Same words trip every group | Each class creates fresh paragraphs |
| Note field | None — mark only | Required — classification + text |
| Realtime | None (teacher-only rendering) | Required (students see notes in review) |
| Cleanup | Never (curated set) | Cascades with session delete |

## Consequences

- The `dialogue` session type (this same slice) reuses the story lesson path — no new route, no new resolver branch. `session_type = "dialogue"` requires `story_id` where `stories.kind = "dialogue"`, mirroring how `video_summary` reuses `story_id`.
- The flag layer matches against the reader's existing tokenization: the flag row's `occurrence_index` must be computed with the same whitespace tokenization `InteractiveStory` uses to render word spans. Implementation detail lives in the Cursor prompt (`docs/cursor-prompts/slice-62-dialogue-flags.md`).
- Flag rendering lands on `.word-span` elements as `word-flag-bold` / `word-flag-underline` classes — React-managed, alongside `.word-seen`/`.word-active`. No interference with the karaoke direct-DOM highlight (RAF-managed `.word-audio-current`, different class set).
- The text-occurrence anchor has a known edge: if `body_text` is edited such that the flagged token's occurrence order shifts (words inserted/deleted before it), a flag can land on the wrong occurrence. Acceptable for a curated small-N flag set Kyle maintains himself; the alternative (anchoring to word ids) breaks on every re-annotation, which happens far more often than body edits.
- Future consumer self-study could expose flags as "words to pre-teach" hints — the content-keyed shape makes that a pure read-policy change.
