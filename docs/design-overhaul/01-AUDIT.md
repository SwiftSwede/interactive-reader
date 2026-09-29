# Step 1 — Audit Current App State (Cursor: do this first)

**Purpose:** map what EXISTS before recommending anything. Every recommendation in `03-RECOMMENDATIONS.md` must reference an audit finding. No recommendations in this document.

Read `docs/design-overhaul/00-BRIEF.md` first, plus `DESIGN.md`, `.cursorrules`, and `docs/adr/` (especially ADR 011 — classroom vs consumer split).

For each pattern below, record: **What exists** (file paths/components), **What it looks like** (design tokens, layout, interaction), **What's missing** vs the Manus report patterns in the brief, **Verdict** (solid / needs work / absent).

## A. Story reader (the center of gravity)

1. Reading layout: typography, line height, max width, paragraph spacing, mobile behavior at 375px
2. Tap-any-word: interaction (tap vs long-press), bottom sheet vs other, contents (audio, IPA, translation, mark), state model (unseen→looked up→marked→revisited?)
3. Sentence audio: sync mechanism, highlight style (quiet underline vs karaoke), per-sentence replay, speed control
4. Word audio: per-word MP3s, what the tooltip shows
5. Comprehension checks: where, how many, score display, AI answers, level handling
6. Translation reveal: how Spanish support appears, learner-controlled?
7. IPA display: where, tappable → Bunny Stream video popup, font/stack
8. Sticky audio player / now-playing pattern — exists? persists on scroll?

## B. Navigation & app shell

9. Bottom nav vs top nav on mobile: tabs, labels, icons
10. Home screen: what a returning student sees — continue card? class context? shelf? any streak/score language?
11. Deep-link entry: what a WhatsApp link opens to; signup gate placement; time-to-first-value
12. Story index/browse: card design, level/context tags, finite vs infinite feel

## C. Sistema de 8 surfaces

13. Story, Dialogue, Music, MovieTalk, VideoSummaryTranslation, Conversation (4-4-4), Writing, GroupExam — which lesson-type pages exist, how consistent, which are still display-only companions
14. Class mirror/live session: teacher-driven sync state, what student page mirrors
15. Exam page: individual answers, live type-check, timer behavior, numbers not letters

## D. Teacher side

16. Dashboard existence & scope: courses, roster, attendance, word-lookup aggregation, student detail
17. Any evidence/reteaching view (probably absent — Analíticas is specced, not built)

## E. Visual system

18. Current DESIGN.md tokens vs Manus proposed tokens (Paper Light terracotta/moss vs graphite/teal): list both, note the delta explicitly — this is a Kyle decision, present neutrally
19. Typography stack, spacing scale, radius, shadows
20. Loading skeletons, empty states, error states — exist? quality?
21. Accessibility current state: focus rings, tap target sizes, contrast, reduced motion, lang attributes

## F. Engagement/pressure audit (Lighthouse check)

22. Scan all student-facing screens for: streaks, XP, scores-as-primary, countdowns, "behind"/overdue language, due dates, red failure states, completion checks, leaderboards, anything childish. List EVERY hit with a file path. This is the repulsion list.

## Output format

One section per pattern group, table rows per pattern. Flag anything where current state and the brief's constraints conflict. End with a "Top 10 gaps" ranked list (gap → affected surface → severity for the Trapped Professional-Creative persona).

## Findings

Audited 2026-09-27 against live code and `DESIGN.md`. Verdicts describe what exists versus the patterns named in `00-BRIEF.md`. They are not proposals. Paper Light versus the Manus graphite/teal theme is an open choice, recorded in E18, not treated as a defect.

### A. Story reader

| # | What exists | What it looks like | Missing vs the brief | Verdict |
|---|---|---|---|---|
| A1 Reading layout | `src/components/InteractiveStory.tsx`, `.text-story-body` in `src/app/globals.css`, content `max-w-2xl` (672px) | Lora 18px / 32px line height. 16px between paragraphs (`space-y-4`). Warm paper. One column. | Quiet sentence focus during audio. The type itself already reads as a book. | Solid |
| A2 Tap any word | `src/components/WordTooltip.tsx`. Tap pins a floating card. Click outside, or another word, closes it. | Spanish, IPA, part of speech, play, and "No entendí" appear together. Teacher gets Subrayar, Negrita, and Nota. | Not a bottom sheet. Translation is immediate, not a second reveal. The lookup underline (`word-seen`) lives only in component memory (`seenPositions` in `InteractiveStory.tsx`). It is gone on the next visit. No marked or revisited student state. | Needs work |
| A3 Sentence audio | Word timestamps plus a `requestAnimationFrame` loop in `InteractiveStory.tsx`. Class `.word-audio-current`. | The current word gets a yellow background (`rgb(254 240 138)` in `globals.css`). Transport is ±10s and 0.75x / 1x, not per sentence. | Quiet sentence or phrase highlight. The brief says karaoke motion should not compete with reading. Song karaoke is a separate step and is specified that way in `DESIGN.md`. | Needs work on stories. Song karaoke is intentional. |
| A4 Word audio | `word.audio_url` played from the tooltip | Small inline play control next to the IPA | Per-word audio exists. The card around it is A2. | Solid |
| A5 Comprehension | `src/components/ComprehensionQuestions.tsx`, one lesson step | All questions for that story on one step. "Ver respuesta" reveals the teacher answer. No score on this step. | The brief's short-check pattern is 1 to 3 questions. The app shows the full set. No score here, which matches the constraint. | Solid, with a count question for later |
| A6 Translation reveal | Tooltip shows Spanish on the first tap. Traducción is a separate lesson: Spanish in Lora, English in Roboto Flex, English fills in live. | The learner controls the tap. The translation is not behind a second tap. | English first, translation as an intentional second reveal. | Needs work |
| A7 IPA | `src/components/IpaText.tsx`, `src/components/SoundVideoModal.tsx`, Bunny embed | Monospace. Tappable once the tooltip is pinned. Opens a dialog with the sound video. | The sounds library on Herramientas is still the empty "Próximamente" state (`src/app/tools/page.tsx`). IPA inside the reader works. | Solid in the reader. Library absent. |
| A8 Sticky player | `src/components/StickyNowPlaying.tsx`, portaled to `document.body` | 64px bar above the lesson step nav: seek, ±10s, play, speed. Leaving via Inicio stops the audio. Tab bar and this bar never share a screen. | It does not survive navigation the way a mini player does. No title. Transport only. | Needs work |

### B. Navigation and shell

| # | What exists | What it looks like | Missing vs the brief | Verdict |
|---|---|---|---|---|
| B9 Bottom nav | `src/components/shell/BrowsingShell.tsx` | Inicio, Lecciones, Herramientas. 56px. Terracotta active dot. Lesson mode hides it and uses the glass step bar. | Need-state labels (Read / Listen / Repair / Pronounce / Class) are not in the shell. | Solid as a shell. Entry labels absent. |
| B10 Home | `src/app/dashboard/page.tsx`, `src/components/dashboard/ClassDayCard.tsx`, `src/components/dashboard/LessonCard.tsx` | Greeting, today's class, "Clases completadas: n de total" with a terracotta bar, then the month's class rows. | No continue-this-story card and no saved audio position. `/progress` has "Siguiente actividad," a suggestion, not a resume point. | Needs work |
| B11 Deep link | `loadSessionAccess` in `src/lib/sessions.ts`. A class link is `/lesson/[slug]?session=` or the typed lesson route. | Logged-out visitors redirect to `/login?next=...` before any story text. Later copy is clear ("Ese link no sirve," "Esta clase es nueva"). | Value before account. The brief says declining a signup never punishes. The current gate is a login wall. | Conflict |
| B12 Story index | `src/app/lessons/page.tsx`, `src/components/dashboard/LessonsList.tsx` | Same row cards as Inicio. Finite month groups. "Cargar más" is specified in `DESIGN.md`. | Cover-browse and level tags are not the visual. Rows are a class list, which fits the classroom product. | Solid for classroom. Not a catalog. |

### C. Sistema de 8

| # | What exists | What it looks like | Missing vs the brief | Verdict |
|---|---|---|---|---|
| C13 Lesson pages | Story, dialogue, movie talk, song, Traducción, writing, exam, presentation, conversation | Shared lesson header, paper tokens, glass step pills. Pronunciation and flex stay live-only (Zoom). Herramientas is empty. | Pages exist and share a shell. Each type has its own body, which `DESIGN.md` already specifies. | Solid |
| C14 Class mirror | Teacher step lock, `lesson_step_current`, student phones snap. Movie Talk character band. Music and YouTube follow the teacher during live class. | Student pages mirror the teacher. Students can move back. Forward stays locked. | Matches "class sync is teacher-driven." | Solid |
| C15 Exam | `src/components/ExamSession.tsx` | Each student types their own answers. Teacher types accepted answers and checks items. Timer counts to review, or 45 minutes for a makeup. Score step: "Tu puntaje," a fraction, and a whole percent. No letter grade. | The percent is the tension. ADR 011 calls the score practice math. The brief treats scores-as-primary as a repulsion cue. | Needs work on the score step. The answer model is solid. |

### D. Teacher side

| # | What exists | What it looks like | Missing vs the brief | Verdict |
|---|---|---|---|---|
| D16 Dashboard | `/teacher`: Este mes, Grupos, Estudiantes, Contenido. Desktop 3-column shell. | Attendance, recordings, per-student lookups on `src/app/teacher/classes/[id]/students/[studentId]/page.tsx`, writing submissions. | Roster and attendance are real. | Solid for operations |
| D17 Reteaching view | `src/app/teacher/analytics/page.tsx` | Empty state: "Próximamente: las palabras más consultadas." `src/lib/teacher/analytics.ts` already queries lookups, and the session page lists words looked up. | Class, then learner, then evidence, as a reteaching map. The data is stored. The view is not built. | Absent |

### E. Visual system

| # | What exists | Delta | Verdict |
|---|---|---|---|
| E18 Color | Paper `#faf6f0`, white cards, terracotta `#6f4627`, moss `#506354`, Lora + Roboto Flex. `DESIGN.md`: "No dark mode. Not yet." | Manus proposes graphite `#101213` / `#181B1D`, paper text `#F5F2EA`, teal `#8BE1D2`, brass `#F0C77D`. Same job: quiet, adult, warm text. Different canvas. | Decision, not a defect. Kyle chooses. |
| E19 Type, space, radius | 4px spacing scale. Radius 8 / 16 / 24. Pills only on step nav. Cards have a 1px line and no shadow. Sticky bars may have a light shadow. | Manus keeps a serif for reading. It does not replace this scale. | Solid |
| E20 States | Empty states exist on Inicio, Lecciones, Herramientas, and Analíticas, in Kyle's Spanish, with a Lucide icon. Errors say "Algo salió mal" on login, pronunciation, and personal questions. | `DESIGN.md` requires skeleton loaders. A search of `src/` found no skeleton component. | Empty and error: solid where built. Skeletons: absent. |
| E21 Accessibility | Many controls use `focus-visible` and 44px targets. `prefers-reduced-motion` is honored for karaoke and pulses. | `<html lang="en">` in `src/app/layout.tsx` while the chrome is Spanish. The sticky play control is specified at 36px in `DESIGN.md`, under the 44px floor. Word spans are exempt from 44px by `DESIGN.md`. | Needs work |
| E22 Motion and action feedback | DESIGN.md specifies 200ms fade + slide, no bounce. `StoryTextSheet` animates in. Word tooltip appears with no enter/exit choreography. | After tap: many primary actions (Comprobar, Entregar, Guardar, invite, lookups) do not show a disabled/loading state or a short "guardando" / "listo" line while the server works. The person cannot tell if the tap registered. | Needs work. Flagged by Kyle 2026-09-27; first audit pass under-weighted this. |

### F. Pressure scan

No streaks, XP, hearts, leagues, leaderboards, mascots, "behind," or "overdue" in student UI.

| Surface | What the student sees | File |
|---|---|---|
| Class day card | "Empieza en …" until join time | `src/components/dashboard/ClassDayCard.tsx` |
| Inicio progress card | "Clases completadas: n de total" plus a fill bar | `src/app/dashboard/page.tsx` |
| Lesson rows | Lock icon and "Próximamente" on empty slots. Check mark and "Completada." | `src/components/dashboard/LessonCard.tsx` |
| Exam score step | "Tu puntaje," fraction, and percent | `src/components/ExamSession.tsx` |
| Progress | "el último alrededor de …%" on dictation | `src/app/progress/page.tsx` |
| Dictation result | Red "Tu respuesta" box and green "Correcto" box. No percent on this screen. | `src/components/DictationPractice.tsx` |
| Choral | "Repeticiones: n/10" and "¡Práctica completa!" after 5 rounds. Hidden in live class. | `src/components/ChoralPractice.tsx` |
| Writing, exam, Traducción | Countdown clocks. Copy includes "Tienes N minutos" and "Quedan 5 minutos." | `src/components/WritingSession.tsx`, `src/components/lesson/LessonTimer.tsx` |
| Pronunciation errors | Red error background on failure | `src/components/PronunciationPractice.tsx` |
| Song blanks and exam checks | Moss check, X, strikethrough after submit | `src/components/music/SongBlanksWorksheet.tsx`, exam fill-ins |
| Lesson end | "Listo! Has practicado todos los ejercicios." | `src/components/StorySteps.tsx` |
| Profile | Subscription "Activa" or "Expirada" | `DESIGN.md` Perfil section |

Class timers are the live class, not a game. They still match the brief's countdown ban on the letter of it, so they are listed.

### Conflicts with the brief

- A class link does not show the story until the person is logged in (`src/lib/sessions.ts`).
- Story playback highlights one word in yellow. The brief treats karaoke motion as something that fights reading.
- Student-facing percents exist on the exam score step and on `/progress`, next to a product that is not supposed to feel like a gradebook.

### Top 10 gaps

| Rank | Gap | Surface | Severity for this persona |
|---|---|---|---|
| 1 | Word lookup is a floating tooltip. Spanish is immediate. The underline is forgotten when they leave. | Story, dialogue, lyrics | High. This is the method. |
| 2 | Audio highlight is a yellow word, not a quiet sentence. | Story reader | High. It makes reading feel like karaoke. |
| 3 | Home is a month checklist. Nothing resumes the sentence they left. | Inicio | High. The phone is for the margins of the day. |
| 4 | Login wall before any lesson text. | Class link | High. Conflicts with value before signup. |
| 5 | Abrupt sheet/tooltip motion; buttons often have no loading or in-flight copy | Word help, Comprobar, Entregar, other primary actions | High. The tap must feel received. |
| 6 | Lookups are stored. The reteaching screen is a placeholder. | `/teacher/analytics` | High for the teacher between classes. Not student-facing. |
| 7 | Dictation shows "your text" and "correct text" in red and green. Progress still prints a percent. | Dictado, `/progress` | Medium. Repair should feel like listening, not a grade. |
| 8 | Word underline does not persist (and has no student-clear path). | Story reader | Medium. |
| 9 | Skeleton loaders are specified and not built. | Any slow fetch | Low. Empty and error states exist. |
| 10 | Percents, the class-start countdown, and the choral counter sit in an otherwise calm UI. | Inicio, exam, progress, choral | Medium. No streaks. These are the remaining game-adjacent cues. |

Manus "need-state" labels (Read / Listen / Repair / Pronounce / Class) are **not** a Kyle gap. They came from the competitive report via `00-BRIEF.md`. Do not treat their absence as a product miss.

Paper Light is decided (keep). Graphite/teal is not an open theme question.
