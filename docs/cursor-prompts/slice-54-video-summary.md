# Cursor Prompt: Build Slice 54 — Video Summary Translation Page

## Context

Read these files before starting:
- `docs/PRD.md` — Search for "Slice 54" and "video_summary" and "VideoSummaryParagraph". The full data model, activity flow, and slice spec are there.
- `supabase/schema-phase5-video-summary.sql` — The SQL schema for the three new tables + new Story columns. Run this on the database first.
- `Language-Wiki/concepts/video-summary-translation-methodology.md` (Obsidian vault) — The full methodology page. Read for context on how this class works.

## What to build

A new page component for the Video Summary Translation class (pre-intermediate Class 3). This is a classroom lesson type where:

1. Students watch a dialogue-free YouTube video (3-6 min)
2. Write their own summary in a 5-minute free writing sprint
3. Watch the teacher type English translations of Spanish paragraphs live (Supabase Realtime sync)
4. Teacher can flag words/phrases with inline notes during the class

## Route

`/story/[slug]` — the existing story route. When `Story.kind === "video_summary"`, render the `VideoSummaryPlayer` component instead of `InteractiveStory`. Follow the same pattern as how `StorySteps.tsx` already branches on `kind` for dialogue/movie_talk/song.

## Data model (already in PRD, already in SQL schema)

Three new tables:
- `video_summary_paragraphs` — one row per paragraph. Fields: `story_id`, `position`, `spanish_text`, `english_translation` (null until teacher types), `translation_started_at`, `translation_completed_at`
- `video_summary_free_writes` — student free writing submissions. Fields: `story_id`, `user_id`, `course_session_id`, `submission_text`, `started_at`, `submitted_at`, `elapsed_seconds`, `word_count`
- `video_summary_teaching_notes` — teacher's inline flags. Fields: `story_id`, `course_session_id`, `paragraph_position`, `selected_text`, `note`, `note_type` (enum: vocabulary/grammar/pronunciation/cultural), `created_by`

New Story columns: `spanish_summary` (text), `free_write_minutes` (int, default 5)

`session_type = "video_summary"` — uses `story_id` (same as story sessions). Update the `CourseSession` session_type enum and the teacher session page to recognize this type.

## Page layout (classroom mode — during 90-min window)

The page has these sections, displayed in step-based flow (same pattern as StorySteps — one activity at a time with progress dots):

### Step 1: "El Video" — YouTube embed
- Full-width YouTube embed (`story.youtube_url`). Use the same embed pattern as the Music class.
- Below the video: "Toma notas de lo que ves" label. No text input here — students take notes on their own device/paper.
- Button: "Empezar resumen" → moves to Step 2

### Step 2: "Tu Resumen" — Free writing sprint
- Timer at top (5 minutes, from `story.free_write_minutes`). Same timer pattern as the Writing class (`timer_started_at` on the session, synced via Realtime).
- Large text area. Student types their summary of the video.
- "Entregar" button (or auto-submit at zero — same as pre-int writing class behavior).
- On submit: save to `video_summary_free_writes` with `elapsed_seconds` and `word_count`.
- After submit: "Entregado. Sigue a Traducción." Students open Step 3 themselves when the 5-minute timer hits zero. Entregar is disabled until then. No teacher Continuar button.

### Step 3: "Traducción" — Bilingual translation display
This is the core of the class. Display all paragraphs from `video_summary_paragraphs`, ordered by `position`:

For each paragraph:
- **Spanish text** (from `video_summary_paragraphs.spanish_text`) — rendered as readable text. Words are NOT interactive tooltips (this is not the story reader). Just plain text, but selectable for teacher flagging (see below).
- **English translation area** below the Spanish text:
  - **Teacher view:** A `<textarea>` where Kyle types the English translation live. On every keystroke, update `video_summary_paragraphs.english_translation` via Supabase Realtime. Set `translation_started_at` on first keystroke, `translation_completed_at` when Kyle clicks "Listo" on that paragraph.
  - **Student view:** A read-only display that shows `english_translation` as it appears via Realtime sync. If empty, show nothing. As teacher types, the text appears character by character.

- **Teacher reference panel** (collapsible, teacher-only): Shows the original English summary (`story.body_text`) for the current paragraph. This is Kyle's cheat sheet — he can glance at it while facilitating the translation. Students never see this. Use the existing `englishParagraphs[position]` from `story.body_text` split by `\n\n`.

### Teaching notes (teacher-only interaction, visible to all)
- Teacher can select (highlight) any word or phrase in the Spanish text or the English translation text of any paragraph.
- On selection: a small popup appears with a text field for the note and a type selector (vocabulary / grammar / pronunciation / cultural).
- On save: insert into `video_summary_teaching_notes` with `paragraph_position`, `selected_text`, `note`, `note_type`.
- The highlighted text gets a yellow background marker, visible to all users via Realtime.
- Existing notes for the session are loaded on page mount and rendered as inline markers.

## Page layout (review mode — after 90-min window)

Same as classroom mode but:
- No YouTube video (or keep it — students may want to rewatch. Your call, but keep it.)
- No free writing text area (already submitted)
- All `english_translation` fields are filled (teacher completed them during class). Display as static text, no textareas.
- Teaching notes are visible as inline markers with the note text shown on hover/tap.
- Students see the completed translations + notes. They do NOT see other students' free writing texts.
- Teacher sees a "Ver resúmenes de estudiantes" button that shows all free writing submissions for the session (links to group exam diagnostic).

## Access control (reuse existing patterns)

- Same session link pattern as story/writing/exam sessions.
- `session_type = "video_summary"` in the session access check.
- During 90-min window: classroom mode (teacher writes translations, students watch).
- After 90-min window: review mode (all translations visible, no editing).
- Teacher is always the writer for translation fields. Students never see a textarea for translations.
- Free writing: students write their own. Teacher sees all. Students don't see each other's.
- Teaching notes: teacher creates. Students see the markers but cannot create notes.

## Supabase Realtime

Subscribe to `video_summary_paragraphs` changes (filter by `story_id`). When `english_translation` changes on any row, update the student view. This is the same pattern as the exam group writer — `postgres_changes` on the table, filtered by `story_id`.

Also subscribe to `video_summary_teaching_notes` inserts (filter by `course_session_id`). When a new note is added, render the highlight marker on the corresponding paragraph.

## Components to create

1. `VideoSummaryPlayer.tsx` — main component, handles step flow (Video → Free Write → Translation)
2. `VideoSummaryTranslationStep.tsx` — the bilingual paragraph display with teacher textareas / student Realtime view
3. `VideoSummaryFreeWrite.tsx` — the free writing timer + text area (adapt from Writing class components)
4. `VideoSummaryTeachingNote.tsx` — the note popup + inline marker rendering

## Files to modify

1. `src/components/StorySteps.tsx` — add `"video_summary"` to the kind branching. When `kind === "video_summary"`, render `<VideoSummaryPlayer>` instead of the standard story display.
2. `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — add `"video_summary"` to the `kind` union type and the `openedLabel` function (noun: "el video" or "la traducción").
3. `src/app/story/[slug]/page.tsx` — ensure the access check handles `session_type = "video_summary"` (it should already work since it uses `story_id`, but verify).
4. Any TypeScript types that define `StoryKind` or `session_type` — add `"video_summary"`.

## Seed data

The seed script is at `scripts/seed-video-summary.ts`. Run the schema SQL first, then the seed:

```bash
# 1. Run schema on Supabase (SQL Editor or psql)
#    supabase/schema-phase5-video-summary.sql

# 2. Seed the example content
npx tsx scripts/seed-video-summary.ts
```

The seed creates a Story with slug `shaun-sheep-cabbage-football`, 5 paragraphs of Spanish text (Kyle's edited, English-structured translation), and the original English summary in `body_text`.

## Design system

Follow `DESIGN.md` at the project root. Paper Light theme. Lora for the Spanish/English text (serif, readable). Roboto Flex for UI elements. Terracotta accent for the teacher's translation textarea border. Moss green for the "Listo" button. Yellow (#fef3c7 or similar from the palette) for teaching note highlights.

## Don't build (consumer self-study mode)

Slice 54 is classroom only. The consumer self-study version (student types their own translation, then reveals Kyle's English, AI interlinear correction) is a future slice. Don't build it now. The `ReverseTranslationAttempt` table in the PRD is for that future feature — not this one.
