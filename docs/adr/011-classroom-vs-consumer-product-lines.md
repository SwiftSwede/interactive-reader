# ADR 011: Classroom vs Consumer Product Line Decisions

## Context

Resolved 2026-08-21, recorded here from `.cursorrules` during the context-hygiene refactor of 2026-09-19. The app serves two product lines with one codebase: live classroom groups (the revenue driver — see ADR 001) and a consumer paid tier. Several borderline behaviors needed a call about where each feature lives.

## Decision

- **Same reader, different overlay.** Classroom and consumer students use identical components; context determines active features. Lesson types transfer to the consumer tier by default (PRD Guiding Principle #18): build for the live class first, but review-mode must also work teacher-less. Classroom-only designs (teacher live input, group-dependent discussion) are recorded PRD exceptions, never accidents.
- **Choral practice + dictation: consumer only.** Classroom students do choral practice live with Kyle on Zoom; those app features are for the teacher-less tier.
- **Personal questions: oral in class** ("Discutir en clase" label), text input + AI in review mode.
- **No due dates, ever.** Kyle's methodology: learning happens in class, not outside. No homework deadlines in any tier.
- **90-min class window.** Scheduled start/end stay on the session; teaching mode continues until the teacher taps Terminar clase (or four hours past scheduled end — see ADR 008). Reveal stays gated until then; manual "Desbloquear ahora" remains as an escape hatch.
- **Group exam is individually written.** Zoom discussion groups stay in Zoom, not in the app. Every student writes their own answers. No designated writer, no live classmate-answer sync. Teacher types accepted answers and checks items one by one on `/exam?session=`. Score is practice math (correct/total), not a CEFR or official grade. Level-differentiated Task 2 (intermediate: Order; pre-intermediate: Correct). See PRD slices 49a–49e.

## Consequences

- New lesson types must ship with a teacher-less review flow or be explicitly listed as classroom-only exceptions in the PRD.
- Consumer-tier features that duplicate live-class activities (choral, dictation) must check subscription context, not assume classroom.
- Absence of deadlines is a product principle, not an oversight: never add due-date UI "for completeness."
