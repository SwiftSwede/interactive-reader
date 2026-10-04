# Slice 80 — Video summary (Traducción) step instructions

> Brainstormed with Kyle 2026-10-01. Reuses the Slice 78 pattern exactly: per-step instructions block in the content area under a visible step title, copy in the hard-coded `src/lib/lesson-copy.ts`. NO orientation block anywhere near the step nav (Kyle explicitly rejected it — sticky top bar and dot nav are never touched, same rule as Slice 78). NO why cards on this page: Kyle narrates the methodology live, so the page only orients. Copy rules as always: tú register, accents mandatory, NO em dashes, no guilt framing. If PRD number 80 is taken, use the next free number and note it in the header.

## Copy (final, Kyle-approved 2026-10-01)

Add to `src/lib/lesson-copy.ts` as `VIDEO_SUMMARY_COPY`, keyed by step id (`video | write | translate`), same `{ title, instructions }` shape (no `why`, no `note`):

**video — El Video**

- Mira el video con atención. Es la base de todo lo que sigue.
- Si quieres, anota unas palabras que te ayuden a recordar lo que viste. No es necesario apuntar todo.

**write — Tu Resumen**

- Escribe un resumen del video en inglés, con tus propias palabras.
- Escribe hasta que el tiempo termine. No tiene que ser perfecto.
- El Profe Kyle lee tu resumen para conocer tu inglés, y pensar en el video te deja listo para la traducción.

**translate — Traducción**

- Esta parte es colaborativa. Cuando el Profe Kyle pida una traducción, di tu versión en voz alta; después él escribe la traducción real.

Titles MUST match the existing `STEPS` labels in `VideoSummaryPlayer.tsx` ("El Video", "Tu Resumen", "Traducción") — derive the title from the step or keep the strings identical; one source of truth preferred.

## Implementation

1. **Copy module:** add the `VIDEO_SUMMARY_COPY` export to `src/lib/lesson-copy.ts` (extend the module types; the existing `LessonCopyEntry` shape may need an optional-field variant since these entries have no `why`/`note` — prefer a shared minimal type over a copy-paste type).
2. **Render:** inside `VideoSummaryPlayer.tsx`, at the top of each of the three step panels (`step === "video"`, `step === "write" && canOpenWrite`, `step === "translate" && canOpenTranslate`), render the existing `StepInstructions` component (`src/components/lesson/StepInstructions.tsx`) with the matching copy entry. It is a pure presentational component that takes `{ copy }` and renders title + disc list; no changes to it should be needed. Order per Kyle: title → instructions → activity (the YouTube embed stays where it is — for the `video` step the embed renders ABOVE the instructions block today; that is correct and stays: media first, then title + instructions, then the action button — do NOT move the embed below the text).
3. **Remove the now-redundant line:** the `{!isTeacher && (<p>Toma notas de lo que ves</p>)}` paragraph in the video panel is superseded by the new instructions (which carry the corrected, Kyle-approved notes policy: notes ARE allowed, a few words are enough). Delete it so the two instructions never disagree on screen.
4. **Teacher visibility:** instructions render for teacher AND students (same as Slice 78) — the teacher sees the same page the students do. No preview props exist on this component; do not add gating.
5. **Out of scope:** post-class review-mode wording variants, why cards on this page, an orientation strip (rejected), exam copy, kind variants for dialogue/song/movie-talk, Drill Lab teach cards.

## Verification

- `npx tsc --noEmit` + full `src/lib` test suite green.
- Grep the new copy: zero em dashes, zero accent-less Spanish (`Sabias|ingles |oido|Traduccion |calificacion |resumen en ingle[^s]|tom[a] notas de lo que ves` must return nothing — the last one confirms the old line is gone).
- Open a `kind=video_summary` lesson: each step shows its title + instructions above the activity; the "Toma notas" line is gone; the free-write step instructions appear alongside the synced timer; nothing renders in the sticky header or dot nav area.
- Update the PRD (new slice row), `.cursorrules` Current Phase line, and DESIGN.md `step_instructions` component entry (extend its scope note to "story steps + video summary steps") in the same commit; record the build commit hash in the PRD row.
