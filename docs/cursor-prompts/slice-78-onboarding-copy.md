# Slice 78 — Onboarding copy v2: step instructions + vault-sourced "why" callouts

> Brainstormed with Kyle 2026-10-01. Ratified decisions: Shepherd.js tour (PRD Slice 41) rejected for now (anti-fragility: tour anchors break with layout changes). Direction = hard-coded copy module + instructions block under each step + one-time "why" callouts, all sourced from the Obsidian knowledge base (vault `Language-Wiki/concepts/research-evidence-for-methodology.md` and companions). Scope: story lessons only. If the PRD slice number 78 is taken, use the next free number and note it in the header.

## Copy rules (these are build defects if violated — check before every save)

1. **Written accents are mandatory.** All Spanish copy below already carries them. Never strip accents to plain ASCII when typing them into code.
2. **No em dashes (—) anywhere in the copy.** Kyle and his students read them as an AI tell. The copy below is already clean; do not introduce any while refactoring.
3. Register: **tú**, informal-direct, Kyle's Canadian-American classroom voice.
4. Copy lives in a **hard-coded copy module** (product copy, not lesson content; not teacher-editor editable).

## The copy (final, Kyle-approved 2026-10-01)

### story — Lee la historia

**Instructions (always visible):**

- Léela de arriba a abajo sin detenerte. Si la primera lectura se siente difícil, eso es normal. No entres en pánico.
- Toca las palabras que no entiendas para ver su traducción y pronunciación.
- Cuando termines, vuelve a leer la historia. Esta segunda lectura se siente muy diferente.
- En tu tiempo libre, escucha el audio de la historia. Así entrenas tu oído sin esfuerzo.
- La regla más importante: no necesitas entender cada palabra de una oración. Si entiendes el *significado* de la oración, estás aprendiendo. Eso es lo que importa.

**Why (one-time callout):**

> ¿No te gusta leer en inglés? Normal. Pero aquí está el dato: ningún material tiene la densidad de vocabulario de un texto. Una película enseña solo con lo que dicen los personajes; un libro lo describe todo con palabras. Por eso los estudiantes que leen aprenden vocabulario mucho más rápido que los que memorizan listas. ¿Y si dudas? Mira a los políglotas: Kato Lomb, Steve Kaufmann, Luca Lampariello, todos aprendieron así. Leer no es tarea. Es el camino más rápido.

### comprehension — Contesta las preguntas

**Instructions:**

- Lee la pregunta y escribe tu respuesta *antes* de mirar la respuesta correcta.
- No busques la respuesta en el texto con el dedo. Recuérdala. El esfuerzo es el entrenamiento.
- Cuando reveles la respuesta, compárala con la tuya con calma. Entender por qué te equivocaste vale más que acertar.

**Why:**

> Ver la respuesta primero se siente productivo, pero no lo es. Tu cerebro aprende cuando intenta recordar, no cuando lee. Un estudio de 2006 sobre la práctica de recuperación lo confirmó: los estudiantes que se autoexaminan recuerdan mucho más, días después, que los que solo releen. Intentarlo y fallar es más útil que leerlo y creer que ya lo sabes.

### personal — Conecta la historia contigo

**Instructions:**

- Aquí no hay respuesta correcta. Las preguntas son sobre tu vida.
- Escribe en inglés, aunque te falten palabras. Usa el vocabulario de la historia si puedes.
- El Profe Kyle te da retroalimentación enfocada en una o dos cosas para mejorar. No es una calificación.

**Why (shown only in review/write mode, never classroom-live — preserve the existing conditional):**

> Responder preguntas sobre ti mismo te obliga a usar el inglés de verdad: hablar de tu trabajo, tu familia, tu vida. Y ahí aparece algo valioso: notas exactamente qué te falta decir. Ese momento de "¿cómo lo digo?" es donde se aprende. La retroalimentación del Profe te da una o dos prioridades, no una lista infinita de errores.

### dictation — Entrena tu oído

**Instructions:**

- Escucha la oración y escribe exactamente lo que oyes. Sin ver el texto.
- Puedes escucharla las veces que necesites. Va lento a propósito.
- Después compara lo que escribiste con la oración real. No es un examen de ortografía: es un diagnóstico de tu oído.

**Why:**

> La mayoría de los errores de escucha no son por falta de vocabulario. Son porque las palabras suenan diferente cuando se hablan rápido: se juntan, se comen, cambian. Este ejercicio te muestra exactamente dónde te falla el oído. Los investigadores lo llaman escucha de abajo hacia arriba, y es la base de entender inglés real, no inglés de libro.

### choral — Repite en voz alta

**Instructions:**

- Escucha la oración y repítela en voz alta, imitando el ritmo y la entonación.
- Diez repeticiones por ronda, cinco rondas. No pienses en la gramática. Solo escucha y repite.
- Si te equivocas, sigue. La boca aprende con repeticiones, no con perfección.

**Why:**

> Repetir en voz alta es como ir al gimnasio: tu boca necesita las repeticiones para que el sonido salga solo, sin pensar. Nadie aprendió a tocar guitarra leyendo sobre guitarras. Es incómodo al principio. Es automático a la ronda treinta. Eso es el objetivo.

### pronunciation — Grábate y escúchate

**Instructions:**

- Graba la oración con tu voz y compárala con la referencia.
- Escucha tu grabación sin rodeos. Te va a sonar raro. Todos suenan raro la primera vez.
- El objetivo no es sonar gringo. Es que la gente te entienda a la primera.

**Why:**

> No puedes corregir un sonido que no puedes escuchar. Por eso este ejercicio empieza con tus oídos, no con tu boca. Grabarte y escucharte es la herramienta más honesta que existe: tu oído descubre lo que tu boca hace.

(An academic citation was deliberately dropped from this card: no verified study exists in the vault for a specific "perception-first" trial. Do NOT invent one.)

## Implementation

1. **New copy module `src/lib/lesson-copy.ts`:** exports one typed map keyed by step id (`story | comprehension | personal | dictation | choral | pronunciation`), each entry `{ title: string; instructions: string[]; why: string }`. Note the story instructions use a bold lead ("La regla más importante:") on the final bullet — model the shape that fits the existing micro-explanation styling, or add a light `note?: string` field; prefer reusing existing tokens.
2. **Step instructions block:** the sticky top bar and the dot nav are UNTOUCHED. Inside the content area, at the top of each step panel, render: the step `{ title }` as a visible heading (e.g. "Lee la historia", "Entrena tu oído"), the instruction list directly underneath it, then the existing activity content below (play button, story text, inputs). Order per Kyle: title → instructions → activity. This is a NEW visible component (e.g. `StepInstructions` in `src/components/lesson/`), presentation-only, using existing DESIGN.md tokens. The story step currently has no visible title; the module's `title` field supplies it. Do not create new tokens; if an uncovered pattern is needed, stop and ask (the `.cursorrules` ask-gate governs). Document the component in DESIGN.md in the same commit.
3. **Why callouts:** replace every hard-coded `text="..."` / `microExplanation="..."` prop in `StorySteps.tsx`, `DictationPractice.tsx`, `ComprehensionQuestions.tsx`, `PersonalQuestions.tsx`, `ChoralPractice.tsx`, `PronunciationPractice.tsx` with the copy module's `why` field. Keep `MicroExplanation.tsx` behavior EXACTLY as is (one-time, localStorage-dismissed, per dismissKey). Preserve the classroom-live conditional for personal.
4. **Locked steps untouched:** the "Dictado, coral y pronunciación se abren el día de Pronunciación" hint stays.
5. **Out of scope (later slices):** the `/welcome` first-run route, teach cards in Drill Lab / missions, other lesson kinds.

## Verification

- `npx tsc --noEmit` + relevant tests green.
- Grep the copy module and all rendered strings: zero em dashes; every Spanish vowel-bearing word spot-checked for accents (automated check: any of `Sabias|ingles|oido|Traduccion|pronunciacion|calificacion|Ortografia|escuchate|Graba la oracion[^,]` etc. must return nothing).
- Open a story lesson: instructions visible under each step, callout shows once, dismisses, never returns (per dismissKey), classroom-live personal mode has no why card.
- Update the PRD Slice 8e row: replace "One or two sentences in Spanish" with "a short instruction list (what to do) plus a one-time 'why' paragraph, copy in `src/lib/lesson-copy.ts`"; note the copy is vault-sourced. Record the build commit hash in the PRD row.
