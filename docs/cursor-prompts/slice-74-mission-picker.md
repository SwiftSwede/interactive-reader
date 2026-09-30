# Cursor prompt — mission picker: selection, state, graduation (Slice 74, ADR 015 Phase 2)

Slice number 74 was free in the PRD (2026-09-29).

## Context

Read in this order before anything: `docs/adr/015-deficiency-queue.md` (Decisions 6, 4, 11), `docs/design-overhaul/04-MISSION-CARD.md` (✅ Approved brief — its "Kyle decisions" table governs placement and semantics), then `.cursorrules` (Phase 2 heading). Phase 2 has begun, so the brief's "do not implement until Phase 2" hold is lifted for THIS slice's scope only.

**This slice is the brain, not the surfaces.** No mission card, no Drill Lab, no student UI (those are the next slices and need authored drill content first). This slice ships the picker that decision 6 references: which single tag becomes the student's mission, where that state lives, más tarde state, and teacher-on-sight graduation. Slice 69 precedent: spine first, UI later.

Code reality (verified):
- `user_topic_evidence` — one row per (user, tag_type, tag_id), statuses incl. `needs_more_practice`, `source_type` incl. `teacher_observation`. Students hold SELECT-own RLS, so a student-context read of their own evidence needs no admin client.
- Catalogs: `grammar_tags` (has no prerequisite column in DB — the prerequisite graph lives in `src/lib/knowledge-tags.ts` seeds, name-based), `phonetic_tags`, `error_tags`. `loadTagDisplayNames` in `src/lib/ficha.ts` gives id → display name.
- `save-observation-action.ts` + `recordTeacherObservation` (`src/lib/topic-evidence.ts`) — the teacher clear path. Slice 69's `learning_events` writes use `createAdminClient()`; there is NO student INSERT policy on `learning_events` by design.
- The class-day card (P03) already has a local-"today" boundary; reuse that util for dismissal semantics.

## RATIFIED rules that govern this slice (from ADR 015 + the approved brief)

1. **ONE active mission per student.** Other deficiencies stay invisible until graduation — no queue, no list, no carousel.
2. **Vocabulary never becomes a mission.** Make it structural: the table's CHECK constraint on `tag_type` admits only `grammar`, `phonetic`, `error`. (Vocabulary = coverage; Kyle 2026-09-29.)
3. **Teacher-on-sight graduation:** when a teacher clear removes the flag the active mission targets, the mission graduates immediately.
4. más tarde semantics (decision 5): hides the Inicio CARD until the next local calendar day — the same "today" the class-day card uses, not 24h. The Lab stays available (irrelevant until the Lab exists, but the state is set here).
5. Nothing student-facing renders from this slice.

## Build

### 1. Migration `supabase/migrations/20260929_slice74_student_missions.sql`

`student_missions`:
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `tag_type text NOT NULL CHECK (tag_type IN ('grammar','phonetic','error'))` — the vocabulary ban, structural
- `tag_id uuid NOT NULL` (no FK, same convention as `user_topic_evidence`)
- `status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','graduated'))`
- `started_at timestamptz NOT NULL DEFAULT now()`
- `graduated_at timestamptz`
- `dismissed_until timestamptz` (null = not dismissed)
- `updated_at timestamptz NOT NULL DEFAULT now()`
- Partial unique index `CREATE UNIQUE INDEX student_missions_one_active ON student_missions(user_id) WHERE status = 'active';` — the one-mission rule, structural.

RLS: student SELECT own; student INSERT own (`user_id = auth.uid()`); student UPDATE own (snooze + future drill-win graduation); teacher SELECT for own students (mirror the slice-69 rollup policy shape).

### 2. `src/lib/missions.ts` — picker + state

- `rankMissionCandidates(...)` — pure, exported. Input: the student's `needs_more_practice` evidence rows + catalog (id→name, name→prerequisite names) . Filter to the three mission families. Rank deterministic:
  1. `teacher_observation`-sourced flags first (judgment outranks machines)
  2. prerequisite-satisfied before prerequisite-broken (a grammar tag whose prerequisite is itself flagged is higher-hanging; error/phonetic tags have no prerequisites → always satisfied)
  3. oldest `updated_at` first (longest-standing need)
  4. tie-break `tag_id` (full determinism)
- `getOrCreateActiveMission(client, userId)`: return the active row if present (students may read own). Otherwise rank candidates, insert the winner (catch the unique-index race: on conflict, re-read and return the existing row), and append a `learning_events` row — `event_type = 'mission_started'`, detail `{tag_type, tag_id, name}` — via `createAdminClient()` (server-side only; `user_id` from the caller's session, never a payload).
- `snoozeMission(client, userId, missionId, untilIso)` — sets `dismissed_until`. The instant comes from the SAME local-day boundary util the class-day card uses (next local midnight); the lib takes the ISO, the future server action computes it.
- `graduateMission(adminClient, userId, missionId, reason)` — sets status + `graduated_at`, appends `learning_events` `mission_graduated` detail `{reason}`. Reasons for now: `teacher_clear`.
- **Teacher-clear integration:** in the observation path (`recordTeacherObservation` or `save-observation-action.ts`, wherever the clear is applied), after a successful clear, if the cleared tag is the student's active mission target → `graduateMission(..., 'teacher_clear')`. Fail-soft: a graduation failure must not fail the observation save; log it.

### 3. Tests (`src/lib/missions.test.ts`)

- Ranking: teacher-first, prereq-satisfied-first, oldest-first, tie-break determinism.
- Vocabulary rows in evidence input are ignored (and could never match the table anyway).
- One-active race: insert conflict → return existing (mock the unique violation).
- Snooze sets `dismissed_until`; graduation sets status + event; teacher-clear auto-graduation fires only when the cleared tag matches the active mission target.
- All existing tests stay green; `tsc` clean.

## Verification

- `npm test` green, `tsc` clean, migration applies clean.
- Probe: a student with two `needs_more_practice` flags (one teacher-set, one machine-set) gets the teacher-set tag as their mission; clearing that flag via Notas de clase graduates the mission row and logs `mission_graduated`.

## Constraints

- No UI. No student routes. No drill content, no deck selection (that is the Drill Lab slice). No DESIGN.md changes (nothing visual ships).
- PRD row: Slice 74 (next free; note in this file's header if taken).
- Commit only: migration, `src/lib/missions.ts` (+ test), the teacher-clear integration point, PRD row, this file. Do not sweep the working tree.

## Plan review decisions (2026-09-29)

- Slice 74 was free. No product conflict with ADR 015 or the approved mission brief.
- Prerequisites are the direct seed list. A grammar tag is higher-hanging only when one of its own prerequisite names is also `needs_more_practice`.
- An existing active mission is returned as-is, including when `dismissed_until` is still in the future. Graduation does not create the next mission. Snooze stores the ISO and does not compute local midnight.
- A catalog read failure throws. `loadTagDisplayNames` is not used, because a read error there becomes an empty index and would look like "no mission."
- A failed `mission_started` insert is logged and the mission row is still returned. Teacher-clear graduation stays fail-soft so the observation save still succeeds.
- Verification is `npm test` and `tsc`. The live Notas de clase probe is the same rule as the unit test and was not written against a real student.
