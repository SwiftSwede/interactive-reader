# Slice 84 — Conversation class onboarding (instructions + why card)

Extends the onboarding system (Slices 78–82b, 83) to the conversation page
(`src/components/ConversationStudent.tsx`, `/conversation?session=`). Single
page, no step system — one instructions block + one why card + the shared
ⓘ sheet.

## Page reality (grounded in the code)

- Single page: LessonHeader ("Conversación" + prompt title), theme line,
  round number + countdown, question list, teacher controls, recording banner.
- The prompt questions list already renders as a numbered list — leave it.
- No step nav, no panels. Nothing near the header.

## Placement

Inside `article`, directly under the theme line (`prompt.theme`), above the
teacher plan fieldset / round display:

1. one-liner (always)
2. whyShort card (once per student, MicroExplanation pattern, X-only)
3. ⓘ control → sheet

## Copy (verbatim — do not edit, reflow, or "fix" accents)

**One-liner (always):**

> Habla en inglés en parejas. Son las mismas preguntas en cada ronda, con una persona nueva.

**Why card (once, two lines):**

> Repetir lo mismo con una persona nueva es el método: tu inglés sale más rápido y más seguro en cada ronda. Es la técnica 4/3/2 del lingüista Paul Nation, con evidencia académica detrás.

**ⓘ sheet:**

> **¿Qué hago?**
> - Hay seis rondas en parejas. En cada ronda, uno pregunta y el otro responde.
> - En la primera mitad tu papel es uno; en la mitad del descanso, los roles cambian. Todos preguntan y todos responden.
> - Las preguntas son las mismas en las seis rondas. Tu pareja cambia cada ronda; tu inglés mejora cada ronda.
> - El Profe Kyle escucha todas las parejas y deja correcciones en el chat. Léelas: son material para tu siguiente ronda.
> - Si te falta una palabra, dilo de otra forma. Preguntar cómo se dice también cuenta.
>
> **¿Por qué?**
> Hablar mejor no viene de hablar de temas nuevos cada vez: viene de repetir. En la técnica 4/3/2, la ronda dos sale mejor que la ronda uno, y la tres mejor que la dos. Aquí nadie repite en seco: cada ronda es con una persona nueva, con las correcciones del Profe en el chat, y el descanso de la mitad para pensar qué mejorar. La confianza no viene de la suerte: viene de la segunda vuelta.

## Wiring

- Copy enters the shared copy module as a `conversation` entry (line,
  whyShort, instructions array, why paragraph) — one source, same fields as
  the other lesson types.
- The one-liner replaces nothing (the page has no existing instructions);
  theme line stays.
- Show in all modes (live, after class): the copy is true post-class too.
  Review mode already shows the same page with round history.
- Dismiss key: `conversation` (one-time across all conversation classes — the
  method never changes).

## Untouched / out of scope

- Teacher plan fieldset, round controls, countdown, question list,
  RecordingBanner, EndClassButton.
- Round-plan variants (6 rondas / 3×10 / sin rondas): the sheet says "seis
  rondas" — do not make copy dynamic per plan in this slice (v2 candidate if
  Kyle asks).
- Warm-up conversation (20 min) is not in the app; nothing to onboard.

## Copy rules (hard requirements)

- Spanish accents mandatory; em dashes banned (commas, semicolons, periods);
  tú register.
- Enter approved copy verbatim; no summarizing.
- whyShort never renders without the one-liner above it.

## Verification

- tsc clean, full test suite green, PRD + DESIGN.md synced, build hash
  recorded in PRD.
