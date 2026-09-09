# Cursor Prompt: Build Slice 55 — Teacher Content Editor (All Lesson Types)

## Context

Read these files before starting:

- `DESIGN.md` — source of truth for all visual decisions, including the "Teacher Dashboard (`/teacher/*`)" section.
- `.cursorrules` — all rules. Especially: build verification before push (`npx tsc --noEmit` minimum), service layer separation (components are presentation-only; queries live in `src/lib/`), and the decisions review at the end.
- `src/app/teacher/layout.tsx` and `TeacherShell` (Slice 58) — the editor pages render inside the teacher shell; the "Contenido" rail item is currently disabled with "Próximamente" — this slice enables it and points it at `/teacher/content`.
- `src/lib/stories.ts`, `src/lib/exam.ts` (`parseExamForm()` — reuse it for exam validation, do not reimplement), `src/lib/teacher.ts` — extend the lib layer for new queries; do not duplicate.
- Schema references (column shapes): `supabase/schema-phase5-presentation.sql`, `supabase/schema-phase5-video-summary.sql`, and the writing/exam schema files under `supabase/`.
- Seed scripts as data-shape reference (what valid content looks like): `scripts/seed-presentation.ts` (segments jsonb), `scripts/seed-music.ts` (lyric_blanks), `scripts/seed-exam-prompts.ts` (pipe-delimited exam format), `scripts/seed-video-summary.ts` (paragraph model).
- `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — example of a re-skinned teacher page inside the shell.

**Build order dependency:** Slice 58 (teacher shell) is merged. If any Slice 59/60 work is in flight on the same branch, coordinate — this slice touches `teacher/layout.tsx` only to enable the rail item.

## What to build

A self-service content editor so the teacher can fix typos, translations, questions, and drill content **without terminal scripts or Supabase access**. It edits EXISTING catalog rows only — it does not create content (seed scripts remain the import path) and it does not touch AI/annotation.

**Central rule: every field edited here must save to the same database column the seed scripts write to. No new columns, no schema changes, no re-seeding, no AI calls. Changes appear on the live site on next page load.**

1. **`/teacher/content` — index page.** Lists ALL catalog content in one place:
   - Stories (every `kind`: `story`, `dialogue`, `movie_talk`, `song`, `video_summary`) — columns: title, kind chip, level, word count.
   - Writing prompts — title, level.
   - Exam prompts — title/level (exam prompts identify by title+level).
   - Presentation prompts — title, level, theme.
   - Filter by kind (chips) and level. Sort: most recently updated first.
   - Each row links to its edit page. Enables the Contenido rail item in `TeacherShell`.
2. **`/teacher/content/story/[slug]`** — the Story editor. Sections vary by `kind` (render conditionally):
   - **Always:** `title` (text input), `youtube_url` (text input, only when the kind uses it: song, movie_talk, video_summary).
   - **story / dialogue / movie_talk:** `body_text` (monospace textarea) — with the karaoke warning below.
   - **Comprehension questions:** editable list — `question` (textarea), `answer` (text input, nullable), add/delete/reorder (reorder writes the `position` column).
   - **Personal questions:** same pattern (`question` only).
   - **Pronunciation drill:** `practica_coral_standard`, `practica_coral_phonetic`, `practica_coral_ipa` (text inputs), `symbol_legend` (textarea), `focus_type` (dropdown: sounds / ed-s-rules / emphasized-syllable), `focus_content` (textarea), `word_notes` (editable list of word/note pairs — add/delete/reorder, saved as the jsonb array of `{word, note}`), `coral_explanation` (textarea).
   - **song only:** `lyric_blanks` as an editable list of `{id, prompt, answer}`. Preserve the seed convention: repeated words reuse the same blank `id` — when the teacher adds a blank for a word that already has one, reuse that id rather than minting a new one.
   - **video_summary only:** `free_write_minutes` (number input) plus the paragraph editor: one card per `video_summary_paragraphs` row in `position` order — `spanish_text` (textarea) and `english_translation` (textarea, nullable) edited IN PLACE (update the row; do not delete-and-reinsert). Add paragraph = insert a new row at the end with `english_translation: null`. Deleting a row shows the class-record warning below.
3. **`/teacher/content/writing/[id]`** — `title`, `prompt_text` (textarea), `writing_time_minutes` (number), `structure_lesson` (textarea), `rubric_text` (textarea), `example_paragraph` (textarea).
4. **`/teacher/content/exam/[id]`** — one monospace textarea per raw field: `vocabulary_list`, `fill_in_translation`, `paragraph_restructuring` (or `sentence_correction` — show whichever matches `task2_type`), `translation_sentences`. On save, run each field through `parseExamForm()` and show a preview of the parsed result (counts + first item per task). **If parsing fails or item counts drop vs. the currently stored raw text, block the save and show the error.** Kyle's exam format is pipe-delimited — see `scripts/seed-exam-prompts.ts` for canonical examples.
5. **`/teacher/content/presentation/[id]`** — `title`, `theme`, `warmup_question` (nullable text input). Segments editor: one card per segment (`title`, `youtube_url`), inside it: vocabulary list (rows of `english` / `spanish` / optional `example_sentence`, add/delete/reorder) and comprehension questions (`question` + `answer`, add/delete/reorder). The whole thing saves as the `segments` jsonb array — segment ids stay stable on reorder (reorder the array, never renumber existing ids).

## Guards and warnings (do not skip)

- **`body_text` edit (story/dialogue/movie_talk):** before saving a changed `body_text`, warn: "Cambiar el texto invalida los timestamps de karaoke y las anotaciones de palabras si cambia el número de palabras." Allow the save (teacher's call), but if the word count differs from the stored value, show the warning inline on the save confirmation.
- **Video summary paragraph delete:** confirm dialog — "Este párrafo puede contener traducciones en vivo de una clase pasada. ¿Eliminar de todos modos?"
- **Presentation edit with existing responses:** on load, count `presentation_responses` for the prompt. If > 0, show a persistent banner: "Esta lección ya tiene N respuestas de estudiantes. Cambiar el contenido puede desincronizar las preguntas con las respuestas." Do not block — Kyle is the only teacher.
- **Exam save:** parse validation must pass (see #4).
- No other destructive operations exist in this slice. Nothing deletes story rows, and nothing touches class records.

## UI

- Spanish UI throughout. DESIGN.md tokens (Paper Light, terracotta primary, Lora/Roboto Flex). Desktop-first inside TeacherShell center column (max-w 960px); the right context panel may show the content's current session assignments (which courses/sessions use this content — read-only), but a simple page without the panel is acceptable.
- Editable lists (questions, vocab, blanks, word notes): stacked cards with drag handle or ↑/↓ buttons for reorder, trash icon for delete, "+ Agregar" button at the bottom. 44px touch targets for controls.
- Save model: explicit "Guardar" button per page (or per section for the Story page, which is long — story/questions/pronunciation are three natural sections). After save: inline success toast, no navigation.
- All inputs are controlled components; show unsaved-changes indicator (dot on the Guardar button) when dirty.

## Service layer

- New `src/lib/content-editor.ts` (or extend `src/lib/teacher.ts`): `listAllContent()`, `loadStoryForEdit(slug)`, `loadWritingPromptForEdit(id)`, `loadExamPromptForEdit(id)`, `loadPresentationForEdit(id)`, plus the save functions. Components never query Supabase directly.
- All mutations go through server actions or thin API routes calling the service layer. Use the admin client (service role) server-side; RLS teacher policies already permit these writes for teachers, but server-side auth is the gate (`requireTeacher()`).

## Out of scope (do NOT build)

- Word/expressions annotation editing (the annotation script's job).
- Content creation (new story/writing/exam/presentation rows) — seed scripts only.
- Class records: `writing_submissions`, `presentation_responses`, `video_summary_teaching_notes`, `exam_groups`, `comprehension_responses`, `personal_responses` — display is fine (already exists elsewhere), editing is not.
- Audio file management (files are slug-based on the filesystem, not DB).
- Any schema change (none needed — every column already exists).
- AI features of any kind.

## Acceptance checklist

- [ ] `/teacher/content` lists all eight content kinds with working kind/level filters; Contenido rail item is enabled and navigates here.
- [ ] Edit a presentation vocab item (e.g. Gabo → Forefront), save, reload `/presentation?session=…` as a student — change visible.
- [ ] Reorder presentation segments — ids stable; students' existing answers still map to their segments.
- [ ] Edit a comprehension question answer on a story; reload the story page — change visible.
- [ ] Add/delete/reorder word notes on a pronunciation drill — jsonb saves as `{word, note}` array; DictationPractice renders the new order.
- [ ] Edit a song's lyric_blanks; add a blank for a repeated word — id reused, not duplicated.
- [ ] Video summary: edit a paragraph's spanish_text in place; the row updates (no deletion); live translations intact.
- [ ] Exam editor: paste malformed pipe text → save blocked with parse error; valid text → parsed preview matches stored format.
- [ ] body_text edit on a story shows the karaoke warning when word count changes.
- [ ] `npx tsc --noEmit` passes before commit; `npx next build` passes before push.

## Addendum (Slice 61)

Slice 55 is not built yet. When it is, include conversation prompts in the editor:

- Index: list `conversation_prompts` (title, level, theme, question count). Kind chip: Conversación.
- Edit page `/teacher/content/conversation/[id]`: `title`, `theme` (optional), questions list `{id, question}` (3-6 items, add/delete/reorder; ids stay stable on reorder).
- Schema: `supabase/schema-phase5-conversation.sql`. Seed shape: `scripts/seed-conversation.ts`.
- Conversation sessions are composed in Nueva clase (insert prompt + session). The editor only edits existing catalog rows. Do not add `/teacher/conversations/new`.

## Addendum (Slice 63 — music fields + teacher AI toolbox)

When building Slice 55, the song editor (`/teacher/content/story/[slug]` for `kind = "song"`) extends beyond the generic story fields:

- `artist_bio` (textarea, plain text — annotations are managed by the annotate script with `--source bio`, not the editor)
- `song_meaning` (textarea — teacher-authored; a hint label reminds: "Escrito por ti, no por IA")
- `lyrics_ipa` (per-line editable list: line_index + ipa_text; a **"Generar borrador IPA"** button calls a server action that runs the existing IPA-drafting prompt server-side via OpenRouter and fills the textareas as an editable draft — Kyle reviews/corrects, then saves)
- `line_timestamps` (raw JSON textarea is acceptable in v1: paste tap-align output from `scripts/tap-align-lyrics.html`. Kyle rarely edits these by hand.)
- Guards: editing `lyrics_ipa` never warns (no student data references line indexes); editing `lyric_blanks` on a song with existing `song_lyric_attempts` shows a warning (blank ids are referenced by attempts — adding is safe, deleting/re-numbering desyncs scores)

**Teacher AI toolbox (also Slice 55 scope, all lesson types):** on the content index (or per-editor), a paste-box + two one-click server-side actions reusing the existing Hermes-side logic, ported to Next.js server actions calling OpenRouter:

1. **"Traducir y anotar"** — runs the annotate-story pipeline server-side (~$0.01-0.02 per run; Kyle supplies the OpenRouter key via env). Status shown while running; results write straight to the DB exactly as the script would.
2. **"Generar borrador IPA"** (described above; also available for Práctica Coral IPA on stories)
3. Timestamps helper, if ever added, wraps the same tap-align approach or stays a JSON paste field. **Never** a Whisper button on Vercel. Do not stub a Whisper path in.

Cost discipline: every AI action shows its estimated cost before running, and a confirmation step prevents accidental double-runs.

