# Slice 79 — First-run welcome for classroom students

> Brainstormed with Kyle 2026-10-01. Decisions: welcome = separate route (`/welcome`, canonical URL, room to grow), but nothing ever forces a redirect; a client gate renders the card inline on first visit. Scope = classroom students only (teacher preview and teacher chrome skip it). Copy rules as Slice 78: tú register, accents mandatory, NO em dashes, hard-coded copy, no guilt framing (studying in free time is an invitation, never an obligation — Kyle's students already pay for live classes). If the PRD number 79 is taken, use the next free number and note it in the header.

## Copy (final, Kyle-approved)

> **Bienvenido a tu app de inglés.**
>
> Esta app acompaña tus clases del Confident Speaker Circle. No es tarea adicional: es el material de tu curso, en tu bolsillo.
>
> - **Apoyo para tu estudio.** Esta app existe para respaldar lo que hacemos en clase. Si quieres avanzar más rápido, úsala en tu tiempo libre. Si no, la app también te sirve.
> - **Todo se guarda solo.** Tus respuestas, tus palabras, tu progreso. Cierras y vuelves cuando quieras.
> - **No hay calificaciones.** Aquí se practica. Los errores son información, no castigo.
> - **Toca cualquier palabra.** Traducción y pronunciación al instante.
>
> ¿Listo? Tus clases te esperan.

Lead paragraph stays plain (no bold intro bullets); bullet leads are the bold part. Button label: **"Entendido, vamos"**. Store this copy in `src/lib/lesson-copy.ts` as a `WELCOME_COPY` export (same module as Slice 78; product copy, hard-coded).

## Implementation

1. **`/welcome` route (`src/app/welcome/page.tsx`):** renders the welcome card in the standard browsing shell (reuse existing page chrome; keep it minimal: title, paragraph, bullet list, one ActionButton "Entendido, vamos"). Server component + a small client button component. The button writes the seen-flag and `router.replace("/dashboard")`.
2. **Seen flag:** localStorage key `welcome-seen` = `"1"` (client-only, same pattern as the MicroExplanation storage prefix; wrap in try/catch, localStorage can be blocked). Deliberately NO schema, NO DB column, NO middleware. Flag lost = welcome shows again = harmless.
3. **Gate component (`src/components/WelcomeGate.tsx`, client):** props `{ children }` plus skip signals. Behavior on mount: if flag seen → render children normally. If unseen → render the welcome card INLINE (not a redirect, not an overlay covering the page) in place of children, with the button setting the flag and revealing children (or `router.replace` to strip a `?welcome=1` param if used in a page context; prefer in-place reveal — no navigation). If localStorage errors → treat as seen (fail-open; welcome is optional, never trap anyone).
4. **Where the gate lives (exactly two places):**
   - `src/app/dashboard/page.tsx` (Inicio) — wrap the main content in the gate. Skip condition: teacher preview (`preview` from `requireBrowsingStudent`) renders children directly, no gate.
   - Story lesson page: inside `StorySteps`, above the step panel, gated to `kind === "story"` AND not teacher AND not preview (`isTeacher` / `previewLevel` props already exist). Only the first lesson ever (the flag is global, not per story).
   - Do NOT add the gate to other lesson components (MusicLessonSteps, ExamSession, VideoSummary, presentation, writing) or teacher routes.
5. **Shallow, presentational, tokens:** reuse DESIGN.md tokens only; the card is a `rounded-card` surface with the same type scale as `StepInstructions` (`headline-md` title, `body-main` list). `lang="es"` on the card. No new tokens; ask-gate applies.
6. **Out of scope (later slices):** consumer tier onboarding (Slice 41 territory), PWA install prompt, per-kind lesson orientation (dialogue/song/movie-talk variants), exam "Antes de empezar" block.

## Verification

- `npx tsc --noEmit` + full `src/lib` test suite green.
- Grep: no em dashes and no accent-less Spanish in the new copy (`Sabias|ingles|oido|Traduccion|calificacion|Clases te esperan` must return nothing).
- Behavior probe: fresh localStorage → Inicio shows welcome inline, button reveals Inicio, flag persists (dismiss never returns). Same on a `kind=story` lesson page. Teacher preview (`preview`) and teacher chrome see NO welcome. Second visit: nothing.
- Update the PRD (new slice row + .cursorrules Current Phase line + DESIGN.md component entry) in the same commit; record the build commit hash in the PRD row.
