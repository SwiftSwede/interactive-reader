# Cursor prompt — teacher_observation source + end-class roster tagging (Slice 71)

## Context

Read `docs/adr/015-deficiency-queue.md` first — Decision 4 is this slice. Machine sources set sticky flags; only teacher judgment clears them. Today the conversation class (Sistema de 8, Class 4) leaves no evidence at all. This slice gives Kyle a ~30-second per-student tagging moment right after ending class, and the same control on the student detail page anytime.

Code reality (verified):
- `src/types/index.ts` — `TagType` includes `"error"` (slice 70); `EvidenceSourceType` does NOT include `teacher_observation` yet.
- `src/lib/topic-evidence.ts` — `nextEvidenceStatus` is the sticky rule; `CLEARING_SOURCES` excludes judgment; `SOURCE_TAG_TYPES: Record<EvidenceSourceType, ...>` (adding the union member forces the new key).
- `src/lib/content-tags.ts` — `tagTableFor("error")` currently throws `"ERROR_TAGS_NOT_CATALOG"`; `TAG_TYPES` is content-tagging only (`Exclude<TagType,"error">`) — keep it that way.
- `user_topic_evidence` — CHECK constraints on `source_type` (8 values, no teacher_observation) and `tag_type` (3 values, no error); UNIQUE `(user_id, tag_type, tag_id)`; RLS is student-own-insert/select only, no teacher policies.
- Tag catalogs are per-type global tables (`grammar_tags`, etc.) seeded by `scripts/seed-knowledge-tags.ts` from `TAG_SEEDS` (idempotent upsert on `name`).
- UI surfaces: `src/components/EndClassButton.tsx` (ends class, renders null after), `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` (server page, imports EndClassButton at bottom), `src/components/teacher/StudentRoster.tsx`, `src/app/teacher/classes/[id]/students/[studentId]/page.tsx` (student detail — the Ficha's future home).

## Build

### 1. Migration `supabase/migrations/20260929_slice71_teacher_observation.sql`

- `CREATE TABLE public.error_tags` mirroring `grammar_tags` shape: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `name text NOT NULL UNIQUE`, `display_name text NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`. RLS: copy `grammar_tags` policies exactly.
- `user_topic_evidence` CHECK constraints (ADR 007 drop-and-readd pattern, verify existing rows satisfy first): `source_type` gains `'teacher_observation'`; `tag_type` gains `'error'`.
- No FK additions (tag_id stays untyped uuid by family, as today).

### 2. Error tag catalog seeding

- `tagTableFor("error")` returns `"error_tags"` (remove the throw and its `AppError`).
- `scripts/seed-knowledge-tags.ts`: add an explicit `error_tags` pass seeding `TAG_SEEDS.error` (21 rows, upsert on `name`). Do NOT touch `TAG_TYPES` — error tags stay out of content tagging. Update `SCRIPTS.md` (the script must be run once after deploy).

### 3. Evidence layer (`src/lib/topic-evidence.ts`, `src/types/index.ts`)

- `EvidenceSourceType` += `"teacher_observation"`.
- `nextEvidenceStatus`: FIRST line — `if (candidate.sourceType === "teacher_observation") return candidate.status;` Teacher judgment overwrites everything, including clearing a sticky flag and overwriting a machine `needs_more_practice`. Add it to `PRACTICE_SOURCES` and `CLEARING_SOURCES` too (documentary truth; the early return governs).
- `SOURCE_TAG_TYPES` gains `teacher_observation: ["grammar", "vocabulary", "phonetic", "error"]`.
- New exported `recordTeacherObservation(supabase, input)`:
  - `input: { studentId, sessionId?: string | null, observations: Array<{ tagType: TagType; tagName: string; action: "flag" | "clear" }>, note?: string }`
  - Resolve each `tagName` against its catalog table (select `id` where `name` = tagName); unresolved names are NOT errors — they drop from tags and append to the note (ADR 014 autocomplete pattern: misses become free-text notes).
  - `action: "flag"` → status `needs_more_practice`; `"clear"` → status `practiced`.
  - Reuse `recordTopicEvidence` with `sourceType: "teacher_observation"` (build `EvidenceWrite[]` directly; do not use `buildWritesFromTags` — this isn't content-derived).

### 4. Server action `src/app/teacher/save-observation-action.ts`

- `requireTeacher`, then verify ownership WITHOUT trusting client ids: the teacher owns a course in which `studentId` is enrolled, and when `sessionId` is given, owns that session.
- `createAdminClient()` for writes (service role bypasses RLS — same pattern as the check-answer event write in slice 70; do NOT add a teacher cross-user write policy on `user_topic_evidence`).
- Call `recordTeacherObservation`, then insert one `learning_events` row: `event_type = 'teacher_observation'`, `user_id = studentId`, `course_session_id = sessionId ?? null`, `detail = { flags: [...resolved names flagged], clears: [...cleared], note }`. Fail the action loudly (return the Spanish error) if the evidence write fails — tracking here is the point of the action, unlike fire-and-forget check-answer.

### 5. UI — one shared component, two surfaces

New client component `src/components/teacher/ObservationTagForm.tsx`:
- Props: studentId, sessionId?, existing flags (from server), tag vocabulary (grouped: Errores comunes / Sonidos / Gramática — display names + names, passed from the server page).
- Tag entry: a text input with a native `<datalist>` over the vocabulary (ADR 014 pattern); picking/typing a name and pressing a "Marcar" button adds a chip; typing an unknown term requires a note (it becomes note-only, show it as such).
- Existing `needs_more_practice` flags render as removable chips (removal = `action: "clear"`).
- Optional note textarea (max 1000). One Guardar button (`ActionButton`).
- Teacher-facing: reuse existing teacher-page components and DESIGN.md tokens only. If a selectable chip/pill pattern is not covered by DESIGN.md, ASK Kyle before inventing (ask-gate) — do not ship an unapproved pattern.

Surface A — end-class moment: `sessions/[sessionId]/page.tsx`. When the class is ended (`class_ended_at` set, i.e. where `EndClassButton` renders null), render a "Notas de clase" panel above it: one collapsed row per enrolled student (name/email like StudentRoster rows), expanding to `ObservationTagForm`. Includes a "Saltar" affordance; the panel is dismissable for the session once saved/skipped (store nothing — client state is fine). Server-loads existing flags per student via admin client.

Surface B — anytime: `students/[studentId]/page.tsx` gets the same `ObservationTagForm` (sessionId null). This is the Ficha v0 surface; the full deficiency view is a later slice.

### 6. Tests

- `nextEvidenceStatus`: teacher sets over machine flag, teacher clears sticky flag, teacher overwrites practiced→seen is NOT possible (statuses are seen/practiced/needs_more_practice; clear = practiced), teacher candidate always wins over passive rules.
- `recordTeacherObservation` (mocked client): unresolved name → note-only; flag/clear produce correct statuses and tagIds; dedupe same (tagType, tagName).
- All existing tests stay green; `npx tsc --noEmit` clean (fix compiler-forced exhaustive switches).

## Verification

- `npm test` green, `tsc` clean, migration applies clean.
- Manual probe: run the seeder; end a test class; from the Notas de clase panel flag a student with `preposition_partner` — assert a `user_topic_evidence` row (`source_type = 'teacher_observation'`, `needs_more_practice`) and a `learning_events` row (`teacher_observation` event with the flag + session id). Clear it — status flips to `practiced`. Type a nonsense tag with a note — no tag row, note recorded in the event.

## Constraints

- No student-facing UI. No AI calls. No new deps. Teacher surfaces only.
- Student route visibility line untouched: nothing here renders on student routes.
- PRD row: Slice 71 (if the number is taken, use the next free one and note it in this file's header, as in Slice 69).
- Commit only this slice's files: migration, seeder + SCRIPTS.md, types, topic-evidence.ts (+ test), content-tags.ts, new action, ObservationTagForm + touched teacher pages, PRD row, this file. Do not sweep the working tree.
