# Cursor prompt — Analíticas v1: cross-student deficiency rollup (Slice 73)

**PRD number:** 73 was free (2026-09-29). This file keeps that number.

## Plan review decisions (2026-09-29)

- Words on Analíticas are `word_lookups` (help-sheet opens), all-time for the selected course roster. Heading **Palabras más consultadas**. Ficha keeps `word_flag_request_rollup` / **Palabras que no entendió**.
- Course tab picks the roster, not a time window. Lookups, errors, and sticky sounds follow the student all-time.
- `signalCount` / señales = check-answer event hits only. Sticky error flags raise `studentCount` only.
- Course tabs = all owned courses including archived. Default = course of the newest session. Bad `?course=` stays on Analíticas and falls back to that default.
- List chrome = session ordered-list card (`ol.divide-y.rounded-card.border`), not a new table component.
- Sounds = sticky phonetic `user_topic_evidence`, not Ficha’s pronunciation-attempt IPA. ≥3 students: `bg-surface-hover` + **candidato para banco de sonidos**.
- DESIGN.md Analíticas screen and the “teachers may use percents” line update in this commit. Counts only.

## Context

Read `docs/adr/015-deficiency-queue.md` first — Decision 9 (sound-bank demand rule) and the Analíticas rollup are this slice. It fills the `/teacher/analytics` stub, whose placeholder literally promises "las palabras más consultadas por mes y nivel". Slice 72's Ficha answers "what does ONE student need"; this answers "what does the GROUP need" — what Kyle reteaches, and which sound bank to build next.

Code reality (verified):
- `src/app/teacher/analytics/page.tsx` — current stub: `requireTeacher` + placeholder. No data loaded.
- `src/lib/ficha.ts` (Slice 72) — loader conventions + `loadTagDisplayNames` (id → display name across the four catalogs), reusable.
- Data sources, all confirmed in schema: `word_flag_request_rollup` (per-student per-story per-word counts), `learning_events` (`check_answer_error` with `detail.error_tags`, `word_flag_request`), `user_topic_evidence` (`needs_more_practice` rows; machine AND teacher flags land here, so one query covers both for the demand rule).
- RLS: `word_flag_request_rollup` and `learning_events` have teacher-read policies (own students), but `user_topic_evidence` has NO teacher read policy — the Ficha reads it via `createAdminClient()`. Do the same here: admin client, ownership-scoped in code.
- `loadTeacherCourses` from `@/lib/teacher` gives the teacher's own courses (levels/groups).

## RATIFIED vocabulary rule (2026-09-29, non-negotiable)

Vocabulary topic tags are COVERAGE, never deficiency. Do not render a vocabulary deficiency column, block, or count anywhere on this page. Only three blocks ship: words, errors, sounds. If a future plan review asks for vocabulary analytics, ask Kyle first.

## Build

### 1. `src/lib/analytics.ts` — loaders + pure assembly

All reads: `createAdminClient()`, scoped in code to students enrolled in courses the teacher owns (Ficha pattern; never trust a course id from the client without ownership).

- `loadCourseAnalytics(supabase, courseId)` → one assembled object for one course:
  - **Words**: `word_flag_request_rollup` for the course's students, grouped by `flag_text`: `{flagText, studentCount (distinct user_id), timesTotal (sum)}`, ordered by studentCount desc then timesTotal desc, top 15.
  - **Errors**: error-family signal per tag, merged from two sources: (a) `user_topic_evidence` rows with `tag_type = 'error'` and `status = 'needs_more_practice'` → distinct students per tag; (b) `learning_events` where `event_type = 'check_answer_error'` → count per `detail->error_tags` element + distinct students. Result `{tagId, displayName, studentCount, signalCount}` ordered by studentCount desc, top 10. Resolve display names via `loadTagDisplayNames`.
  - **Sounds**: `user_topic_evidence` with `tag_type = 'phonetic'`, `status = 'needs_more_practice'` → per tag: distinct students. Include ALL phonetic tags with ≥1 student (no top-N cut — the demand rule needs the full picture); sort by studentCount desc. Resolve display names (IPA + label).
- `buildAnalytics(...)` — pure function for the assembly/merge/order steps (words grouping, error merge, demand highlight), exported for tests.
- Demand rule, exported pure helper: `isSoundBankCandidate(studentCount)` → `studentCount >= 3` (ADR 015 Decision 9).

### 2. Page — replace the stub body

Server component, no new client component.

- Course selector: the teacher's courses as link tabs (searchParams `?course=`, default = the course with the most recent session — reuse whatever Este mes / group-page link patterns exist). Each tab shows the course display name.
- Three blocks, one card each (reuse teacher-page card/label/table patterns; ask-gate if a table pattern is uncovered — do not invent tokens):
  - **Palabras que no entendieron** — table: palabra | estudiantes | veces. Empty state: "Todavía no hay palabras acumuladas."
  - **Errores frecuentes** — table: error (display name) | estudiantes | señales. Empty state: "Todavía no hay errores guardados."
  - **Sonidos débiles** — rows: IPA + name | estudiantes. Rows with ≥3 students get the `surface-hover` treatment and a "candidato para banco de sonidos" label (this is the demand rule made visible — Kyle checks monthly). Empty state: "Todavía no hay sonidos marcados."
- Counts only — no percentages, no scores, no averages (Ficha rule, one level up).
- Header keeps "Analíticas"; a one-line note "Histórico del grupo" under it (v1 is all-time per level; month windows are a later refinement, do not build them).

### 3. Tests

`src/lib/analytics.test.ts`: word grouping (distinct students, sum, ordering), error merge (evidence + events, distinct students across both), demand-rule boundary (2 vs 3 students), `buildAnalytics` on all-empty inputs. Follow `ficha.test.ts` mocking conventions. All existing tests stay green; `tsc` clean.

## Verification

- `npm test` green, `tsc` clean.
- Manual probe: a course with slice 71 flags on ≥2 students and a check-answer error shows the tables populated; a phonetic flag from teacher_observation on a third student flips its sound row to "candidato para banco de sonidos".

## Constraints

- No migration. No AI calls. No student-facing UI. No new client interactivity (links only).
- Do not modify ficha.ts, the Ficha section, or slice 71's form/action.
- PRD row: Slice 73 (next free number; note it in this file's header if taken, as in Slice 69).
- Commit only this slice's files: `src/lib/analytics.ts` (+ test), the analytics page, PRD row, this file. Do not sweep the working tree.
