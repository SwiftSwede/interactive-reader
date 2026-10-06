# Slice 86 — Music class onboarding (per-step instructions and why cards)

Extends the onboarding system (Slices 78–85) to the music lesson
(`src/components/music/MusicLessonSteps.tsx`, `src/lib/music.ts`). Five steps,
per-step copy, same components as Slices 82b–83.

## Grounded in

`Language-Wiki/concepts/music-class-methodology.md` (three listens before
production, N+1 blanks, Truquitos = connected speech, karaoke two rounds,
relaxed culture-forward profile). Flow and karaoke mechanics corrected by
Kyle 2026-10-05: no separate video step; mics muted in BOTH karaoke rounds —
the difference is whether Kyle sings along (round 1) or stays silent (round 2).

## Steps (real labels from `LABELS` in `src/lib/music.ts`)

El artista → Primera escucha (video + no lyrics) → Completa la canción →
La letra → Truquitos y karaoke. Steps appear conditionally (bio/YouTube/
blanks may be absent); copy keys by step id, so conditional steps just
render nothing.

## Copy (verbatim — do not edit, reflow, or "fix" accents)

### bio — "El artista"

Line:

> Lee la historia del artista antes de escuchar su canción.

Why card (once):

> Conocer al artista convierte una canción suelta en una historia. Y las historias se recuerdan: así es como la canción se te queda.

### blind_listen — "Primera escucha"

Line:

> Mira el video y escucha sin letra. ¿Cuánto entiendes?

Why card (once):

> Sin letra y sin ayuda, solo trabaja tu inglés. Lo que entiendas hoy es tu punto de partida: en unos minutos verás cuánto de eso era ruido y cuánto era inglés.

### blanks — "Completa la canción"

Line:

> Escucha dos veces, escribe las palabras que faltan y entrega tus respuestas.

Why card (once):

> Las palabras que faltan no se adivinan: se escuchan. Es el entrenamiento de oído más puro que existe, y cada canción deja tu oído mejor para la siguiente.

Sheet ¿Qué hago?:

> - La canción suena dos veces. Anota lo que oigas en cada espacio.
> - Si se te escapa una, no entres en pánico: la canción vuelve a sonar.
> - Cuando termines, entrega tus respuestas y después comparamos juntos.

### lyrics_meaning — "La letra"

Line:

> Lee la letra completa con la traducción a tu alcance.

Why card (once):

> Con la letra completa, la canción deja de ser ruido y se vuelve historia. El Profe Kyle te cuenta qué significa, y por qué la gente la canta.

### truquitos_karaoke — "Truquitos y karaoke"

Line:

> Canta con la letra fonética. Primero con el Profe, después solo con el cantante.

Why card (once):

> Los cantantes comen y pegan palabras: "what do you" suena "whaddya". Los Truquitos te muestran cómo suena el inglés de verdad, y cantarlo es la forma más divertida de entrenar tu boca.

Sheet ¿Qué hago? (first bullet replaces nothing — this step has no existing
instructions; add the two bullets below the instruction list):

> - El botón cambia entre la letra normal y la letra fonética.
> - Son dos rondas y tu micrófono está apagado en ambas. En la primera, el Profe canta contigo para darte el ritmo; en la segunda, canta siguiendo solo la voz del cantante.

## Wiring

- Copy enters the shared copy module as `music` entries keyed by the five
  MusicStepIds. Same fields: line, whyShort, instructions, why.
- Reuse StepInstructions (one-liner → whyShort card once → panel content)
  and the ⓘ sheet with ¿Qué hago? / ¿Por qué? sections, exactly as wired in
  Slices 82b/83/85.
- **Remove the old hardcoded Primera escucha line** ("Escucha sin leer la
  letra. ¿Cuánto entiendes? No importa si no entiendes todo.") — its content
  is now covered by the new line + whyShort; leaving it would double the
  instructions. Replace with the StepInstructions block.
- Dismiss keys: `music-{stepId}` (one-time per step, all songs — the method
  never changes from song to song).
- Mode: the approved copy is true in live and review mode; no variants in
  this slice. (The blanks reveal flow is already handled by the app's own
  Entregar/Desbloquear UI.)

## Untouched / out of scope

- Conditional step logic, blanks worksheet behavior, line-swap toggle,
  karaoke player, teacher analytics.
- Bio/meaning content itself (teacher-authored, never touched).
- No walkthroughs, no coach marks, no auto-opening sheets.

## Copy rules (hard requirements)

- Spanish accents mandatory; em dashes banned; tú register; enter copy
  verbatim; whyShort never renders without the one-liner above it.

## Verification

- tsc clean, full suite green, PRD + DESIGN.md synced, build hash recorded.
