# Slice 82b — wire the approved compact copy into StepInstructions

Slice 82 (9643ce8) built the right shape but wired it to the wrong copy source.
The approved copy sets from the Slice 82 review (chat, 2026-10-04) were never
entered. This slice fixes the wiring. No new design decisions.

## Current state (what to change)

In `src/components/lesson/StepInstructions.tsx`:

1. The one-liner is `copy.instructions[0]` — the first FULL instruction bullet.
   The story step therefore shows a 3-sentence line ("Léela de arriba a abajo…
   No entres en pánico.") as its compact line. Wrong.
2. The inline MicroExplanation card still shows the FULL why paragraph
   (restyled 14px, which is fine). The approved 2-line `whyShort` copy does
   not exist in the codebase. Wrong.
3. The sheet is titled "Cómo" and holds only instructions + note. The approved
   two-section sheet ("¿Qué hago?" / "¿Por qué?") was not built.

## Copy module schema

Extend each entry in `src/lib/lesson-copy.ts` (and the video-summary /
presentation copy modules, or their shared module — keep one source) with:

- `line: string` — the always-visible one-liner.
- `whyShort: string` — the 2-line once-per-step card copy.
- Live variants where a mode split exists (`lineLive`, `whyShortLive`) for
  VS:Traducción and Pres:Respuestas only.
- The existing `instructions` array and `why` paragraph stay — they become the
  sheet's two sections.

## Approved copy (verbatim — do not edit, reflow, or "fix" accents)

### Story steps (kind === "story" only, as in Slice 78)

| step | line | whyShort |
|---|---|---|
| story | Léela de corrido. Toca las palabras que no entiendas. | Ningún material tiene la densidad de vocabulario de un texto. Por eso los que leen aprenden más rápido. |
| comprehension | Responde antes de mirar la respuesta. | Tu cerebro fija lo que aprende leyendo cuando intentas recordarlo. Intentarlo y fallar es el entrenamiento que hace rápido tu memoria. |
| personal | Escribe tus respuestas. Aquí no hay incorrectas. | Hablar de tu vida te obliga a producir inglés de verdad. Ahí descubres qué te falta decir. |
| dictation | Escucha y escribe lo que oyes. | Las palabras que crees conocer pueden sonar diferentes cuando se hablan rápido. Este ejercicio te muestra exactamente dónde te falla el oído. |
| choral | Escucha y repite en voz alta. | Repetir en voz alta entrena tu boca como el gimnasio: con repeticiones, el sonido sale solo. |
| pronunciation | Grábate y compárate con la referencia. | No puedes corregir un sonido que no puedes escuchar. Grabarte y escucharte es la herramienta más honesta que existe. |

### Video summary steps

| step | line (review) | line (live) | whyShort |
|---|---|---|---|
| vs:video | Mira el video. Anota solo si quieres. | (same) | Entender la historia es la materia prima de todo lo que sigue. Mira con intención, no por ver. |
| vs:resumen | Escribe tu resumen en inglés hasta que el tiempo termine. | (same) | Escribir te obliga a producir el idioma de verdad. Ahí descubres qué sabes decir y qué te falta. |
| vs:traduccion | Escribe tu traducción y compárala con la del Profe. | Di tu versión en voz alta; el Profe escribe la real. | El momento de "¿cómo se dice?" es cuando tu mente busca el hueco. Ahí es donde la traducción enseña. |

### Presentation steps

| step | line (review) | line (live) | whyShort |
|---|---|---|---|
| pres:vocabulario | Escucha la explicación y pregunta tus dudas. | (same) | Un video lleno de palabras desconocidas es ruido. Conocerlas antes es lo que lo convierte en entrada que tu cerebro sí guarda. |
| pres:preguntas | Léelas con calma; las respondemos después del video. | (same) | Tu cerebro escucha diferente cuando sabe qué buscar. Con las preguntas antes, estás cazando respuestas, no solo viendo. |
| pres:video | Mira el video con las preguntas en mente. | (same) | (no why card — notes permission already carries the why) |
| pres:respuestas | Escribe tu respuesta y compárala. | El Profe pregunta; da tu versión en voz alta. | Producir la respuesta, aunque quede a medias, fija el vocabulario. La correcta es el premio, no el reemplazo. |

## Sheet changes

- Two titled sections, in this order: `¿Qué hago?` (the existing full
  instruction list + note) then `¿Por qué?` (the existing why paragraph).
- Keep the existing bottom-sheet chrome, drag handle, focus trap, and close
  button exactly as built in 9643ce8. Only the content and section headings
  change.
- The existing `why` paragraph copy from Slice 78/81 stays verbatim as the
  ¿Por qué? body. Steps with no why (pres:video) show only ¿Qué hago?.

## Untouched

- MicroExplanation dismiss-once behavior and dismiss keys.
- The 14px Roboto Flex / text-secondary restyle (already correct).
- Scope gates (story-only gating, teacher skips why cards, welcome gate).
- Mode resolver `stepCopyForMode()`.

## Copy rules (hard requirements)

- Spanish accents are mandatory. Em dashes are banned (use commas, semicolons,
  or periods). Tú register throughout.
- Do not summarize, shorten, or merge the approved lines. Enter them verbatim.
- The whyShort card never renders without the one-liner above it.

## Out of scope

- Movie Talk and dialogue/song steps (separate slice).
- Any new UI beyond the section headings; no walkthroughs, no coach marks,
  no auto-opening sheets.

## Verification

- tsc clean, full test suite green, PRD + DESIGN.md synced, build hash
  recorded in PRD.
