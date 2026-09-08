# ADR 008: Teacher ends class, clock does not

## Context

Sessions are created with a 90-minute `session_start_time` / `session_end_time` window. Teaching mode (YouTube lock, Listo, note capture, hidden dictation) used that clock. Kyle often runs long. A live Traducción class lost Listo at minute 90 while he was still teaching.

Auto-unlock at 90 minutes was the original Phase 2 decision. It is the wrong cutoff for a live teacher.

## Decision

Add `course_sessions.class_ended_at`. Teaching mode stays on after the scheduled end until Kyle taps Terminar clase on the last lesson step. If he forgets, teaching mode ends four hours after `session_end_time` so a class cannot stay live overnight.

Review mode (original English for students, dictation, recordings) starts at `class_ended_at`, not at the 90-minute mark. Past sessions were backfilled with `class_ended_at = session_end_time`.

## Consequences

- Dashboard EN VIVO on the lesson list follows teaching mode. Join cards (Inicio, Este mes, Grupos) swap at the scheduled end, or earlier if Kyle already tapped Terminar clase. Overtime is lesson-page teaching mode only.
- Attendance from a session-link click still counts while teaching mode is on (including overtime).
- Terminar clase also sets `answers_revealed`.
- The scheduled 90-minute times remain useful for planning and for the overtime cap.
