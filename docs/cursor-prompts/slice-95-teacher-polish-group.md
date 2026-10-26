# Slice 95: Teacher dashboard polish, pass 2 (group page)

Refinement inside the Paper Light teacher spec (DESIGN.md, "Teacher Dashboard"), continuing Slice 94. Target: `/teacher/classes/[id]`, plus the Grupos today card and the moved student actions on the student page. No schema.

## Critique (2026-10-26): 20/40

Snapshot: `.impeccable/critique/2026-10-26T19-38-00Z__src-app-teacher-classes-id-page-tsx.md`.

- P1: Tema form and Zoom field sit above the 8 classes; Borrar mes next to the title.
- P1: every class row carries Copiar link + Quitar full-width, attendee names, ambiguous "Grabación".
- P1: today is the old standalone ClassDayCard with no actions before T-10.
- P2: buttons render in Lora (`text-sm` without a UI font); filled terracotta tabs and sort chips compete with Nueva clase.
- P2: roster cards carry two full-width buttons each; "Todavía no entra a una clase" next to Asistencia 1/8.

## Critique decisions (Kyle, 2026-10-26)

- Settings: `TeacherPageHeader` (name, meta line, Nueva clase). Tema and Zoom are quiet text with Editar / X under the header. Borrar mes moves to the bottom as a quiet link.
- Rows: one-line row with status icons and "Asistieron 6 de 9". Copiar link stays as a small button. Quitar clase and the attendee names move into the right panel.
- Today: reuse the Slice 94 today band above the list and highlight today's row. Same swap on Grupos.
- Roster: Mover and Quitar move to the student page (Ficha). The card is name, attendance, last app activity, and links there.
- Scope: all P1 and P2.

## Build notes

- Also moved into the panel (follows "row is overview, actions in the panel"): Desbloquear respuestas and Cambiar tipo. Elegir contenido / Por elegir stay on the row (Este mes links land there).
- "Asistieron N de M" counts only students still on the roster, so a row can read one lower than the old "Asistieron: N" when someone has left the group.
- Tema and Zoom no longer print a "guardado" line; the saved value showing is the confirmation.
