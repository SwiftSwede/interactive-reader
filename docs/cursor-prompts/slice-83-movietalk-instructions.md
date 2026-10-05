# Slice 83 — Movie Talk step instructions and why cards

Extends the onboarding system (Slices 78–82b) to the Movie Talk lesson page
(`src/components/movietalk/MovieTalkLessonSteps.tsx`). Same patterns, same copy
rules, no new design decisions.

## Steps and panels (grounded in the code)

`movieTalkStepList()` builds: optional Warm-up → Sinopsis → per scene
(Video n → Diálogo n) → Fin.

- **Video n** renders `SceneVideoQuestions` (scene video + scene questions
  together).
- **Diálogo n** renders `SceneDialogue` (dialogue text with word lookups).
- **Fin** renders a closing message only — gets NO instructions and NO card.

## Copy (verbatim — do not edit, reflow, or "fix" accents)

| step | line (always) | whyShort (once) |
|---|---|---|
| warmup | Lee la pregunta y prepárate para comentarla con la clase. | (none) |
| synopsis | Lee de qué trata el video antes de verlo. | Saber de qué va la historia libera tu atención para el idioma. No adivinas de qué hablan: escuchas cómo lo dicen. |
| scene video | Mira la escena y busca las respuestas a las preguntas. | Tu cerebro escucha diferente cuando sabe qué buscar. Con las preguntas antes, estás cazando respuestas, no solo viendo. |
| scene diálogo | Lee el diálogo en voz alta con tus compañeros. | Aquí escuchaste inglés de verdad, sin ayuda y sin vocabulario preparado. Leer el diálogo te revela lo que en realidad dijeron. Esos momentos de "¡ah, eso era!" son tu cerebro aprendiendo. |

### Sheet contents (`¿Qué hago?` / `¿Por qué?` sections)

- **Warm-up:** ¿Qué hago?: the full instruction list ("Lee la pregunta con
  calma." / "Prepárate para comentar tu respuesta con la clase en voz alta.").
  No ¿Por qué? section.
- **Sinopsis:** ¿Qué hago?: "Lee la sinopsis." / "Es un resumen corto de la
  historia: te dice de qué va, no lo que se dice."  ¿Por qué?: the whyShort
  paragraph above serves as the why body (it is already full length).
- **Scene video:** ¿Qué hago?: "Lee las preguntas de la escena con calma, pero
  no las respondas todavía." / "Mira la escena con las preguntas en mente." /
  "Si quieres, anota las respuestas para recordarlas. Si tu memoria te alcanza
  sin notas, también está bien."  ¿Por qué?: reuse the presentation Preguntas
  why paragraph from `src/lib/lesson-copy.ts` (same argument, do not rewrite).
- **Scene diálogo:** ¿Qué hago?: "El Profe Kyle elige a los lectores; leen sus
  partes en voz alta." / "Después de la lectura, repasamos juntos el
  vocabulario nuevo de la escena." / "Toca cualquier palabra que no entiendas
  para ver su traducción."  ¿Por qué?: expand the whyShort into the sheet body
  verbatim (it is already the full argument).
- **Fin:** nothing. Leave the existing closing panel untouched.

## Wiring

- Reuse the Slice 82b `StepInstructions` pattern: title → one-liner →
  whyShort card (once per step, X-only) → panel content; sheet with the two
  titled sections behind the ⓘ control.
- Movie Talk copy lives in the shared copy module (one source), keyed by
  movie talk step id. Scene steps share one copy entry per kind (video,
  diálogo) — the "n" numbering stays in the existing labels.
- Mode: Movie Talk steps are teacher-paced live; the approved copy is written
  to be true in review mode too (same rule as presentation). No live variants
  in this slice.

## Untouched / out of scope

- Warm-up only exists when `warmupOf(story)` returns content — the step list
  already handles that; no new gating.
- Fin panel text, scene content, CharacterBand, dialogue lookups.
- Dialogue and song lessons (separate slice).
- No walkthroughs, no coach marks, no auto-opening sheets.

## Copy rules (hard requirements)

- Spanish accents mandatory; em dashes banned (commas/semicolons/periods);
  tú register.
- Enter the approved lines verbatim; do not summarize or shorten.
- whyShort card never renders without the one-liner above it.

## Verification

- tsc clean, full suite green, PRD + DESIGN.md synced, build hash recorded.
