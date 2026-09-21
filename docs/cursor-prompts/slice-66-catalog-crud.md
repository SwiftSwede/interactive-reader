# Cursor Prompt: Build Slice 66 — Catalog CRUD v1: Delete + Simple Create

## Context

Read these files before starting:

- `.cursorrules` — all rules. Especially: build verification before push (`npx tsc --noEmit` / `npx next build`), service layer separation, and the decisions review at the end.
- `src/app/teacher/content/` — the Slice 55 content editor (index `ContentIndex.tsx`, per-type editor routes, `actions.ts`). This slice ADDS delete + create alongside it. Do not restructure what works.
- `src/app/teacher/actions.ts` — the existing `deleteCourse` pattern: `requireTeacher()` gate, ownership `.eq("teacher_id", ...)`, `.select("id").maybeSingle()` to confirm the row was actually deleted, typed `{ ok: false, error }` results, `revalidatePath`, Spanish error copy. Follow this pattern exactly.
- `src/app/teacher/classes/[id]/actions.ts` — `deleteSession` (same pattern, session-scoped) for reference.
- The baseline schema migration (from the milestone audit, `supabase/migrations/` — the fix-2 baseline capture) — read it to get the REAL foreign-key structure of `words`, `expressions`, `comprehension_questions`, `personal_questions`, `pronunciation_drills`, `movie_talk_scenes`, `video_summary_paragraphs`, `word_flags`, `dictation_prompts` (if present), and `content_tags` before writing cascade deletes. Do not guess FK column names.
- `src/lib/exam.ts` — `parseExamForm()` (only relevant if the exam create form validates anything; see "minimal create" below — likely not needed in this slice).

**Key constraint from Slice 55 (recorded deviation):** teacher JWTs cannot UPDATE (or DELETE) `stories` under RLS — Slice 55 saves use the **admin/service client after `requireTeacher()`**. Catalog deletes and creates follow the same pattern: `requireTeacher()` for authorization, then the admin client for the write. Ownership scoping (`.eq("teacher_id", ...)` where the table has it; stories/prompts are catalog rows — verify whether they carry `teacher_id` or are global) — check the baseline schema and mirror however Slice 55 already scopes access.

## What to build

Two capabilities, one slice:

1. **Delete** for every catalog content type, from the `/teacher/content` index rows.
2. **Create** for the four "simple" catalog types (writing, exam, presentation, conversation prompts), via minimal create forms that redirect into the existing editors.

### A. Delete

A delete action (trash icon) on each row of the `/teacher/content` index, for: stories (every `kind`: story, dialogue, movie_talk, song, video_summary), writing prompts, exam prompts, presentation prompts, conversation prompts.

**Guard — block when referenced.** Before deleting, count `course_sessions` rows referencing the content (`story_id`, `writing_prompt_id`, `exam_prompt_id`, `presentation_prompt_id`, or `conversation_prompt_id` respectively). If count > 0: block, show `Está asignado a {N} clase(s). Quítalo de esas clases primero.` (Sessions in archived months count as references — student records are never destroyed by this feature.)

**Cascade — hard delete when unreferenced.** If no session references it, delete the row AND its children. Child tables per type (verify actual FK names in the baseline migration first):

- **Story (any kind):** `words` (both `source = 'body'` and `'bio'`), `expressions`, `comprehension_questions`, `personal_questions`, `pronunciation_drills`, `word_flags`, `movie_talk_scenes`, `video_summary_paragraphs` (video_summary kind), `dictation_prompts` (if the table exists in live schema), `content_tags` rows where `content_type = 'story'` and `content_id = story id`. Delete children in FK-safe order (children of expressions after expressions, etc. — the baseline migration tells you the dependency order).
- **Writing prompt:** `writing_submissions` (and corrections chained off submissions — verify FK) — only possible if orphaned, i.e., normally empty because the guard blocks referenced prompts.
- **Exam prompt:** no child rows (content is JSONB on the row).
- **Presentation prompt:** `presentation_responses` — normally empty due to the guard.
- **Conversation prompt:** no child rows (questions are JSONB).

Since Supabase JS has no transactions, do ordered deletes; if a child delete fails mid-sequence, return the error and leave the parent intact (parent-last delete order is the safe sequence: delete children first, parent last — a partial failure then strands only childless rows or fails loudly).

**Confirm modal (Spanish):** trash icon → confirm dialog listing what gets removed, e.g. for a story: `Se borrarán: el texto, {N} palabras anotadas, {N} preguntas de comprensión, {N} preguntas personales, el dictado, las banderas de palabras, y las etiquetas.` (only list non-zero counts; conversation/exam: `Se borrará "{title}". Esta acción no se puede deshacer.`). Confirm button is destructive-styled (terracotta/red). No undo.

**Accepted orphan (do NOT handle):** deleting a story leaves its audio files (`public/audio/stories/{slug}*.mp3/json`) in the repo. Harmless. Do not touch the filesystem.

### B. Simple create ("minimal row → editor" pattern)

On `/teacher/content`, add a create button per simple type (top of the index or per-section — your call, keep it consistent with the existing index layout):

| Button | Minimal fields | Then |
|---|---|---|
| Nueva escritura | title (required), level (pre-intermediate / intermediate) | save row → redirect to `/teacher/content/writing/[id]` |
| Nuevo examen | title (required), level | save row → redirect to `/teacher/content/exam/[id]` (all pipe-textareas start empty) |
| Nueva presentación | title (required), level forced `intermediate` (schema CHECK — show it as fixed, not editable), theme optional | save row → redirect to `/teacher/content/presentation/[id]` |
| Nueva conversación | title (required), level (CHECK values: `pre-intermediate` / `intermediate` — exact strings verified in Slice 61), theme optional | save row → redirect to the conversation editor |

Rules:
- **The editor is the creation experience.** Create forms collect only the minimum to make a valid row; everything else is filled in the existing Slice 55 editors. Do NOT duplicate the editors' field UIs in the create forms.
- If any editor requires a field the minimal row doesn't set (e.g., exam editor expects a time limit), give the create form that one extra field or set a sensible default (writing: `writing_time_minutes` default 10 pre-int / 20 int — matches existing behavior; exam: whatever default the existing rows use). Verify against real rows.
- New rows must immediately appear in the `/teacher/content` index AND in the Nueva clase pickers (kind-filtered pickers from Slice 62 — they should pick the new rows up automatically via revalidate; verify).
- Validation: title non-empty, level valid per the table's CHECK. Spanish inline errors, same form styling as existing editor forms.
- **NOT creatable in this slice:** anything backed by `stories` (story, dialogue, movie_talk, song, video_summary). The index shows NO create button for those types — the AI toolbox is a future slice. If it's cheap, show a muted hint ("Los cuentos se crean por el pipeline de importación") so the absence doesn't look like a bug.

## Out of scope (do NOT build)

- Story-kind creation, paste-box, AI annotation toolbox (future slice).
- Archive-as-soft-delete alternative (explicitly rejected — hard delete with guard is the design).
- Deleting or bulk-managing sessions/courses (exists already).
- Any change to student-facing routes, lesson pages, or the Nueva clase flow itself.
- Audio file cleanup, SRS/consumer features, analytics.

## Acceptance criteria

1. Every catalog row type can be deleted from `/teacher/content` when unreferenced; children are gone afterwards (verify in Supabase: words/questions/flags/scenes rows for a deleted test story are 0).
2. Deleting content referenced by ANY session (including archived months) is blocked with the Spanish message; nothing is deleted.
3. Confirm modal shows per-type contents summary and is required before delete.
4. Create flows: writing, exam, presentation, conversation — minimal form → row saved → redirected into the existing editor → row visible in the index and in Nueva clase pickers.
5. Presentation create forces intermediate; conversation create uses the exact CHECK level strings; writing create defaults the correct time limit per level.
6. All writes use `requireTeacher()` + admin client (Slice 55 pattern); no teacher-JWT writes to `stories`/prompts.
7. Spanish UI throughout, Paper Light tokens, inside the existing TeacherShell; no `text-gray-*` classes.
8. `npx tsc --noEmit` and `npx next build` pass BEFORE any push (Vercel stale-deploy rule).
9. No schema migrations needed (verify — if you discover one is truly required, STOP and surface it in the decisions review instead of adding it unilaterally).

## Test path (do this before committing)

1. Create a throwaway writing prompt + a throwaway story is NOT possible (no story create) — so for story-cascade testing, use an existing unassigned sample row if one exists (e.g., an old seed stub); if every existing story is referenced, verify cascade logic via the throwaway writing/exam/presentation rows and inspect the story cascade code carefully.
2. Delete the unreferenced throwaway rows → confirm gone from index + Nueva clase pickers.
3. Attempt to delete any content assigned to a current/archived month → confirm blocked with correct count.
4. Run the build. Only then commit.

## Decisions review

Before committing, surface any decisions you're unsure about — especially: FK dependency order you inferred from the baseline migration, whether `content_tags`/`dictation_prompts` exist in the live schema, ownership scoping on catalog rows, any field you had to default, and anything that needed a migration. Do not hide a needed migration in a commit.

## Plan review decisions (locked 2026-09-21)

1. **Nueva clase:** Writing/exam/conversation start with Nueva lección (existing compose) vs Usar una anterior (copy catalog row, then assign). Presentation unchanged (pick existing, no copy).
2. **Consumer progress:** Do not block delete. Warn in the confirm if student rows exist, then allow. Hard-block only when a `course_sessions` row still references the content (including archived months).
3. **Delete UI:** Index-only. Trash on every catalog type.
4. **Who may delete:** `CATALOG_ADMIN_EMAILS` env, no migration. Create/edit remain any teacher. Do not rename `teacher` to `admin`; a later slice may add a limited co-teacher role. `dictation_prompts` does not exist (drill = dictado). `content_tags` is polymorphic with no FK. `movie_talk_scenes` is post-baseline CASCADE. Catalog rows are global (no `teacher_id` on stories).
5. **No schema migration.**
