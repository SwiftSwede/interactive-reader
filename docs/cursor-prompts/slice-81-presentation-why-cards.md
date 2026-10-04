# Slice 81 — Presentation + video summary: why cards and mode-aware instructions

> Brainstormed with Kyle 2026-10-01. Ruling: why cards for ALL first-time students, in class or self-learning — no mode skips the why. Instructions, however, split by mode where the activity itself differs (Respuestas / Traducción). Reuses Slice 78/80 patterns: copy in hard-coded `src/lib/lesson-copy.ts`, `StepInstructions` for instructions, `MicroExplanation` for one-time why cards (localStorage per dismissKey, dismiss once, never returns). Copy rules: tú, accents mandatory, NO em dashes, no guilt framing, no orientation block, nothing near step navs. If PRD 81 is taken, use the next free number and note it in the header.

## Copy (approved in brainstorm unless marked UNREVIEWED)

### Presentation (`PRESENTATION_COPY`, keyed by cycle step `vocabulario | preguntas | video | respuestas`)

**Vocabulario** — instructions:

- El Profe Kyle presenta el vocabulario nuevo del video. Escucha las explicaciones.
- ¿Tienes dudas sobre una palabra? Pregunta ahora. Este es el momento para preguntar.

**Vocabulario** — why:

> Ver un video lleno de palabras desconocidas es ruido: entra y no se queda nada. Conocer el vocabulario antes es lo que convierte el video en entrada que tu cerebro sí puede guardar. No es un trámite antes del video. Es lo que hace que el video funcione.

**Preguntas** — instructions:

- Estas son las preguntas que vas a responder del video.
- Léelas con calma, pero no las respondas todavía. Primero toca ver el video.

**Preguntas** — why:

> Tu cerebro escucha diferente cuando sabe qué buscar. Con las preguntas antes del video, no estás solo viendo: estás cazando respuestas. Por eso te las damos primero y no después. Escuchar con intención vale mucho más que escuchar y rezar para acordarte.

**Video** — instructions (no why card):

- Mira el video y mantén las preguntas en mente.
- Si quieres, anota las respuestas para recordarlas. Si tu memoria te alcanza sin notas, también está bien.

**Respuestas** — instructions, LIVE variant (teacher-driven, oral, fast):

- Esta parte es en vivo: el Profe Kyle pregunta, tú das tu versión en voz alta, y él escribe la respuesta real.
- Al final, puedes preguntar cualquier cosa sobre el vocabulario o algo que viste en el video.

**Respuestas** — instructions, REVIEW/SELF-LEARNING variant:

- Escribe tu respuesta en inglés con tus propias palabras.
- Cuando termines, compárala con la respuesta correcta.
- Repite esta parte cuando quieras: cada video sirve para practicar a tu ritmo.

**Respuestas** — why (same card both modes):

> Intentar producir la respuesta, aunque quede a medias, enseña más que escuchar la respuesta correcta. El esfuerzo de recordarlo tú es lo que fija el vocabulario en la memoria. La respuesta correcta es el premio final, no el reemplazo del intento.

### Video summary (`VIDEO_SUMMARY_COPY` extension)

**El Video** — why (UNREVIEWED, Kyle may edit):

> Todo lo demás se construye sobre entender la historia. Si miras el video solo por verlo, escribir y traducir después son adivinanzas. Mira con intención: la historia que entiendes es la materia prima de todos los ejercicios que siguen.

**Tu Resumen** — why (UNREVIEWED, Kyle may edit):

> Escribir en inglés, aunque te falten palabras, te obliga a producir el idioma de verdad. Ahí descubres qué sabes decir y qué te falta. Ese es el mejor calentamiento posible para la traducción, y es exactamente lo que el Profe Kyle necesita ver de tu inglés.

**Traducción** — instructions, LIVE variant (this is the existing approved bullet, now live-scoped):

- Esta parte es colaborativa. Cuando el Profe Kyle pida una traducción, di tu versión en voz alta; después él escribe la traducción real.

**Traducción** — instructions, REVIEW/SELF-LEARNING variant (UNREVIEWED, Kyle may edit):

- Escribe tu versión en inglés, oración por oración.
- Cuando termines, compárala con la traducción del Profe Kyle.

**Traducción** — why (UNREVIEWED, Kyle may edit):

> Al intentar traducir descubres exactamente qué te falta decir. Ese momento de "¿cómo se dice?" es cuando tu mente está buscando el hueco, y lo que veas después cae en un lugar preparado. Nadie aprende frases nuevas sin haber sentido primero que las necesitaba.

## Implementation

1. **Copy module types:** extend the entry shape with two optional fields: `instructionsLive?: string[]` (mode-aware override used during live class) and `why?: string` (one-time why card copy). `instructions` stays the default (used in review/self-learning when no live override exists, and in live mode when no override exists). No breaking change to the story entries.
2. **PresentationPlayer:** render `StepInstructions` at the top of each cycle-step panel (Vocabulario / Preguntas / Video / Respuestas), same placement discipline as Slice 80. For the Respuestas step pick the variant from mode: `phase === "live"` (or the component's equivalent live signal) → live variant; `phase === "after"` or self-learning (session without live phase) → review variant. Render a `MicroExplanation` with the step's `why` under/above the instructions block (same visual position as story lessons; dismissKeys: `presentation-vocabulario`, `presentation-preguntas`, `presentation-respuestas` — no key for `video`). The why shows ONCE ever per key, in every mode, teacher chrome included only if trivial — prefer skipping it for `isTeacher` if that requires new plumbing.
3. **VideoSummaryPlayer:** add the three why cards (`MicroExplanation`, dismissKeys `vs-video`, `vs-resumen`, `vs-traduccion`). Split the Traducción instructions by mode: live → existing collaborative bullet; review/self-learning (phase "after" or non-live session) → the review variant. The El Video and Tu Resumen instructions are unchanged (no mode split).
4. **Do NOT** add why cards or instructions to ExamSession, MusicLessonSteps, MovieTalk, dialogue, Drill Lab — separate slices.
5. **Truth docs** in the same commit: PRD slice row, `.cursorrules` Current Phase line, DESIGN.md `step_instructions` entry scope note extended to "story + video summary + presentation"; document the why-card placement for these pages the same way DESIGN.md documents MicroExplanation.

## Verification

- `npx tsc --noEmit` + full `src/lib` test suite green.
- Grep new copy: zero em dashes, zero accent-less Spanish (`Sabias|ingles |oido|Traduccion |calificacion |rezar` — the last one confirms the approved Preguntas card text is intact, not paraphrased away).
- Probe: presentation page live mode shows live Respuestas variant + why cards; after class the same session shows review variant; why cards dismiss once and never return per key; video summary Traducción shows the collaborative bullet live and the write-and-compare bullet after class.
- Record the build commit hash in the PRD row.
