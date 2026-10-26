---
target: teacher group page
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/kylote/Desktop/WebDev/interactive-reader/src/app/teacher/classes/[id]/page.tsx"
target_path: /Users/kylote/Desktop/WebDev/interactive-reader/src/app/teacher/classes/[id]/page.tsx
timestamp: 2026-10-26T19-38-00Z
slug: src-app-teacher-classes-id-page-tsx
---
# Critique: group page (/teacher/classes/[id]) — 20/40

Method: single pass (code read + 1440 screenshots: Clases, Estudiantes, panel open).

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Status | 2 | "Grabación" reads the same with or without one; today's row not marked |
| 2 | Real world | 2 | generic "Una clase es un Zoom..." line; "Todavía no entra a una clase" next to Asistencia 1/8 |
| 3 | Control | 2 | Quitar (delete class) has the same weight as Copiar link on every row |
| 4 | Consistency | 2 | row/roster buttons render in Lora; filled terracotta on Guardar tema, Clases tab, Nueva clase, Nombre sort; sort chips 8px vs tabs 16px |
| 5 | Error prevention | 2 | Borrar mes sits beside the title; Quitar x8 and Quitar x9 one click from confirm |
| 6 | Recognition | 2 | must scan 3 lines per row to find tonight |
| 7 | Efficiency | 2 | today card has no actions before T-10; Tema + Zoom setup ~450px above the classes |
| 8 | Minimalist | 1 | 16 row buttons + 18 roster buttons; attendance name walls on every row |
| 9 | Error recovery | 3 | inline confirms ok |
| 10 | Help | 2 | ThriveCart paragraph on every visit |

## Priority issues
- [P1] Setup before work: Tema form (permanent input + primary Guardar tema) and Zoom field push the 8 classes below the fold. Fix: TeacherPageHeader (name, meta line, Nueva clase); Tema and Zoom as quiet text + Editar; Borrar mes to the bottom.
- [P1] Rows are walls: Copiar link + Quitar full-width on every row, attendee names, ambiguous Grabación. Fix: one-line row (Clase N · Tipo, title, date, status icons, "6 de 9"), Copiar link small, Quitar into the panel; today's row on accent-softer.
- [P1] Today card is the old standalone ClassDayCard with no actions until T-10. Fix: reuse GroupTodayBand from Slice 94 (also on Grupos).
- [P2] Consistency: Lora on buttons (text-sm without font-sans), filled-accent tabs/chips compete with primary actions.
- [P2] Roster cards: two full-width buttons per card; contradictory activity copy.

## Persona red flags
- Kyle mid-Zoom: tonight's class is one undistinguished row among 8; Quitar beside Copiar link is a misclick away.

## Detector
CLI 0 findings.
