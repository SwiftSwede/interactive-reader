# Cursor prompt — Ficha: per-student deficiency view (Slice 72)

## Context

Read `docs/adr/015-deficiency-queue.md` first — Decisions 1, 3, 4, 11 are this slice. The student detail page already has the teacher's tag form (Slice 71); this slice adds what Kyle reads before class: the Ficha, a read-only teacher view of everything the system knows about one student's deficiencies. This is the teacher-only side of the visibility line — nothing here can ever render on a student route.

Code reality (verified):
- `src/app/teacher/classes/[id]/students/[studentId]/page.tsx` — server component, admin client already in use, already loads `loadObservationVocabulary(admin)` and `loadOpenFlags(admin, [studentId])` (Slice 71, both in `src/lib/topic-evidence.ts`).
- Catalogs: `grammar_tags` / `vocabulary_tags` / `phonetic_tags` / `error_tags` (`name`, `display_name`).
- `user_topic_evidence`: one row per (user, tag_type, tag_id); statuses `seen|practiced|needs_more_practice`; `source_type` incl. `teacher_observation`; `evidence_detail` jsonb; `updated_at`.
- `learning_events` (Slice 69): `event_type` ∈ {`word_flag_request`, `check_answer_error`, `teacher_observation`}, `occurred_at`, `detail` jsonb. `check_answer_error.detail = {error_tags: string[], question, answer, corrected}`; `teacher_observation.detail = {flags, clears, note}`.
- `word_flag_request_rollup` (Slice 69): `(user_id, story_id, flag_text, occurrence_index)`, `times_requested`, `first/last_requested_at` — the durable "No entendí" signal.
- `pronunciation_attempts`: `user_id`, `weak_sounds text[]` (IPA), `accuracy_score`, `created_at`.

## Build

### 1. `src/lib/ficha.ts` — loaders + pure assembly

All reads take an admin-client `SupabaseClient` and a student id. Each loader fails soft (log + return empty) EXCEPT flag loading, which already throws via `loadOpenFlags`.

- `loadTagDisplayNames(supabase)` → `Map<string, {tagType, name, displayName}>` from the four catalog tables (`id, name, display_name` each). Cache-free; the page runs once per open.
- `loadActiveFlags(supabase, studentId)` → all `user_topic_evidence` rows for the student with `status = 'needs_more_practice'`, resolved via the map: `{tagType, displayName, sourceType, updatedAt}`. (Supersedes nothing — `loadOpenFlags` stays for the roster panel; this is the richer read.)
- `loadRecentErrorEvents(supabase, studentId, limit = 10)` → `learning_events` where `event_type = 'check_answer_error'`, newest first, mapped to `{occurredAt, errorTags, answer, corrected}` (truncate answer/corrected to 500).
- `loadTeacherObservationHistory(supabase, studentId, limit = 20)` → `event_type = 'teacher_observation'`, newest first, `{occurredAt, flags, clears, note}`.
- `loadTopFlaggedWords(supabase, studentId, limit = 10)` → `word_flag_request_rollup` for the student ordered by `times_requested desc, last_requested_at desc`: `{flagText, timesRequested, lastRequestedAt}`.
- `loadWeakSoundSummary(supabase, studentId)` → `pronunciation_attempts` for the student (last 20 attempts): count each IPA symbol's frequency across `weak_sounds`, return top 6 `{ipa, count}`. Pure frequency-count helper exported separately for tests.
- `buildFicha(...)` — pure function taking the six results, returning one `Ficha` object for the page. Unit-test this assembly (empty inputs, dedupe, ordering).

### 2. Page section — server-rendered, no new client component

On `students/[studentId]/page.tsx`, add a **"Ficha"** section (Spanish heading, above the per-session list, below the existing header/ObservationTagForm area):

- **Banderas activas** — resolved display names with a family label (Error / Sonido / Gramática / Vocabulario) and source ("tú" when `teacher_observation`, "sistema" otherwise) + `updated_at` via `LocalDateTime`. Empty state: "Sin banderas activas." (a good sign, phrased warmly).
- **Errores frecuentes** — recent `check_answer_error` events: each row shows the error-tag display names and the answer→corrected pair (answer in secondary text, corrected emphasized). This is the Ficha's core: the actual evidence, not a score.
- **Palabras más consultadas** — rollup top words: word + "N veces" + last date.
- **Sonidos débiles** — IPA symbols only, rendered with the existing IPA treatment (tappable-IPA styling conventions from the reader; NO score percentages — Guiding Principle 20 spirit: effort and pattern, not grades).
- **Tus observaciones** — teacher_observation history rows (flags marked, clears shown as "quitada", note text).
- No accuracy/fluency numbers anywhere. No trends, no percentages, no gradebook.

Teacher-facing desktop-first 3-column zone (DESIGN.md teacher section): reuse existing card/table/label patterns from other teacher pages. If any needed pattern is not covered by DESIGN.md, ASK Kyle before inventing (ask-gate). Zero new tokens expected.

### 3. Tests

`src/lib/ficha.test.ts`: weak-sound frequency count (multi-symbol arrays, empty arrays), top-N rollup ordering, error-event truncation, `buildFicha` on all-empty inputs, flag resolution name-missing case (unknown tag_id → fall back to raw id string, never crash). All existing tests stay green; `tsc` clean.

## Verification

- `npm test` green, `tsc` clean.
- Manual probe: a student with a Slice 71 flag + one check-answer error shows all five blocks; a fresh student shows the empty states without layout gaps.

## Constraints

- No migration. No AI calls. No student-facing UI. No new client interactivity (server-rendered reads only).
- Do not modify slice 71's form or action.
- PRD row: Slice 72 (if taken, use the next free number and note it in this file's header, as in Slice 69).
- Commit only this slice's files: `src/lib/ficha.ts` (+ test), the student detail page, PRD row, this file. Do not sweep the working tree.
