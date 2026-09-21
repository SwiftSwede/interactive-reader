# Slice 64 — Movie Talk Class (Class 3 Format B): Full Build

You are building the Movie Talk lesson type, the last Sistema de 8 classroom type. The PRD is already updated (Slice 64 row, MovieTalkScene entity, Story fields, CourseSession fields, Kyle's Rules #17/#18) and the methodology wiki page `Language-Wiki/concepts/movietalk-class-methodology.md` → "App Build Decisions" is the decision source of truth. Do not invent schema or design decisions; everything is specced here and in the PRD. When this prompt and the PRD disagree, the PRD wins; flag the disagreement in your plan review.

## Context — read these first

1. `docs/PRD.md` — status banner, Slice 64 row, MovieTalkScene entity block, `synopsis`/`warmup_question` Story fields, `movie_talk_class_answers` on CourseSession, `word_flags.note`, Kyle's Rules #17 and #18.
2. `Language-Wiki/concepts/movietalk-class-methodology.md` → "App Build Decisions" (vault path: `~/Documents/Obsidian Vault/Language-Wiki/concepts/`).
3. `src/components/music/MusicLessonSteps.tsx` — the pacing reference implementation. Movie Talk's step shell MUST match this layout: bottom step-nav pills move the class (teacher), progress dots are teacher-local, Abrir todas/Bloquear pasos in the middle of the bottom row, NO header pacing controls.
4. `src/app/teacher/music-pacing-actions.ts` — the server-action pattern to mirror for movie talk (`initMovieTalkLessonPacing`, `setMovieTalkLessonStep`, `toggleMovieTalkStepLock`).
5. `src/components/PresentationPlayer.tsx` — the comprehension-question + teacher-answer patterns (student textareas + teacher Listo reveal), and `supabase/migrations/20260908170000_presentation_class_answers.sql` (student-read RLS for teacher rows).
6. `src/components/ClassroomYoutubePlayer.tsx` — already accepts `startSeconds`. Slice 64 adds `endSeconds` (auto-pause).
7. `src/components/StorySteps.tsx` + `src/components/InteractiveStory.tsx` — current movie_talk rendering (Escena dividers, no speaker styling).
8. `docs/cursor-prompts/slice-63-music-class.md` — nearest sibling prompt (structure to follow).
9. `docs/adr/` — ADR 009 (word flags, mark-only v1) and ADR 010 (teacher-paced steps). Slice 64 amends ADR 009 (note column) — write a short ADR 011 recording the amendment; do not edit ADR 009.

## What to build

A teacher-paced, scene-cycled lesson page for `Story.kind = "movie_talk"` at `/lesson/[slug]`, plus the word-flag note capability that serves all text-centric kinds. The app replaces Google Slides for this class AND doubles as the post-class review instrument. Intermediate only.

### 1. Migration — `supabase/migrations/20260910100000_slice64_movietalk.sql`

```sql
-- Slice 64: Movie Talk class full build.
-- Do NOT touch course_sessions_session_type_check or course_sessions_activity_check:
-- 'movie_talk' is already a valid value in BOTH (Slice 62, commit 4757073).
-- Do NOT touch stories_kind_check: 'movie_talk' is already a valid Story.kind.

-- 1. Story fields
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS warmup_question TEXT;

-- 2. Scene table: clip data + question ranges (transcript lives in stories.body_text,
--    scenes separated by *** lines — the format the reader already renders)
CREATE TABLE IF NOT EXISTS public.movie_talk_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  scene_number integer NOT NULL,
  youtube_url text,
  start_seconds integer,
  end_seconds integer,
  question_start_position integer,
  question_end_position integer,
  UNIQUE (story_id, scene_number)
);
CREATE INDEX IF NOT EXISTS idx_movie_talk_scenes_story ON public.movie_talk_scenes(story_id);

-- 3. Teacher's live class answers (pattern: song_class_answers, Slice 63)
ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS movie_talk_class_answers JSONB NOT NULL DEFAULT '{}';

-- 4. Word-flag notes (amends ADR 009's mark-only v1 — see ADR 011)
ALTER TABLE public.word_flags ADD COLUMN IF NOT EXISTS note TEXT;
```

RLS for `movie_talk_scenes`: teachers read/write; enrolled students read (same pattern as `word_flags` in `20260908120000_slice62_dialogue_flags.sql`); no student writes. `movie_talk_class_answers` rides CourseSession's existing RLS + Realtime publication (students already subscribe to course_sessions UPDATE).

### 2. Types — `src/types/index.ts`

- `MovieTalkScene` type matching the table (camelCase fields via the data loader).
- `Story` gains `synopsis?: string | null`, `warmupQuestion?: string | null`.
- Extend the `CourseSession`-ish payload types where `song_class_answers` appears (sessions.ts row types) with `movie_talk_class_answers`.
- `WordFlag` gains `note?: string | null`.

### 3. Lib — `src/lib/movietalk.ts` (new)

Model on `src/lib/music.ts`:

```ts
export type MovieTalkStepId =
  | "warmup"
  | "synopsis"
  | `scene_${number}_video`     // per scene: Video + Preguntas (ONE step)
  | `scene_${number}_dialogo`   // per scene: the transcript / role-read
  | "end";

// movieTalkStepList(story, scenes): builds the ordered step list.
// warmup only when story.warmupQuestion is non-empty.
// synopsis always (if story.synopsis is empty, render an empty-state card — do not
// silently omit; the teacher may not have pasted it yet).
// per scene: scene_N_video then scene_N_dialogo.
// end step always.

// encodeMovieTalkStep / decodeMovieTalkStep / movieTalkStepIndex / adjacentMovieTalkStep
// — same contract as music.ts. decode falls back to the first step on unknown values.
// Step ids stored in lesson_step_current exactly as encoded (scene numbers are stable
// because scene rows are keyed 1..N with UNIQUE (story_id, scene_number)).

// splitTranscriptScenes(bodyText): string[] — split on *** lines, trim, drop empties.
// Length must equal scene rows; if it doesn't, the player degrades: renders the
// whole transcript on the last scene's Diálogo step and logs a warning. Never crash.

// speakerOfLine(line): string | null — /^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+)-/ (Name- prefix).
// Character list derivation: union of speakerOfLine across ALL scenes' transcripts,
// first-appearance order, deduped, EXCLUDING bracketed stage directions.

// characterLinesInScene(sceneTranscript, character): line indices the character speaks
// in that scene — the highlight set for the character band.

// movieTalkSceneQuestions(questions, scene): ComprehensionQuestion[] — slice by
// question_start_position..question_end_position.
```

All pure functions; unit-test in `src/lib/movietalk.test.ts` (splitTranscriptScenes edge cases: no `***` at all, `***` with surrounding whitespace, trailing `***`; speakerOfLine: `Hardy-Rémy...`, `Student 1-Fuck...`, bracketed lines, `Name:` dialogue format must NOT match).

### 4. Data loading — `src/lib/stories.ts` + `src/app/lesson/[slug]/page.tsx`

- Load `movie_talk_scenes` (ordered by scene_number) + the story's comprehension questions when `kind === "movie_talk"`. Pass scenes into the step component.
- `body_text` holds the whole transcript with `***` separators (existing convention). Character names, stage directions in brackets `[...]` render as muted text on their own lines.

### 5. Player — `src/components/movietalk/MovieTalkLessonSteps.tsx` (new)

Same skeleton as `MusicLessonSteps.tsx`: Realtime subscription on course_sessions (lesson_step_current, lesson_step_locked, movie_talk_class_answers, class_ended_at), progress dots (teacher-local tap-to-jump), bottom step-nav (Atrás pill / Bloquear pasos-Abrir todas / Siguiente pill), forward-locked while `studentLive && locked && index > classIndex`, back always allowed, snap-forward on teacher pill (writes lesson_step_current via server action), lock auto-init on first teacher open (mirror `initMusicLessonPacing` semantics).

Step renderers:

- **Warm-up** (`warmup`): card with `story.warmupQuestion`, display only. Verbal discussion; no input.
- **Sinopsis** (`synopsis`): card with `story.synopsis`. Empty state: "El Profe Kyle aún no ha compartido la sinopsis."
- **Video + Preguntas** (`scene_N_video`): `ClassroomYoutubePlayer` (sessionId, startSeconds = scene.start_seconds, NEW endSeconds = scene.end_seconds → auto-pause via the player's timeupdate loop) + the scene's questions below it, each with a textarea (student, optional). Student answers autosave to comprehension_responses (existing table/pattern: UNIQUE(user_id, question_id, session_id) upsert, debounced). When `movie_talk_class_answers[String(question.position)]` exists, render the teacher's answer BELOW the student's textarea in a distinct block ("El Profe Kyle respondió:") — this is the teacher-gated live reveal. Dead clip: `youtube_url` null OR embed fails → "Clip no disponible" card, questions still render. Missing scene row (splitTranscriptScenes length mismatch) → show all questions for that scene via the seed's ranges; never crash.
- **Diálogo** (`scene_N_dialogo`): the scene's transcript. Character band on top (horizontal scroll chips, derived from whole-lesson transcripts). Tap chip → that character's line-intro names highlight within THIS scene only; tap another → switch; tap outside the transcript container → deselect. Selection is local React state only (resets per scene by construction: state lives in the step component). Transcript rendering reuses the word-span markup (wordFlagClassName, WordTooltip) so flags/tooltips/annotations work. Speaker name (`Name-`) styled terracotta label (match dialogue styling). Teacher in live mode: ⌘B/⌘U flag hotkeys work here (existing Slice 62 wiring).
- **End** (`end`): "Eso es todo. Vuelve a este link después de clase para repasar."

Teacher's own answer inputs: on the Video+Preguntas step, teacher sees a second textarea under each question ("Tu respuesta para la clase") which writes `movie_talk_class_answers` (server action, debounced ~400ms like song_class_answers). Realtime pushes it to student phones.

**Review mode** (after Terminar clase / past the window): free navigation, teacher answers always visible, transcript flags render for students, noted words tappable (lightbox).

### 6. Word-flag notes — extend, do not rebuild

- `word_flags.note` (migration above). Server actions in `src/app/lesson/[slug]/word-flag-actions.ts`: `saveWordFlagNote(storyId, flagText, occurrenceIndex, flagType, note)` — teacher-only, upsert by the existing UNIQUE anchor.
- Teacher UI: in the pinned WordTooltip (teacher mode), a small "Nota" affordance opens a textarea → save. Writing-class pattern: click the flagged word, write the explanation.
- Student UI: flagged word WITH a note renders with the existing flag class + a subtle note affordance; tap → centered lightbox (reusable small modal, aria-modal, focus trap, Esc + click-outside close) showing the note. Works on story, dialogue, AND movie talk kinds (the column is shared; gate nothing by kind).
- Keep ADR 009's semantics: underline = pronunciation, bold = meaning. The note is optional metadata on either type.

### 7. Speaker styling in the reader — `src/components/InteractiveStory.tsx`

- Extend the existing `dialogueName` regex to accept the movie-talk format for `kind === "movie_talk"`: `^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+)-` (Name- prefix) in addition to `Name:` (dialogue). Style the first token the same terracotta heading treatment. Stage directions `^[...]` render muted.
- Word annotation/anchoring must NOT count speaker-name tokens or the `***` divider toward occurrence indices: verify occurrence_index stability when body_text contains `Name-` prefixes (run annotate-story on the seed; flags anchored by text+occurrence survive).

### 8. Teacher pacing actions — `src/app/teacher/movietalk-pacing-actions.ts` (new)

Mirror `music-pacing-actions.ts` exactly (teacherSongContext → teacherMovieTalkContext with session_type = "movie_talk"; init/setStep/toggleLock), replacing step validation with movietalk.ts validation. Add `saveMovieTalkClassAnswers(sessionId, answers)` — same shape as saveSongClassAnswers but keyed by question position, storing into `movie_talk_class_answers`.

### 9. Seed — `scripts/seed-movietalk.ts` (new)

Canonical shape (typed array, `--slug` filter, upsert by title+level, `--force` guard refusing to delete scenes/questions rows that have live student comprehension_responses without the flag). LESSONS[0] = The Holdovers (real data below). Also update `SCRIPTS.md`.

The seed:

1. Upserts the story row: `kind: "movie_talk"`, level intermediate, `body_text` = full transcript with `***` between scenes, `synopsis`, `warmup_question: null` (this deck has none), `youtube_url` null at the story level (per-scene URLs).
2. Deletes + reinserts scene rows (idempotent by story_id + scene_number; `--force` gate on comprehension_responses referencing this story's questions in a live session).
3. Upserts ComprehensionQuestion rows (positions 1-10, scene ranges recorded on scene rows: scene 1 → 1-3, scene 2 → 4-6, scene 3 → 7-10).
4. **Missing-answer AI draft:** for any question whose `answer` is empty/missing, call the OpenRouter LLM with the scene transcript as context and store the draft in `answer` (flagged: prefix nothing in the stored text — the Slice 55 editor shows an "AI draft" marker via the `answer_is_ai` convention... simplest: prefix the note in a comment column is over-engineering; instead the seed prints which answers were AI-drafted so Kyle reviews them in the editor). Cost ~$0.01. The Holdovers deck has all 10 answers, so the draft path runs only for future lessons.

**The Holdovers seed data** (deck "2. Movietalk Int: The Holdovers", fetched 2026-09-09, answers added by Kyle 2026-09-09):

- slug: `the-holdovers`
- title: `The Holdovers`
- synopsis: "From acclaimed director Alexander Payne, THE HOLDOVERS follows a curmudgeonly instructor (Paul Giamatti) at a New England prep school who is forced to remain on campus during Christmas break to babysit the handful of students with nowhere to go. Eventually he forms an unlikely bond with one of them, a damaged, brainy troublemaker (newcomer Dominic Sessa), and with the school's head cook, who has just lost a son in Vietnam (Da'Vine Joy Randolph)."
- Scene 1: `https://www.youtube.com/watch?v=l5b_MD-Rd-E`, start null, end null. Questions (deck corrected 2026-09-09, Hardy→Hunham):
  1. "What is Hunham's reputation as a teacher?" → "He has a reputation of being a hardass and stickler to the rules."
  2. "Does the headmaster want Hunham to be stricter or more lenient with the students?" → "He wants him to be more lenient with the students."
  3. "Did the students do well or horribly on their exams?" → "They did horribly on their exams."
- Scene 2: `https://www.youtube.com/watch?v=7wOotNsE2ZI`, start null, end null. Questions:
  4. "What bad news did Angus get from his mother?" → "He found out that he wasn't going to St Kitts for Christmas since his mother was going on a honeymoon with her new husband."
  5. "Would the holdovers be relaxing during the break?" → "No, they would be studying and exercising during their break."
  6. "Where would the holdovers be doing physical exercise?" → "They would be doing exercise outside in the cold."
- Scene 3: `https://www.youtube.com/watch?v=RlSYOmy9XGs`, start null, end null. Questions (deck corrected 2026-09-09, Hardy→Hunham; the "fire Hardy" in answer 9 is correct — Hardy is the headmaster):
  7. "What did Hunham threaten to give Angus for disobeying him?" → "He threatened to give him a detention."
  8. "Did Angus' threat work?" → "No. Angus completely disregarded it. He said being there with Hunham was already detention."
  9. "Why didn't Angus and Hunham want to fill out the form?" → "If they filled it out, the school and parents would be informed and they would fire Hardy."
  10. "What did Angus injure by jumping off the springboard?" → "He injured his shoulder."

Transcript: paste from the deck (3 scenes of Name-Dialogue lines, `***` separators, bracketed stage directions on their own lines). Source: the deck export fetched 2026-09-09; deck text is the source of truth. One transcription fix REQUIRED at seed time: the deck line "Angus-Without exercise, the body devours itself. Paul-You are careening towards suspension!..." is TWO speakers on one line — split it into two `Name-Dialogue` lines before seeding. Also note scene 3's transcript switches to `Paul` for Hunham and `Angus` for Tully (the character-band derivation must dedupe by speaker string as-is; Paul/Hunham and Angus/Tully will appear as distinct chips — acceptable for the seed, flag to Kyle in the seed script's console output).

The seed data above is ALREADY the corrected version of the deck: Kyle fixed the Hardy/Hunham speaker mismatch in Google Drive on 2026-09-09 (questions 1-2 and 7-9 now say Hunham, the teacher; answer 9's "fire Hardy" stays — Hardy is the headmaster, and the headmaster firing a teacher is the correct threat). The scene-3 stage directions also now read "[Hunham looks at Mary]" and "[Hunham hangs up the phone]". Paste the transcript from the corrected deck (fetch it fresh at build time; do not use an older export). No speaker-mismatch warnings are needed for the Hardy/Hunham issue anymore — but keep the seed's console warning about scene 3's Paul/Hunham naming split (the transcript calls the teacher "Paul" in scene 3 and "Hunham" in scenes 1-2; they appear as distinct character-band chips).

### 10. Slice 55 addendum — `docs/cursor-prompts/slice-55-teacher-content-editor.md`

Append: movie talk editor scope — synopsis, warmup_question, scenes CRUD (youtube_url, start_seconds, end_seconds), per-question answer editing, transcript editing (body_text with `***` validation: scene count must match scene rows), word-flag note editing, and the comprehension-question answer review (AI-draft marker). Desync guard: refuse re-seed/scene-structure changes when comprehension_responses exist for the story's questions in a live session (`--force` opt-in), same convention as other seeds.

## Files to create

1. `supabase/migrations/20260910100000_slice64_movietalk.sql`
2. `src/lib/movietalk.ts` + `src/lib/movietalk.test.ts`
3. `src/components/movietalk/MovieTalkLessonSteps.tsx` (+ small step components as needed)
4. `src/components/movietalk/CharacterBand.tsx`
5. `src/components/movietalk/SceneVideoQuestions.tsx`
6. `src/components/movietalk/SceneDialogue.tsx`
7. `src/app/teacher/movietalk-pacing-actions.ts`
8. `scripts/seed-movietalk.ts`
9. `docs/adr/011-word-flag-notes.md` (records the ADR 009 amendment: note column, student lightbox, all text-centric kinds)
10. `src/components/NoteLightbox.tsx` (shared: centered modal, aria-modal, focus trap, Esc/click-outside)

## Files to modify

1. `src/types/index.ts` — MovieTalkScene, Story synopsis/warmupQuestion, WordFlag.note
2. `src/lib/stories.ts` — load scenes + questions for movie_talk
3. `src/app/lesson/[slug]/page.tsx` — route kind movie_talk to MovieTalkLessonSteps (same branch pattern as songs)
4. `src/components/StorySteps.tsx` — remove the old movie_talk transcript wall (superseded; keep the song branch intact)
5. `src/components/InteractiveStory.tsx` — speaker regex gains `Name-` for movie_talk; stage directions muted; occurrence anchoring verified
6. `src/app/lesson/[slug]/word-flag-actions.ts` — saveWordFlagNote
7. `src/lib/sessions.ts` — movie_talk_class_answers row type + parse
8. `SCRIPTS.md` — seed-movietalk entry
9. `docs/cursor-prompts/slice-55-teacher-content-editor.md` — addendum

## Don't build (future, Kyle-declined)

- Pre-inter Movietalk — retired, replaced by Video Summary Translation. No pre-int flows.
- Role registry / character conflict handling — selections are independent local state.
- Character-selection persistence across scenes — resets per scene, deliberate.
- A separate vocabulary/Terminología step — flags + notes ARE the vocabulary surface (Kyle teaches in context; 2026-09-08: "Better to learn it in context").
- Per-student analytics for movie talk — not now.
- Hosted video uploads — YouTube embeds only (Bunny Stream is out; clip rot degrades gracefully).
- AI-drafting answers at class time — drafts happen at seed time only.

## Kyle's Rules (from PRD Section 10 — all apply)

#17 teacher-paced steps (bottom pills only, no header pacing) and #18 (tap-to-reveal only, hover banned; flags + notes are the vocabulary surface) are the load-bearing ones here. Also: no em dashes in UI text; Spanish UI copy; mobile-first 375px; never break a working slice (songs/presentation/dialogue patterns must stay intact); commit after the slice.

## Build order

1. Migration SQL → apply to Supabase (dashboard SQL editor or `supabase db push`; do NOT attempt DDL via REST).
2. Types → `src/lib/movietalk.ts` + tests → sessions/stories loaders.
3. Player components → route branch → pacing actions.
4. Word-flag note actions + NoteLightbox + tooltip integration.
5. InteractiveStory speaker-regex extension (+ verify occurrence anchoring).
6. Seed script + run `npx tsx scripts/seed-movietalk.ts --slug the-holdovers` (AI answers skipped: deck has all 10; still print the speaker-mismatch warnings).
7. `npx next build` green, then `npx tsx scripts/annotate-story.ts --slug the-holdovers` (transcript annotation; verify character names are NOT annotated).
8. Truth-doc sync: update PRD Slice 64 row status + Current Phase banner; record any spec deviations you decide during the build in the row (Kyle ratifies at plan review).
9. Commit: `Slice 64: Movie Talk class with scene steps, character band, and flag notes.`

## Verification script (the PRD row's acceptance)

After seeding and assigning a session: open as student at 375px — Sinopsis card renders; teacher taps the bottom Siguiente pill → student phone follows in Realtime; Video step shows the synced embed with questions below; student types → autosaves (refresh survives); teacher types his answer → appears below the student's on their phone; teacher advances to Diálogo → transcript with character band; tap Hardy → his lines highlight; tap Angus → switches; tap outside → deselects; dead-clip simulation (blank one scene's youtube_url in Supabase) → "Clip no disponible" card + questions still render; ⌘U a word as teacher during role-read, click it, write a note → student taps → lightbox; review mode after Terminar clase → free navigation, teacher answers + notes visible; a student who never opens the link changes nothing (class runs identically). `npx next build` passes; `git status` clean after commit.
