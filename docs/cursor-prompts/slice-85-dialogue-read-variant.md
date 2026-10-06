# Slice 85 — Dialogue read step: kind-variant onboarding copy

Dialogue lessons reuse the story steps (`StorySteps.tsx`): El diálogo /
Comprensión / Personal (+ Dictado/Coral/Pronunciación when coral data exists).
This slice gives the READ step its own copy for `kind = "dialogue"`. All other
steps keep inheriting the story copy (the exercises are identical).

## Grounded in

`Language-Wiki/concepts/dialogue-class-methodology.md` — cold read in pairs
with chosen roles, flow is sacred, corrections collected not delivered,
vocabulary review is the heart of the class. Density-first framing ratified
by Kyle 2026-10-05: the why opens with the same vocabulary-density argument
as the story card, dialogue's twist is conversation vocabulary, reading aloud
is the bonus.

## Copy (verbatim — do not edit, reflow, or "fix" accents)

**Step: read (kind = "dialogue" only)**

Line (always):

> Lee tu parte en voz alta con tu grupo. Es lectura fría: nadie la ha preparado, y eso es el punto.

Why card (once, two lines):

> Ningún material tiene la densidad de vocabulario de un texto, y un diálogo muestra el vocabulario de la conversación real: lo que la gente de verdad dice. Además, leerlo en voz alta ensaya tu boca para la próxima conversación.

Sheet:

> **¿Qué hago?**
> - Elige tu personaje con tu grupo. Cada uno lee las líneas de su personaje en voz alta.
> - Lee de corrido. Si una palabra se te atasca, sigue: las palabras difíciles de hoy son las que repasaremos todos juntos después.
> - Toca las palabras que no entiendas para ver su traducción y pronunciación.
> - Cuando terminen de leer, respondan las preguntas juntos.
>
> **¿Por qué?**
> Ningún material tiene la densidad de vocabulario de un texto: cada oración está construida completamente de palabras, y todo lo que lee alguien que aprende inglés es vocabulario que se queda. Un diálogo tiene una ventaja que un cuento no tiene: es vocabulario de conversación real, lo que la gente de verdad dice, en frases que vas a usar tú también. Y leerlo en voz alta es el ensayo: la boca practica hoy lo que la conversación real pedirá mañana. No es teatro: no hay público ni calificación.

**All other steps:** inherit the story copy exactly as built (Comprensión,
Personal, Dictado, Coral, Pronunciación). No new entries.

## Wiring

- Copy module: `dialogueRead` entry (or `read` variant keyed by kind —
  matcher's choice; one source either way). The read step resolves story copy
  vs dialogue copy by `story.kind`.
- Scope gate: only `kind === "dialogue"` resolves the dialogue variant;
  `kind === "story"` keeps the story entry (Slices 78/82b unchanged).
- Sheet, one-liner, whyShort, dismiss keys, and mode behavior all reuse the
  Slice 82b components unchanged.

## Untouched / out of scope

- Song (`kind = "song"`) still exits to its own component; next slice.
- Dictado/Coral/Pronunciación steps on dialogue lessons inherit story copy.
- Comprensión/Personal on dialogue lessons inherit story copy (answered the
  same way per the wiki's Phase 3).
- No new UI, no mode variants.

## Copy rules (hard requirements)

- Spanish accents mandatory; em dashes banned; tú register; enter copy
  verbatim; whyShort never renders without the one-liner above it.

## Verification

- tsc clean, full suite green, PRD + DESIGN.md synced, build hash recorded.
