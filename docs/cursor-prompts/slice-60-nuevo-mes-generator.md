# Cursor Prompt: Build Slice 60 — Nuevo Mes Generator (with flex Class 3 slot)

## Plan review decisions (Kyle, 2026-09-22)

- **Empty sessions + assign UI:** generate typed empty sessions. Relax `dialogue` / `movie_talk` / `song` so `story_id` may be null (same as `story` today). Each **Sin contenido** strip row gets **Elegir contenido** using the existing Nueva clase pickers. Flex stays a separate **Por elegir** resolve (type + content). Nueva clase is bonus classes only.
- **Archive:** auto-archive previous months at that level. Student Lecciones lists archived enrollments newest to oldest. New students are not enrolled in archived courses (existing placement already only writes unarchived). Continuing students keep their old enrollments. Direct lesson URLs already ignore `archived`. Lesson open still uses the existing subscription check in `classroomStudentCanAccessSession`; this slice does not give unpaid accounts free review.
- **Multiple groups per level per month:** allowed. Do not block a second Intermediate October. Warn in the wizard if one already exists; still generate.
- **Theme:** optional `courses.theme`. Wizard field under the name. Teacher can add/edit later on the course page (including archived, per DESIGN.md). Show as one subtitle line on teacher Este mes / Grupos cards and on student Lecciones group headings. If empty, omit the line (no placeholder gap).
- **CreateCourseForm:** replaced by the wizard. `NewMonthButton` on Este mes and Grupos opens the wizard, not the empty-course form.

## Context

Read these files before starting:

- `.cursorrules` — all rules. Especially build verification before push, service layer separation, and the decisions review at the end.
- `docs/adr/007-check-constraint-migration-pattern.md` — this slice includes ONE schema change (new `session_type` value). Follow the ADR: query the REAL constraint names in the live DB first, then drop/recreate with the full value list. The two constraints are `course_sessions_session_type_check` and `course_sessions_activity_check` (verify names against the baseline migration in `supabase/migrations/` from the fix-2 audit — do not trust this prompt's names blindly).
- `src/components/teacher/NewClassButton.tsx` — how sessions are created today (Nueva clase). Reuse its creation logic (the action it calls) so generated sessions are indistinguishable from hand-made ones.
- The Este mes page (`src/app/teacher/page.tsx` or its current home) — this slice replaces the "Nuevo mes → existing CreateCourseForm" wiring with the real wizard.
- `courses.zoom_url` (Slice 58b) — new courses inherit it from the previous course at the same level.
- Slice 65 behavior (pronunciation gate): Class 1 story dictado/coral/pronunciación unlock at the pronunciation session's `session_start_time`. Generated pronunciation sessions arm this automatically — verify, don't rebuild.
- Student dashboard month logic (Slice 57): Inicio shows the current calendar month at the student's Zoom level; archived courses fall to older-months lists. Archiving the previous month must NOT remove student review access — verify how `archived` is consumed by student queries before relying on it.

## What to build

A wizard that creates next month's course for a level: course row + all 8 class sessions with correct types, dates, and times — so Kyle stops hand-creating sessions in Nueva clase every month.

### Migration (one file, ADR 007 pattern)

Add `flex` to the session_type enum:

```sql
-- Query real constraint names first (information_schema / pg_constraint), then:
ALTER TABLE course_sessions DROP CONSTRAINT course_sessions_session_type_check;
ALTER TABLE course_sessions ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN ('story','writing','exam','video_summary','presentation',
                          'conversation','pronunciation','dialogue','movie_talk','song','flex'));
-- Same for course_sessions_activity_check (activity CHECK): flex = ALL content FKs null.
```

Rules for `flex`: `session_type = 'flex'` requires `story_id`, `writing_prompt_id`, `exam_prompt_id`, `presentation_prompt_id`, `conversation_prompt_id` ALL null (mirror the existing per-type CHECK branches). No other table changes.

### The template (single constant, Kyle-shaped)

`src/lib/monthly-template.ts` (or equivalent): a typed constant keyed by level:

```
1: story          (both levels)
2: pronunciation  (live-only, both levels)
3: flex           (both levels — Kyle chooses presentation / movie_talk / video_summary later)
4: conversation   (both levels)
5: dialogue       (both levels)
6: song           (both levels)
7: writing        (both levels)
8: exam           (both levels)
```

Class 3 is the ONLY flex slot: Kyle decides presentation vs Movie Talk the day of class or 2-3 days before — never at month start. Future formats (16 classes/month, 4×3h weekends) = edit this one constant later. Do not build template editing UI.

### The wizard (button on Este mes, near the group cards)

Steps, Kyle's stated order:

1. **Nivel** — pre-intermediate / intermediate. If that level already has a course for the target month, block with "Ya existe un curso de {nivel} para {mes}."
2. **Mes** — month picker. Default: current month if no course exists for the level in it, otherwise next month.
3. **Patrón semanal** — multi-select day-of-week (Mar, Jue, …) + one time input. Prefilled from the most recent course at that level (derive days from its sessions' day-of-week set; time from its sessions). First-ever generation (no previous course): fields start empty, no prefill. Live preview below: the resulting dates for the chosen month ("8 clases: mar 6 oct, jue 8 oct, …").
   - **Date rule:** generate every occurrence of the chosen days in the month, then cap at the template length (8). A 5-Tuesday month yields 8, not 9-10. A Saturday-only pattern yields 4-5 (template truncates from the top). Bonus classes remain possible via Nueva clase.
4. **Nombre** — prefilled per Kyle's Drive convention: `{Level} {YYYY} {MON}` → "Intermediate 2026 OCT", "Pre-intermediate 2026 SEP" (English level names, 3-letter uppercase month). Editable.
5. **Generar** — creates: the course (name, level, `zoom_url` inherited from the previous course at that level if any) + N sessions. Each session: `session_start_time` = pattern date × time, `session_end_time` = +90 min (match Nueva clase's convention), `session_type` from the template position (position 3 = `flex`, all FKs null). On success: redirect to Este mes (or the new course page — your call, note it in the review) and revalidate.

**Auto-archive:** on successful generation for month M at level L, set `archived = true` on the previous unarchived course at level L (only that level). Students keep full review access — verify this holds (see Context).

### Flex slot resolution UI

- On the course page's class strip, the flex row shows **"Por elegir"** instead of the usual content status, with a resolve action. It must be visually distinct from "sin contenido" (flex = type unknown; sin contenido = type known, content missing).
- Readiness counts ("N/8 clases listas"): flex counts as NOT ready. Pronunciation (live-only) counts as ready per existing Slice 65 behavior.
- **Resolve modal:** level-aware type choice — pre-int: "Resumen de video" (video_summary) only; int: "Presentación" | "Movie Talk". After choosing type, pick content:
  - **Existente** — list of that type's catalog rows (reuse the kind-filtered pickers from Nueva clase).
  - **Nueva** (presentations only) — inline minimal create form (Slice 66's create: title + forced intermediate level), saves the row and auto-selects it; Kyle fills details in the editor afterward. For Movie Talk the "Nueva" tab shows an honest note: "Los movie talks se crean por el pipeline de importación (por ahora)." For video_summary: no create — existing list only (same pipeline note).
- Resolving sets `session_type` + the content FK in one update; flex state disappears.
- **Re-open:** while the session has NO student responses/attempts for that type, the teacher can reopen the choice (switch presentation→movie_talk etc.). Once responses exist, the switch is hidden. (For video_summary: check `video_summary_free_write` rows too. Simple existence checks are fine.)
- Student-side flex rendering: before resolution, flex behaves like the live-only types — Zoom join card in the join window (uses course `zoom_url`), no app lesson link; in Lecciones rows show the class with no lesson path. After resolution: normal lesson card. If you need a hint string: "El profe está preparando esta clase."

## Out of scope (do NOT build)

- Template editing UI, 16-class/weekend formats (one-constant edit later).
- Assigning content to non-flex generated sessions inside the wizard (they generate empty; Kyle uses Nueva clase / pickers as today).
- Creating movie talks or video summaries in-app (AI toolbox is a later slice).
- Student-facing changes beyond flex rendering (verify existing behavior untouched).
- Bulk-generating multiple levels in one wizard run (one run per level, Kyle's workflow).

## Acceptance criteria

1. Migration adds `flex` to both constraints, applied via the ADR 007 pattern with real constraint names; generation works without CHECK violations.
2. Wizard: level → month → pattern (prefilled from last course) with live date preview → name (prefilled per convention) → generate. Result: course + ≤8 sessions, correct types per template position, correct start/end times.
3. Date cap rule holds: 5-Tuesday month → 8 sessions max; Saturday-only → 4-5 sessions from template top.
4. Auto-archive fires for the same level only; student review access to the archived month still works (verify a student lesson link + review mode after archiving).
5. zoom_url inherited; Este mes shows the new month's group cards with "0/8 clases listas" (pronunciation counted ready → actual number per template).
6. Flex row: "Por elegir" on the strip, resolve modal level-aware, existing-content pickers work, presentation create-new inline works and auto-selects, movie talk/video summary show the pipeline note.
7. After resolution: session behaves exactly like a hand-made session of that type (lesson link, Realtime, gates — including the Slice 65 pronunciation gate which must be armed by the generated pronunciation session).
8. Pre-resolution: students see Zoom-card-only behavior; no broken lesson links.
9. Spanish UI, Paper Light tokens, TeacherShell; `npx tsc --noEmit` + `npx next build` pass BEFORE any push.
10. Re-open switch hidden once student responses exist for the resolved type.

## Test path (before committing)

1. Run migration on Supabase ( Kyle runs it — provide the SQL file in `supabase/migrations/`; note it in the review).
2. Generate a test course for a future month at each level; verify strip, types, dates, flex slot, "0/8" readiness (7 ready = story/writing/exam/conversation/dialogue/song/pronunciación have content or are live-only — confirm exact readiness math and note it).
3. Resolve the flex slot to an existing presentation; verify the lesson link appears for students; resolve-to-movie-talk on the other level's test course.
4. Verify auto-archive + student review access on the previous month.
5. Delete the test courses (deleteCourse exists) — confirm student dashboards return to prior state.
6. Build, then commit.

## Decisions review

Before committing, surface: real constraint names found in the live DB, readiness math for generated months, where the wizard button lives on Este mes, redirect target after generation, how flex renders in Lecciones vs Inicio, anything about archived-course student queries that surprised you, and any deviation from this spec. No hidden migrations, no hidden features.
