---
target: teacher Contenido catalog
total_score: 22
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/Users/kylote/Desktop/WebDev/interactive-reader/src/app/teacher/content/page.tsx"
target_path: /Users/kylote/Desktop/WebDev/interactive-reader/src/app/teacher/content/page.tsx
timestamp: 2026-10-26T20-07-38Z
slug: src-app-teacher-content-page-tsx
---
# Critique: Contenido (`/teacher/content`) — 22/40

Method: code read + 1440 screenshot of the catalog list. Editors, create forms, courses, and products are out of this pass.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Status | 2 | Six create links plus 15 filter chips; no count of what's showing |
| 2 | Real world | 2 | "pipeline de importación" is shop talk; Día 5 shows "0 palabras" |
| 3 | Control | 3 | delete strip is already a 44px full-height cell |
| 4 | Consistency | 2 | no TeacherPageHeader; create links are outlined, not the shared teacher buttons |
| 5 | Error prevention | 2 | a trash can on every row including in-use exams (blocked only after the dialog) |
| 6 | Recognition | 2 | kind lives as a terracotta pill on the right, after the title |
| 7 | Efficiency | 2 | 11 kind chips wrap onto two rows; Cursos and Productos sit in the create row |
| 8 | Minimalist | 1 | six same-weight create buttons, a paragraph, two chip rows, then the list |
| 9 | Error recovery | 3 | delete dialog already blocks in-use rows |
| 10 | Help | 3 | the muted import line is the only extra copy |

## Priority issues
- [P1] Six create buttons and two destinations (Cursos, Productos) share one row of equal weight. Nueva clase is the one primary on the group page; here nothing is. Fix: TeacherPageHeader with one primary "Nuevo" (or keep four creates as a quieter row) and move Cursos / Productos out of that row.
- [P1] Filters and list fight. 11 kind chips wrap; "Todos" appears twice; no result count; "0 palabras" on audio days. Fix: fewer chips or a compact kind row, "N lecciones" above the list, hide empty word counts.
- [P2] No shared header. Description is a run-on of every kind you can create.
- [P2] Kind is a terracotta pill after the title. Put kind + level first so you can scan.

## Persona red flags
- Kyle looking for tonight's exam: Recientes dumps exams, audio days, and Numb in one pile. Filters exist but wrap and don't remember.

## Detector
CLI not run yet. Out of scope: StoryEditor, ExamEditor, create forms, `/teacher/content/courses`, `/teacher/products`.
