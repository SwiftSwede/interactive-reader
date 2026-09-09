# ADR 010: Teacher-paced lesson steps

## Context

On 2026-09-08 Kyle noticed live-class desync: students could walk the lesson ahead of where he was teaching. Phones became a second lesson. Presentation already had a follow-only field (`presentation_step`) so phones could track the teacher, but that pattern was presentation-only and did not lock skip-ahead.

Music class (Slice 63) is the first six-step lesson on `/lesson/[slug]`. The same desync would show up on every future step-based type if we left navigation local.

## Decision

Add `course_sessions.lesson_step_current` (text, nullable) and `lesson_step_locked` (boolean, default false). This is the general lock for step-based lessons. Presentation keeps `presentation_step`; do not migrate it.

Snap-forward, not clamp-only: the bottom step pills write `lesson_step_current` and jump every live student to that step. Students may then walk back. Forward past the teacher stays disabled while locked. Late joiners land on the teacher's current step.

Only those two bottom pills move the class. Teacher progress dots are local peek: Kyle can look ahead without dragging phones.

Pacing controls are the same bottom step pills as the rest of the lesson, on the song lesson page when Kyle is logged in as teacher. **Abrir todas** / **Bloquear pasos** sits in the middle of that row. Analytics stay on the teacher session page.

Lock starts when Kyle first opens the song lesson as teacher during live class, if `lesson_step_current` is still null: persist the first visible step and `lesson_step_locked = true`. **Abrir todas** is the opt-out and survives a refresh (do not re-lock if current is already set). If he never opens the lesson page, null/unlocked defaults remain and phones behave as they did before this slice. Auto-lock only in the live phase, not before or after class.

New step-based lesson types MUST implement this lock. Music implements it in this slice. Presentation stays on its own field.

## Consequences

- Live students cannot skip ahead while locked. Review and consumer modes stay free-navigate.
- A class still runs if Kyle never uses pacing: defaults are null/unlocked.
- Realtime on `course_sessions` carries the two fields plus `answers_revealed` and `class_ended_at`.
- Future types (anything with a step list on a lesson page) reuse these columns instead of adding another `*_step` field, except presentation which already shipped.
