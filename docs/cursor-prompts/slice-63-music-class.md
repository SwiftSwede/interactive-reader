# Cursor Prompt: Build Slice 63 — Music Class (Teacher-Paced Steps + Live Worksheet)

## Context

Read these files before starting:

- `docs/PRD.md` — Search for "Slice 63", "SongLyricAttempt", "lesson_step_current", "artist_bio", "song_meaning", "lyrics_ipa", "line_timestamps". The data model, slice row, Kyle's Rules #17, and the resolved-questions entry are all there. The PRD is already updated: do not add tables or fields beyond it.
- `Language-Wiki/concepts/music-class-methodology.md` (Obsidian vault at `/Users/kylote/Documents/Obsidian Vault/`) — the full methodology AND the "Interactive Potential" section: 17 resolved design decisions from three brainstorm rounds with Kyle (2026-09-06/08). This is the reasoning source for every spec choice below. If something here seems unmotivated, the why is in that section.
- `docs/cursor-prompts/slice-61-conversation.md` — the structural template: session access resolution, Realtime sync on course_sessions, teacher round controls, ownership-validated server actions.
- `docs/cursor-prompts/slice-62-dialogue-flags.md` — song became a first-class session_type here. Flagging UI does NOT apply to songs (ADR 009).
- `src/lib/presentation.ts` — the `presentation_step` encode/decode/step-list pattern this slice generalizes into `lesson_step_current`.
- `DESIGN.md` — Paper Light, mobile-first 375px, one focal point per screen, sticky element rules, audio player layout rules.
- `docs/cursor-prompts/slice-55-teacher-content-editor.md` — the "Addendum (Slice 63)" section describes the song editor fields + teacher AI toolbox. Do NOT build any of it in this slice; it is Slice 55 scope.

Repo state (verify, do not trust): `song` is in the `SessionType` union and both CHECK constraints (Slice 62, commit 4757073). `StorySteps.tsx` currently renders songs as: YouTube embed + list-style `MusicBlanks` + lyric text. Summer of '69 is seeded with annotated lyrics and 9 blanks. This slice replaces the song rendering with the full step flow.

## Plan review decisions

Ratified with Kyle during the Slice 63 plan session (2026-09-08). These override this prompt where they conflict.

- **Snap-forward, not clamp-only.** The bottom step pills write `lesson_step_current` and jump every live student to that step. Students may then walk back. Forward past the teacher stays disabled while locked. Late joiners land on the teacher's current step.
- **Pacing is the same bottom row as presentation.** No extra header bar. Teacher session page does **not** get a pacing panel. Analytics stay there (after-class, next to word lookups).
- **Only the bottom pills move the class.** Progress dots are local for Kyle: he can peek at later steps without dragging phones. **Abrir todas** / **Bloquear pasos** sits in the middle of the bottom row.
- **Lock starts when Kyle opens the song lesson as teacher during live class.** First live open with `lesson_step_current` still null: write current = first visible step and `lesson_step_locked = true`. Students who join (or were browsing) snap to that step and cannot go past him. **Abrir todas** is the opt-out and survives a refresh (we do not re-lock if current is already set). If he never opens the lesson page, null/unlocked defaults remain: phones behave as today.
- First bottom **Siguiente** advances from the step Kyle is looking at (after auto-init, that is bio / first visible).
- **2026-09-09:** Kyle dropped the extra header pacing bar after teaching with it. Match presentation: bottom pills move the class, dots stay local peek, Abrir todas in the middle of that row.
- **2026-09-09 (blanks):** One Entregar tap in review/self-study shows marks. Live students only hand in. No Ver respuestas. Wrong answer shows the correct word to the right, between the typed word and the X. Teacher typing in a blank replaces that blank on student phones in Realtime (`song_class_answers`); student `song_lyric_attempts` stay saved.

## What to build

Two things, one slice: **(a) teacher-paced steps** — a generalizable mechanism, implemented for songs; **(b) the full music lesson** — the six-step flow with the live worksheet as its centerpiece.

### (a) Teacher-paced steps (generalizes `presentation_step`; PRD Kyle's Rules #17)

Kyle noticed teacher/student view desync during live classes: students could navigate ahead of where he was teaching. Resolution: in live classroom mode, students are locked to the teacher's current step.

- New CourseSession fields: `lesson_step_current` (text, nullable) and `lesson_step_locked` (boolean, default false).
- While `lesson_step_locked` is true AND the session is in live classroom mode (teaching mode active): a student's current step is clamped to at most the index of `lesson_step_current`. Navigating back to earlier steps stays allowed. Forward nav beyond the teacher's step is disabled (pill arrow disabled state + a lock hint on the progress dots).
- Review mode (after Terminar clase / overtime) and consumer mode (no session): free navigation, no clamping.
- Realtime: students subscribe to `course_sessions` filtered by session id (existing pattern); any change to `lesson_step_current` or `lesson_step_locked` recomputes the clamp. Late joiners land on the teacher's current step (or earlier if they choose).
- Defaults preserve the adoption-gated philosophy: `lesson_step_locked = false` and `lesson_step_current = null` means no clamping at all. If Kyle never touches the pacing panel, the page behaves exactly as today. The class must run identically whether or not he uses it.
- Teacher panel on the session detail page (song sessions only in this slice): current step name, **Siguiente sección** (advance `lesson_step_current`), **Volver** (go back), **Bloquear pasos / Abrir todas** (toggle `lesson_step_locked`). Zero confirmation dialogs; Kyle taps fast mid-class. When he first advances with the panel, `lesson_step_current` starts at the first step of this song's step list.
- Presentation keeps its own `presentation_step` field; do not migrate it. This slice's `lesson_step_current` is the pattern future step-based lesson types adopt.
- Write `docs/adr/010-teacher-paced-lesson-steps.md`: the decision, the desync motivation (Kyle, 2026-09-08), presentation_step as precedent, the null/unlocked defaults, and the rule that new step-based lesson types MUST implement the lock.

### (b) The music lesson (six steps, mirroring the live class segments AND the Etapa 1-4 self-study guide)

For `story.kind = "song"`, `StorySteps` builds this step list instead of the current one. Every content-dependent step degrades gracefully when its data is null (a song with only lyrics + blanks still renders correctly):

1. **El artista** (hidden when `artist_bio` is null) — the bio paragraphs, rendered with the same Spanish/IPA word tooltips as lyrics and story text. Bio words come from the `words` table where `source = 'bio'`, position-keyed against the bio text. No bio annotations yet (Hermes-side pipeline, later) → plain paragraphs, no tooltips. Vocabulary here is a bonus, not a lesson: no comprehension questions, no drills.
2. **El video** (hidden when `youtube_url` is null) — standard 16:9 YouTube embed. Classroom mode: teacher-controlled playback via the existing `video_playing`/`video_seconds`/`video_rate` sync (students tap once to follow, same as presentation/video summary; Kyle may instead screen-share in Zoom and students simply never tap follow — both paths must work). Review/consumer: normal controls.
3. **Primera escucha** (hidden when `youtube_url` is null) — compact player, NO lyrics on screen. One line of Kyle-voice instruction (micro-explanation, Guiding Principle #12): "Escucha sin leer la letra. ¿Cuánto entiendes? No importa si no entiendes todo." Classroom mode: same teacher sync as the video step.
4. **Completa la canción** (hidden when `lyric_blanks` is empty) — **the live worksheet, the centerpiece.** Full lyrics visible at once (LyricTraining-style, NOT line-by-line), with the 8-10 numbered blanks rendered INLINE at their positions in the lyric lines. Repeated words reuse the same blank number (deck convention — the existing data already encodes this via blank ids). Sticky mini YouTube player (sticky elements may use subtle shadow per DESIGN.md; reuse the StoryAudioPlayer sticky pattern for placement). In live classroom mode the mini player follows the teacher sync when students tap follow.
   - **No instant feedback.** Students type freely; nothing reveals until the exercise is done.
   - **Autosave:** every keystroke, debounced ~1.5s and on blur, upserts `song_lyric_attempts` rows (one per blank). A refresh mid-exercise never loses work. This is the load-bearing exception — see Kyle's Rules below.
   - **Entregar respuestas** button (primary, below the lyrics): enabled when every blank has text. Freezes inputs, scores them, shows "Entregado". Review/self-study: marks appear immediately (check / X + correct word to the right of a miss). Live class: no marks, no Ver respuestas. Teacher live: no Entregar; typing in a blank publishes `song_class_answers` and replaces that blank on student phones. Student submissions stay in `song_lyric_attempts`.
   - No word tooltips in the worksheet (paper-worksheet parity: the paper version has no dictionary either; tooltips live on the lyrics step).
5. **La letra** — the existing lyric rendering (word tooltips, karaoke if word timestamps exist) plus the **song_meaning block** below (header "Qué significa la canción"): Kyle's teacher-authored explanation (meaning, poetry, cultural context). Hidden when null. This block is NEVER AI-generated; render only what Kyle wrote. Its position after the blanks step matches the live class order (answers first, then meaning).
6. **Truquitos y karaoke** (hidden when `youtube_url` is null) — lyrics with a **line-swap toggle** (one switch, top of the step: "Truquitos" on/off): each lyric line swaps between clean text and its connected-speech IPA from `lyrics_ipa` (keyed by `line_index`; lines without an IPA entry stay clean). Toggle is line-swap, NOT hover tooltips (students can't hover while singing). Karaoke: current line highlighted and auto-scrolled (`scrollIntoView` throttled) driven by `line_timestamps` against the YouTube embed playhead; graceful degradation — no timestamps means no highlight/scroll, the step still shows the toggle. **Per-blank seek-back buttons** (small replay icons next to each blank-relevant line): review/consumer mode ONLY, never in live classroom mode; seek the embed to 3 seconds before that line's start. Missing timestamps hide them.
   - IPA everywhere: the app overlay is IPA. Kyle's custom notation never appears in the app.

### Analytics (teacher, derived, no new table)

On the teacher session page for song sessions, below the pacing panel: per-blank difficulty (each blank id: prompt, answer, how many submitted, how many correct — miss rate, like word-lookup aggregation) and per-student scores (display name, correct/total, submitted at). Computed from `song_lyric_attempts` where `submitted_at` is not null. Kyle uses this post-class as one input in his evaluation mix.

## Route

No new route. Songs are story-backed: `/lesson/[slug]` renders `StoryReader` → `StorySteps`. All changes live in StorySteps' song branch + new step components + lib. Do not touch how story, dialogue, movie_talk, or video_summary render.

## Data model (from PRD — exact)

New schema file: `supabase/schema-phase5-music-full.sql` (idempotent, IF NOT EXISTS everywhere).

```sql
-- Story extensions (songs only; all nullable, graceful degradation)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS artist_bio TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS song_meaning TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS lyrics_ipa JSONB;        -- [{line_index, ipa_text}]
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS line_timestamps JSONB;   -- [{line_index, start_seconds, end_seconds}]

-- Teacher-paced steps (generalizable; implemented for songs)
ALTER TABLE public.course_sessions ADD COLUMN IF NOT EXISTS lesson_step_current TEXT;
ALTER TABLE public.course_sessions ADD COLUMN IF NOT EXISTS lesson_step_locked BOOLEAN NOT NULL DEFAULT false;

-- Bio annotation discriminator: bio words and body/lyric words never wipe each other
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'body';
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_source_check;
ALTER TABLE public.words ADD CONSTRAINT words_source_check CHECK (source IN ('body', 'bio'));
-- Existing words rows default to 'body' automatically.

-- The live worksheet record
CREATE TABLE IF NOT EXISTS song_lyric_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_session_id uuid NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  blank_id integer NOT NULL,
  typed_text TEXT,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, user_id, blank_id)
);
```

RLS on `song_lyric_attempts` (mirror the ComprehensionResponse policy shapes):
- SELECT: own rows (`user_id = auth.uid()`) OR the teacher who owns the course via the session.
- INSERT / UPDATE: `user_id = auth.uid()` AND enrolled in the session's course. The server actions additionally refuse updates once `submitted_at` is set (freeze is app-level; the policy covers ownership).

**⚠️ CHECK constraints: DO NOT TOUCH either one.** `course_sessions_session_type_check` already includes `'song'` (Slice 62) and `course_sessions_activity_check` already has the song branch (same migration). Verify both with a quick grep of `supabase/migrations/20260908120000_slice62_dialogue_flags.sql` and move on. The classic drop-and-recreate mistake here would be a regression.

## Files to create

1. `supabase/schema-phase5-music-full.sql` — as above.
2. `src/lib/music.ts` — `musicStepList(story)` (content-dependent step ids, in order, with the hiding rules above), `encodeMusicStep` / `decodeMusicStep` (match against this story's list; unknown value falls back to the first step — same defensive shape as presentation), `musicStepLabel(step)` (Spanish labels: "El artista", "El video", "Primera escucha", "Completa la canción", "La letra", "Truquitos y karaoke"), `normalizeBlankAnswer(text)` (trim, lowercase, collapse whitespace), `scoreBlank(typed, answer)` (normalized equality). Unit tests in `src/lib/music.test.ts` (step list hiding rules, decode fallback, scoring incl. case/apostrophe-adjacent cases).
3. `src/components/music/SongBio.tsx` — bio paragraphs with word tooltips. Bio words: `words` rows where `source = 'bio'`, position-keyed to the bio text tokenization (reuse the WordTooltip component; build the span machinery the same way InteractiveStory does, minus karaoke/audio).
4. `src/components/music/SongBlanksWorksheet.tsx` — the centerpiece (spec in "What to build" (b) step 4). Props: story (lyrics body_text, lyric_blanks, youtube_url), session context (mode, answers_revealed, video sync), initial attempts (hydrated from `song_lyric_attempts` on load — a refresh resumes exactly where the student was), callbacks via server actions. Inline blanks: render lyric lines with numbered inputs at blank positions (blank ids match the existing `lyric_blanks` array; multi-word blanks get a proportionally wider input).
5. `src/components/music/SongLyricsMeaning.tsx` — wraps the existing lyric rendering (InteractiveStory or the current song lyric path) + the song_meaning block.
6. `src/components/music/SongTruquitosKaraoke.tsx` — line-swap toggle, karaoke highlight + auto-scroll from `line_timestamps`, per-blank seek-back (review/consumer only), YouTube embed (teacher-synced in classroom mode, normal controls otherwise).
7. `src/lib/services/songAttempts.ts` — service layer: `upsertSongLyricAttempt` (autosave; refuses if submitted), `submitSongLyricWorksheet` (freeze + score all of the student's rows for the session), `getSongBlankAnalytics(sessionId)` (per-blank + per-student aggregates for the teacher). Server actions in the lesson route call these; components stay presentation-only.
8. `docs/adr/010-teacher-paced-lesson-steps.md` — as specced in (a).
9. Teacher additions on `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` (modify, listed below): pacing panel + analytics section components.

## Files to modify

1. `src/components/StorySteps.tsx` — song branch builds the `musicStepList` steps; renders the four new components; implements the lock clamp (live classroom mode + `lesson_step_locked` + `lesson_step_current` → max index; back allowed, forward disabled); subscribes to `course_sessions` Realtime for pacing changes (existing subscription pattern); `MusicBlanks` import replaced by `SongBlanksWorksheet`. If `MusicBlanks.tsx` has no remaining importers, delete it.
2. `src/types/index.ts` — Story gains `artistBio`, `songMeaning`, `lyricsIpa`, `lineTimestamps`; CourseSession gains `lessonStepCurrent`, `lessonStepLocked`; new `SongLyricAttempt` type; `LyricBlank` unchanged.
3. `src/lib/sessions.ts` — map the two new CourseSession fields.
4. `src/lib/stories.ts` — load the four new Story fields; existing word-loading for body/lyrics filters `source = 'body'` (bio words must NEVER leak into lyric tooltips); new loader for bio words (`source = 'bio'`).
5. `src/app/lesson/[slug]/page.tsx` — hydrate initial attempts for the student when a session context exists; pass session pacing state down.
6. Teacher session detail page — pacing panel (Siguiente sección / Volver / Bloquear pasos) + analytics section for song sessions. Server actions: `setMusicLessonStep(sessionId, direction)`, `toggleMusicStepLock(sessionId, locked)` — ownership-validated, session_type checked.
7. Reveal behavior: find where `answers_revealed` auto-flips and where Desbloquear ahora applies; extend both from story sessions to song sessions.
8. `scripts/seed-music.ts` — SONGS entries gain optional `artist_bio`, `song_meaning`, `lyrics_ipa`, `line_timestamps` (all optional, default null; upsert in place, never delete rows; `--force` guard now also refuses when `song_lyric_attempts` exist for the song's sessions). Update `SCRIPTS.md`.
9. `.cursorrules` — no, do not modify (the pacing rule is already being added there separately).

## Existing patterns to reuse

| Pattern | Source | What to reuse |
|---|---|---|
| Step encode/decode/exists | `src/lib/presentation.ts` | Defensive decode with fallback to first step |
| Realtime session-field sync | Video summary / presentation (`course_sessions` subscription by id) | Subscription + recompute on change |
| Teacher-controlled YouTube | `video_playing` / `video_seconds` / `video_rate` on CourseSession | Students tap once to follow; works for video, blind listen, worksheet mini player, karaoke |
| Reveal gating | `answers_revealed` + Terminar clase + Desbloquear ahora | Extend to song sessions |
| Response persistence | ComprehensionResponse (RLS shape, per-student rows, session scoping) | `song_lyric_attempts` policies |
| Sticky player | `StoryAudioPlayer` sticky pattern | Mini YouTube player placement + DESIGN.md sticky shadow rule |
| Teacher controls | Slice 61 round controls (ownership validation, zero confirmation) | Pacing panel actions |
| Seed canonical shape | `seed-presentation.ts` / `seed-music.ts` | Typed array, upsert by natural key, force guard |

## Don't build (future, deliberately)

- **Live in-app Truquitos annotation** — Kyle annotates live in Google Slides; the app's IPA overlay is post-class content (drafted from clean lyrics, corrected in the Slice 55 editor). Not v1, not ever parsed from his notation.
- **Hosted or ripped song audio** — YouTube embeds only, forever (copyright). No yt-dlp, no audio extraction.
- **Review/consumer attempt persistence** — fresh passes in review/consumer mode are local state only in v1; the in-class submitted attempt stays the single scored record.
- **Teacher AI toolbox** (paste-box, Traducir y anotar, Generar borrador IPA) — Slice 55 scope per its addendum.
- **Line-timestamp generation** — Whisper runs Hermes-side against an MP3 Kyle supplies; the app only renders `line_timestamps` when present. Do not build generation UI or scripts.
- **Word tooltips in the blanks worksheet** — paper-worksheet parity; the listening exercise must not become a reading exercise.
- **Word flags on song lyrics** — ADR 009 explicitly excludes songs.
- **Live student progress dashboard during the blanks segment** — Kyle runs playback and the answer check himself; he asked for no live visibility.
- **Bio annotation pipeline** — the `--source bio` annotate-script flag is a Hermes-side change; the app renders whatever `words` rows exist with `source = 'bio'`.

## Kyle's Rules (from PRD Section 10)

- No em dashes in UI text. Spanish for navigation/CTA, English for learning content.
- Mobile-first always; test at 375px.
- **The page is load-bearing for nobody, with ONE ratified exception: the blanks worksheet** (it replaces paper). That is why autosave must be bulletproof and why everything else degrades gracefully.
- IPA everywhere: the Truquitos overlay is IPA; Kyle's custom symbols never appear in the app.
- Follow the data structure; the PRD is updated; nothing beyond it.
- Never break a working slice: story, dialogue, movie_talk, video_summary rendering untouched; presentation's own step field untouched.

## Build order

1. Verify the two CHECK constraints already cover `song` (grep the Slice 62 migration); then run `supabase/schema-phase5-music-full.sql`.
2. Types (`src/types/index.ts`) + `src/lib/music.ts` + tests.
3. `src/lib/stories.ts` (new fields, source-filtered word loading) + `src/lib/sessions.ts`.
4. Step components (bio, lyrics+meaning, truquitos/karaoke) and the StorySteps song branch with the lock clamp + Realtime pacing.
5. `SongBlanksWorksheet` + `src/lib/services/songAttempts.ts` + server actions (autosave, submit, reveal extension).
6. Teacher pacing panel + analytics section + actions.
7. `scripts/seed-music.ts` extension + `SCRIPTS.md`.
8. `docs/adr/010-teacher-paced-lesson-steps.md`.
9. Test end-to-end (see the PRD Slice 63 verification column): seed a song with bio + meaning, assign a song session, run the student flow at 375px including the mid-exercise refresh, the submit/freeze, the teacher-gated reveal, the pacing lock (student cannot skip ahead while locked; follows Siguiente sección in Realtime), review mode free navigation + fresh empty pass + seek-back buttons, analytics numbers correct against what was typed.
10. `npx tsc --noEmit` then `npx next build` before push (Vercel serves stale deploys on broken builds).
11. Commit: "Slice 63: Music class full build — teacher-paced steps, live worksheet, bio, meaning, IPA Truquitos, karaoke".
12. Truth-doc sync: PRD status banner + Slice 63 row marked BUILT with the commit hash; record any spec deviations in the slice row (do not silently deviate — Kyle ratifies deviations in plan review).
