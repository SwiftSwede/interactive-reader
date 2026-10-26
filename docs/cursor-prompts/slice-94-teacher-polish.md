# Slice 94: Teacher dashboard polish, pass 1 (shell + Este mes)

Refinement inside the existing Paper Light teacher spec (DESIGN.md, "Teacher Dashboard"). Not a new visual world. No schema.

## Why

The teacher side predates the design skills. Kyle's read: it looks unfinished and is inconsistent page to page.

## Scope

Pass 1: `TeacherShell` and Este mes (`/teacher`). Later passes, each with its own critique: group page (`/teacher/classes/[id]`), live sesión, Ficha, Analíticas, Contenido.

## Brief

- Job: Kyle at desktop, often mid-Zoom. Este mes answers "what's on today" and "is the month ready" in seconds.
- Shared teacher page header (title, one line, primary action right) so every page reads the same.
- Today first: a group with class today shows its countdown and actions together with the group.
- Group card: next class shows type and title together, plus which classes still lack content ("Falta: Clase 8 · Examen").
- Rail identity shows once (today the email renders twice when no display name).
- Boundaries: no new tokens without asking, no KPIs or percents or gradebook language, no student route changes. `ClassDayCard` is shared with student Inicio, so changes stay teacher-only.

## Plan review decisions (Kyle, 2026-10-26)

- Scope: mixed. Preserve IA (rail, pages). Fix screens that are structurally wrong.
- Pain: looks unfinished; inconsistent.
- First pass: shell + Este mes.
- Right context panel: stays click-to-open on Este mes (no auto-select).
- Group cards list the classes missing content, not only "7/8 clases listas".

## Critique decisions (Kyle, 2026-10-26, after critique 21/40)

- Today's class merges into its group's card. That group sorts first. Abrir la clase and Entrar a Zoom stay visible all day, not only from T-10.
- Context panel (still click-to-open): compact 8-class strip (status + one action per row), Zoom link, Abrir grupo. No repeat of the card.
- Dates: Spanish for students, English for teachers. `LocalDateTime` defaults to Spanish; teacher pages pass English.
- Scope: all five critique issues (3 P1, 2 P2): missing-content list, panel strip, today merge, consistency (radius, glyph, rail email, countdown spacing, button weight), panel controls (Escape, focus, close at all widths).
