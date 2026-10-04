---
# Machine-readable token summary. Human rules below remain the full spec; this front matter
# is the fast path for agents. If any value changes, update BOTH this block and the tables below.
title: Design System
theme: Paper Light
dark_mode: false
reading_background: warm off-white, never pure white
colors:
  surfaces:
    paper: "#faf6f0"            # main background everywhere
    paper-line: "#d5c3b8"       # borders, dividers, 1px card outlines
    surface: "#ffffff"          # cards, sheets, modals (lifted off paper)
    surface-hover: "#f2ede4"    # pressed/active surfaces
  text:
    text-primary: "#2d2a26"     # story text, headings
    text-secondary: "#51443c"   # labels, metadata
    text-muted: "#76685f"       # timestamps, hints. 4.98:1 on paper, 4.60:1 on audio-bg
    text-accent: "#6f4627"      # links, interactive text (terracotta)
    text-accent-dark: "#543013" # pressed accent
  accents:
    accent: "#6f4627"           # terracotta: primary buttons, active progress, audio fill
    accent-hover: "#543013"
    accent-soft: "#ffdcc5"      # tooltip/highlight backgrounds
    accent-softer: "#fff8f3"
    secondary-accent: "#506354" # moss: completion indicators only
    secondary-accent-soft: "#d0e5d2"
  feedback:
    success: "#506354"          # moss (same family as secondary-accent)
    success-bg: "#d0e5d2"
    error: "#ba1a1a"            # clay red, never bright
    error-bg: "#ffdad6"
    warning: "#644c23"
    warning-bg: "#f5e6c4"
accent_roles:
  accent: "primary actions, focus, active progress, links. NOT a status color, NOT a success color"
  secondary-accent: "completion indicators, secondary highlights. NOT the primary action color"
  success_error: "outcomes only. Never used for learner identity, never color-alone"
typography:
  families:
    reading_and_headlines: Lora        # serif
    ui_labels: Roboto Flex             # sans
    ipa: system monospace stack only
  type_scale:
    headline-lg: { font: Lora, size: 24px, weight: 700, line: 32px }
    headline-md: { font: Lora, size: 18px, weight: 600, line: 24px }
    story-body: { font: Lora, size: 18px, weight: 400, line: 32px }
    body-main: { font: Lora, size: 16px, weight: 400, line: 28px }
    nav-ui: { font: Roboto Flex, size: 16px, weight: 500, line: 24px }
    label-md: { font: Roboto Flex, size: 14px, weight: 600, line: 20px }
    label-sm: { font: Roboto Flex, size: 12px, weight: 500, line: 16px }
  loading: self-hosted next/font, font-display swap, specified weights only
shape:
  radius:
    sm: 8px        # badges, tags, chips
    md: 16px       # cards, buttons, inputs, audio player
    lg: 24px       # modals, bottom sheets, large cards
    full: 9999px   # step-nav pills and circular elements ONLY
  elevation: tonal layering + 1px borders, no card shadows; subtle shadow on sticky elements only
spacing:
  base: 4px
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
touch_targets:
  minimum: 44px
  comfortable: 48px # primary actions
  exemption: inline word spans in story text
layout:
  model: one layout that breathes; mobile-first, 672px max content column on desktop
  floor: 375px
  breakpoint_tablet: 600px
  breakpoint_desktop: 1024px
  teacher_exception: /teacher/* is desktop-first 3-column; never applies to student routes
components:
  buttons: [primary, secondary, ghost, step-nav-pill, ActionButton]
  teacher_observation_chip: "8px radius (rounded-small), surface-hover fill, 1px paper-line border, Lucide X in a 44px hit area. Not a pill."
  month_start_calendar: "Nuevo mes, Patrón step, under the weekday chips. Monday-first month grid. Tappable days are the chosen weekdays, plus the previous month's last three days when they match. Class days use accent fill. A closing class in the next month's first two weeks stays filled and is not a start day."
  teacher_observation_ficha: "Student detail Observación uses three family fields (Errores comunes, Sonidos, Gramática) in one row at 1024px+, stacked below. Notas de clase keeps one Etiqueta field."
  mission_card: "Inicio, under Seguir (or under the join hero). White, 1px paper-line, 16px radius, px-4 py-3. Title = tag display_name; one framing line; one primary Practicar; quiet text 'más tarde' (label-sm, text-muted, no border/fill, 44px). Absent when no unfinished intro, snoozed to next local midnight, or preview."
  review_card: "Inicio, under the intro mission if any. Smaller invite: title Repaso, one line 'Hay ejercicios esperando.', one Practicar to /tools/practica?repaso=1. No más tarde. Absent when today's review pile is empty or preview."
  drill_lab: "Herramientas entry card (24px radius, counts only: 'Tu colección: N') + /tools/practica one-item-at-a-time. Intro sitting: teach + up to 5 unseen. Review: mixed, cap 5 per category. Typed input when there are no choices. MCQ first round is the choices alone (no second field). Primary actions sit on the right. Feedback is one line; miss shows 'Era: …' in text-secondary."
  drill_lab: "Herramientas entry card (24px radius, counts only: 'Tu colección: N') + /tools/practica one-item-at-a-time session. Typed input when there are no choices. MCQ first round is the choices alone (no second field). Primary actions sit on the right. Feedback is one line; miss shows 'Era: …' in text-secondary."
  drill_teach_card: "Lead in story-body serif with inline strong/em. Example groups: own lines, italic serif story-body, 16px indent, 1px paper-line left rule, 12px between groups. Closing: body-main text-muted, 24px above. Siguiente right-aligned."
  quiet_text_action: "Text-only secondary action (label-sm, text-muted, 44px hit area). Used for dismissals like 'más tarde'. Not button-shaped."
  story_sentence_ref: "Every 5th sentence in kind=story running text. First child of .sentence-unit: label-sm, text-muted, tabular-nums, 4px after the digits. pointer-events none, aria-hidden. Digits only, no gutter, no circle, no accent. Song bios off. Dialogue / Movie Talk / song unmarked."
  step_instructions: "kind=story only (dialogue shares StorySteps but omits this block and the story why card). Content-column header: step title headline-md, then a disc list body-main text-secondary (8px item gap, 20px indent). Optional last item with strong lead (La regla más importante) and em for *marked* words. 16px below the block. Copy from src/lib/lesson-copy.ts. Sticky header and dot nav unchanged."
  story_text_selection: "Native selection inside .story-running-text uses the same quiet wash as sentence audio: accent-soft mixed 55% with paper, text-primary. No new color. Spaces live in .word-gap so the wash is one strip, not per-word boxes."
  icons: Lucide React only, never emojis
  lesson_card: "Inicio and Lecciones row. Equal height via one reserved 16px muted line under the status. Song uses the Music icon. Live-only with a recording says Grabación disponible and does not link out."
  browsing_bottom_pad: "Content clears the tab bar: 72px on mobile (56px bar + 16px gap), 88px on desktop (56px bar + 16px float + 16px gap), plus the safe area."
  navigation: browsing mode (bottom tabs) vs lesson mode (full-screen, step nav); never coexist
---

# Design System

> This is the source of truth for all visual decisions in the app.
> Every component must use these tokens. Do not invent new colors, spacing, or sizing.
> If a value is not defined here, **do not invent it**: ask Kyle first. Approved additions and
> changes are written here first, then used. Unapproved values in code are drift.

## Theme: Paper Light

The app uses a warm "paper" light theme, inspired by Kindle's Sepia mode and the feel of a premium educational journal. No dark mode yet. No pure white backgrounds for reading areas.

The personality is grounded, intellectual, and tactile. A trusted mentor, not a gamified app. Minimalist with a tactile twist: organic colors, subtle structural lines, a warm low-strain reading environment.

## Color Tokens

### Backgrounds
| Token | Value | Usage |
|---|---|---|
| `--paper` | `#faf6f0` | Main background everywhere. Never pure white for reading areas. |
| `--paper-header` | `rgba(250, 246, 240, 0.95)` | Sticky header background (with backdrop blur) |
| `--paper-line` | `#d5c3b8` | Borders, dividers, 1px outlines on cards (notebook ruling) |
| `--surface` | `#ffffff` | Cards, bottom sheets, modals (white lifted off paper) |
| `--surface-hover` | `#f2ede4` | Hover/active state for surface elements (paper pressed) |
| `--audio-bg` | `#f2ede4` | Audio player background (warm tint to distinguish from text) |
| `--audio-border` | `#d5c3b8` | Audio player border |

### Text
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#2d2a26` | Story text, headings (dark warm neutral, not pure black) |
| `--text-secondary` | `#51443c` | Labels, metadata, secondary content |
| `--text-muted` | `#76685f` | Timestamps, hints, placeholders. Dark enough for 4.5:1 on paper and on the audio bar |
| `--text-accent` | `#6f4627` | Links, interactive text, audio controls (terracotta) |
| `--text-accent-dark` | `#543013` | Pressed/active accent state (deep terracotta) |

### Brand / Accent
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#6f4627` | Primary buttons, active progress dots, audio progress fill (terracotta) |
| `--accent-hover` | `#543013` | Hover state for accent elements (deep terracotta) |
| `--accent-soft` | `#ffdcc5` | Accent backgrounds: tooltips, highlights (light terracotta) |
| `--accent-softer` | `#fff8f3` | Very light accent backgrounds |
| `--secondary-accent` | `#506354` | Completion indicators, secondary highlights (moss green) |
| `--secondary-accent-soft` | `#d0e5d2` | Light moss backgrounds |
| `--paper-dot` | `#c4a574` | Inactive progress dots (warm gold) |
| `--paper-dot-done` | `#8b7355` | Completed progress dots (darker earthy tone) |

### Feedback Colors
| Token | Value | Usage |
|---|---|---|
| `--success` | `#506354` | Correct answers, "done" states (moss green, earthy) |
| `--success-bg` | `#d0e5d2` | Success backgrounds (light moss) |
| `--error` | `#ba1a1a` | Incorrect answers, errors (clay red, not bright) |
| `--error-bg` | `#ffdad6` | Error backgrounds |
| `--warning` | `#644c23` | Warnings (earthy amber/ochre) |
| `--warning-bg` | `#f5e6c4` | Warning / "moved word" highlight backgrounds |

## Typography

### Font Families
- **Headlines and story text:** Lora (serif, literary, "printed book" quality)
- **UI labels, navigation, metadata:** Roboto Flex (structured, precise, functional)
- **Monospace (IPA):** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

Two font families for the UI (Lora + Roboto Flex). Monospace is a system fallback for IPA only.

### Font Performance
Self-host both fonts using `next/font` with `font-display: swap` to prevent flash of unstyled text. Load only the weights specified below. The target audience is on phones in Latin America, arriving from WhatsApp links, potentially on slow connections. Do not load additional font weights.

### Type Scale
| Token | Font | Size | Weight | Line height | Usage |
|---|---|---|---|---|---|
| `headline-lg` | Lora | 24px | 700 | 32px | Story title, one per screen |
| `headline-md` | Lora | 18px | 600 | 24px | Section headings, step titles |
| `story-body` | Lora | 18px | 400 | 32px | Story text (generous size + line height for learner comprehension) |
| `story-english` | Roboto Flex | 18px | 400 | 32px | English under Spanish in Traducción. Same size as story-body, sans so the two languages do not blend. |
| `body-main` | Lora | 16px | 400 | 28px | General body text, callouts |
| `nav-ui` | Roboto Flex | 16px | 500 | 24px | Navigation labels, button text |
| `label-md` | Roboto Flex | 14px | 600 | 20px | Section labels, button labels |
| `label-sm` | Roboto Flex | 12px | 500 | 16px | Metadata, captions, timestamps |

### Line Height Rules
- Story text (`story-body`): 32px line height on 18px text (1.77 ratio for reading comfort)
- UI text: 1.5 ratio
- Headings: 1.25 ratio

## Spacing Scale

Base unit: 4px. Use these values only. No arbitrary values.

| Token | Value |
|---|---|
| `base` | 4px |
| `xs` | 8px |
| `sm` | 12px |
| `md` | 16px |
| `lg` | 20px |
| `xl` | 24px |
| `2xl` | 32px |
| `3xl` | 40px |
| `4xl` | 48px |
| `5xl` | 64px |

### Grouping (proximity)

Space is how the layout says what belongs together. Titles are not required when two control groups are already obvious (kind vs level, date vs time). The gap has to say it.

Pick three steps on the scale, each one clearly larger than the last. Do not use the same gap for "inside this group" and "the next block on the page."

| Relationship | Default step | Meaning |
|---|---|---|
| Inside a group | `xs` 8px (sometimes `sm` 12px) | Sibling chips, buttons, or fields of the same control |
| Between sibling groups | `lg` 20px or `xl` 24px | Related, but not the same row (kind filters then level filters) |
| Before the next section | `2xl` 32px or `3xl` 40px | A new block (filters then the list, heading then a card stack) |

**Do:** keep in-group tighter than between-group, and between-group tighter than the section break. If you enlarge the middle gap, enlarge the section break too, so the ladder still reads.

**Don't:** stack two unlabeled chip rows with only `sm` (12px) between them. That looks like one wrapping set. Don't skip to `2xl` between sibling groups if the following section also uses `2xl`. Don't invent a fourth gap size off the scale.

Page layouts below may pin exact values. When they do, those win. When they don't, use this ladder.

## Sizing

### Touch Targets
- **Minimum:** 44 x 44px for all interactive elements (buttons, dots, icons)
- **Comfortable:** 48 x 48px for primary actions (play/pause, submit)
- Word spans in story text are exempt (they are text, not buttons)
- All touch targets must have adequate visual spacing around them to prevent accidental taps

### Border Radius
| Token | Value | Usage |
|---|---|---|
| `sm` | 8px | Small elements: badges, tags, chips |
| `md` | 16px | Cards, buttons, inputs, audio player containers |
| `lg` | 24px | Modals, bottom sheets, large content cards |
| `full` | 9999px | Step navigation buttons (pill-shaped) and circular elements (play button, progress dots) |

**Pill vs. Rounded Rectangle rule:**
- **Pill (9999px):** Step navigation buttons ONLY. The bottom arrows in the lesson flow ("← El cuento", "Comprensión →"). Nothing else.
- **Rounded rectangle (16px):** Every other button. Task actions: submit, reveal, record, retry, play.
- **8px:** Small elements only: badges, tags, chips.
- Do not mix shapes within the same functional category. All task buttons are 16px. All step nav buttons are pills.

### Elevation
Depth is conveyed through **tonal layering** and **low-contrast outlines**, not shadows. The "flat paper" metaphor.

- **Level 0 (Base):** The paper background (`#faf6f0`).
- **Level 1 (Cards):** White (`#ffffff`) surfaces for cards and input areas. No box-shadow. Edges defined by 1px `--paper-line` border.
- **Interaction:** On press or active state, shift background to `--surface-hover` (`#f2ede4`). No shadow, no vertical displacement. Mimics paper being pressed.
- **Sticky elements only** (sticky audio player, sticky header, sticky step-nav glass bar): may use a subtle shadow (`0 4px 12px rgba(0,0,0,0.06)`) to separate from scrolling content. This is the only exception to the no-shadow rule.

## Layout

### Core Principle: One Layout, Not Two

The app is a mobile app that breathes on desktop. There is no separate desktop layout. The same mobile layout is centered on wider screens with a constrained content width. Think Instagram Web or WhatsApp Web, not a traditional multi-column website. **One scoped exception:** the teacher dashboard (`/teacher/*`) is desktop-first 3-column — see the "Teacher Dashboard" section. That exception never applies to student-facing routes.

This is deliberate:
- The audience is mobile-first. Desktop users are teachers reviewing or the occasional student on a laptop.
- Story text at 1440px width is unreadable (line length too long). The 672px column constraint is a readability requirement, not a style choice.
- One layout means half the bugs, half the testing, and one set of rules for the coding agent.

### Breakpoints
- Mobile: < 600px (primary target, 375px)
- Tablet: 600px - 1024px
- Desktop: > 1024px

### Content Width
- All content (story, practice, dashboard, tools): max-width 672px (`max-w-2xl`), centered with `mx-auto`
- Story text optimal line length: 65-75 characters (the 672px constraint achieves this at 18px font)
- Exception: the sounds grid expands wider (see Desktop Adaptations below)
- Horizontal padding: 20px (mobile/tablet), 24px (desktop)

### Desktop Adaptations

On screens wider than 1024px, the layout does NOT change structurally. The same mobile layout is centered. The following adjustments add breathing room without changing the architecture:

**Tab bar (desktop):**
- Still at the bottom of the screen, but constrained and centered: max-width 480px, rounded corners (24px radius), 16px margin from bottom and sides. Looks like a floating pill, not a full-width bar.
- Same 3 tabs, same icons, same labels.
- Page content clears the pill: 88px bottom padding (56px bar + 16px float + 16px gap) plus the safe area, so the last card is not covered.
- This is the only element that changes shape on desktop. Everything else just gets more side margin.

**Header (desktop):**
- Same 56px height, same layout, same content.
- Constrained to the 672px content width. The header does not stretch full-width on desktop. It matches the content column below it.
- The paper-header background fills the full width behind it (so the top of the screen isn't a different color), but the actual header content (wordmark, icons, lesson type, lesson name) is constrained to 672px centered.

**Sticky audio player (desktop):**
- Centered pill, 480px max-width, rounded corners (24px), 16px margin from the glass step-nav (or from the screen bottom when the page has no `.step-nav`). Same as mobile content but visually distinct as a floating element.
- Already specified in the audio player section.

**Sounds grid (desktop):**
- The ONLY content area that expands wider than 672px on desktop.
- Mobile: 2 columns. Tablet: 3 columns. Desktop: 4 columns.
- Grid max-width: 1140px on desktop (wider than the 672px content column, because a grid of small sound cards benefits from more columns).
- Each sound card stays the same size. More cards per row, not bigger cards.

**Dashboard (desktop):**
- Content stays in the 672px centered column. The greeting, progress card, lesson list, and practice summary do NOT go multi-column.
- Rationale: a single-column dashboard reads top-to-bottom like a status report. A multi-column dashboard invites scanning, which is the wrong mental mode for a progress page.

**Lesson pages (desktop):**
- All lesson content stays in the 672px centered column. Stories, comprehension questions, dictation, writing, exams.
- The progress dots, step nav arrows, and all lesson-specific navigation stay constrained to the content width.
- No sidebars, no secondary panels, no split views. The lesson is a focused single-column experience on every screen size.

**Bottom sheet (desktop):**
- The "Ver el texto" bottom sheet still slides up from the bottom on desktop.
- Max-width: 672px, centered horizontally.
- Same 75vh max height. Same drag handle.
- Alternatively on desktop: could appear as a centered modal (24px radius, elevated). Either pattern is acceptable. Pick the bottom sheet for consistency with mobile.

### What NOT to do on desktop (student app)
- No sidebar navigation in the student app. The 3-tab bar is the navigation. Do not add a left sidebar on desktop. **Exception:** the teacher dashboard (`/teacher/*`) has its own persistent left sidebar — see "Teacher Dashboard" below. The teacher exception NEVER applies to student-facing routes.
- No multi-column dashboard. The dashboard is a single column.
- No full-width header content. Header content is constrained to 672px.
- No split-view lessons. No secondary panel showing the story text alongside the questions. The bottom sheet is the cross-reference mechanism on all screen sizes.
- No wider story text column. 672px is the max for readability. Do not let stories stretch wider on desktop.

## Teacher Dashboard (`/teacher/*`)

**Deliberate exception to "One Layout, Not Two."** The student app is mobile-first single-column. The teacher dashboard is desktop-first 3-column. Kyle uses it at his desktop, often mid-Zoom. The two rules never mix: teacher layout patterns must not leak into student routes, and student single-column rules must not be applied to `/teacher/*`.

### Shell (all `/teacher/*` pages)

Three columns, full viewport height, no bottom tab bar (the student 3-tab bar does NOT render on teacher routes):

- **Left rail — fixed 240px.** Persistent nav, identical on every teacher page. White surface, 1px `--paper-line` border on the right edge. Items top to bottom: *Este mes* (default, `/teacher`), *Grupos* (all courses incl. archived), *Estudiantes* (global roster/search), *Analíticas* (group histórico: lookups, errors, sounds), *Contenido* (`/teacher/content`, catalog editor). Rail items are square on the left (flush to the rail) and `rounded-card` on the right. Active item: `--surface-hover` background plus a 3px terracotta left border on that square edge, never a separate unclipped bar against the curve. Lucide icons (`home`, `users`, `search`, `bar-chart-3`, `book-open`). Rail bottom: teacher name/email + "Ver app como estudiante" link. UI language: Spanish.
- **Center — fluid, min-width 0.** The main view for the current route. Horizontal padding 24px. Content max-width 960px (NOT 672px — tables, grids, and multi-card rows benefit from width; the 672px rule is a story-readability rule and stories never render here). **Exception:** the writing correction screen (`/teacher/classes/.../submissions/...`) is prose. Original text, corrected textarea, and student preview sit in the same 672px (`max-w-2xl`) reading column as student writing.
- **Right context panel — 360px, collapsible.** Details for the item selected in the center column (e.g., selected class → attendance grid, recording URL, session time, "Ver como estudiante"). White surface, 1px `--paper-line` border on the left edge. On screens < 1280px the right panel collapses into a slide-over sheet triggered from the center selection. The shell degrades to 2 columns (rail + center) below 1024px; the rail collapses to an icon-only 64px strip. Mobile (< 600px): rail becomes a top bar with a menu button opening a full-screen nav sheet. Teacher pages are usable but not optimized below 1024px.

### Visual language

Same Paper Light theme, same tokens, same type scale as the student app (Lora headlines, Roboto Flex UI labels). Same tonal elevation: white cards on cream paper, 1px `--paper-line` borders, no shadows except sticky elements. Buttons: rounded-rectangle 16px (the pill shape stays reserved for lesson step nav). Teacher observation chips (Notas de clase and the student page) use the 8px tag radius: `surface-hover` fill, 1px `--paper-line` border, and a Lucide X inside a 44px hit area. On the student Ficha page, Observación is three labeled fields in one desktop row (same input chrome as other teacher forms), not one fused Etiqueta. Touch targets 44px still apply — Kyle clicks fast mid-class. Teacher create/delete confirms (Nuevo mes, Nueva clase, Borrar mes) are centered `<dialog>` lightboxes (`rounded-sheet`, dimmed backdrop), not inline cards that push the page down.

### Key screens

- **Este mes (default):** current calendar month, plus unarchived future months so generating next month early does not empty the board. One card per group (course): group name, optional theme line (omit if empty), level label, day/time pattern, readiness summary ("1/8 clases listas"), next class with countdown. If a group has a class today (join window from T-10 through session end, or countdown earlier that day), a class-day card (same countdown / join / done phases as student Inicio) shows **Abrir la clase** (teacher session URL) and **Entrar a Zoom** when `zoom_url` is set. Same card in the right panel when that group is selected, on Grupos, and on the group page. Clicking a group expands/drills into its 8-class strip. If no unarchived current or future course exists: empty state "Próximo mes en preparación" with a **Nuevo mes** button that opens the Slice 60 wizard (Nivel → Mes → Patrón → Nombre + optional Tema → Generar). On Patrón, under the weekday chips, a Monday-first month grid lets Kyle tap the first class. Chosen weekdays stay tappable (including the previous month's last three days when they match). The eight class days fill in terracotta from that start. A closing class can land in the next month's first two weeks and still belongs to this month.
- **8-class strip:** the month's 8 sessions as a vertical list, one row per class: class number, type label (Historia, Pronunciación, Por elegir, Conversación, Diálogo, Música, Escritura, Examen, or the resolved Class 3 type), date/time, content status (**Contenido listo** / **Sin contenido** / **Por elegir** for unresolved flex), recording status (URL attached / empty). Empty typed rows get **Elegir contenido**. Flex rows get **Por elegir** (resolve type + content). Selecting a row populates the right context panel.
- **Grupos:** all courses, current first, archived below under "Meses anteriores". If a group has class today, the same class-day card as Este mes sits above the list. Each row shows theme when set. Archived months are fully browsable read-only, EXCEPT the theme field, recording URLs, and attendance stay editable (recordings are pasted day-after-class; attendance is often fixed late; themes are often named late). Inside a group, the monthly Zoom field is an input until saved, then a terracotta text hyperlink (underline on hover) with an X to clear it and paste another. It must not look like an input or a ghost button. Estudiantes is a card grid (1 col mobile, 2 tablet, 3 desktop). Not a full-width stacked list. Four columns is too tight for names plus "Mover a Pre-intermedio". The global Estudiantes tab stays a searchable list.
- **Estudiantes:** invite form first, then searchable global roster across groups. Student card: name, email, current group, attendance history, writing submissions with WPM trend, "cambiar de nivel" action (existing roster-move behavior). Course student detail (`/teacher/classes/[id]/students/[studentId]`): breadcrumb + name, Observación (tag form), **Ficha** (five stacked blocks, always present), then the per-session list. Ficha blocks: Banderas activas, Errores frecuentes, Palabras que no entendió (No entendí rollup, merged by word), Sonidos débiles (`.ipa-text` monospace, not tappable, no scores), Tus observaciones. Empty copy is muted `text-sm` paragraphs. No new tokens. No percents or trends in Ficha.
- **Analíticas:** Histórico del grupo. Course link-tabs (`?course=`, default = newest session). Three count-only blocks (no percents, no averages): **Palabras más consultadas** (`word_lookups`, all-time for that roster, palabra / estudiantes / veces), **Errores frecuentes** (sticky error flags merged with `check_answer_error` events, display name / estudiantes / señales), **Sonidos débiles** (sticky phonetic flags, IPA + name / estudiantes). List chrome is the session ordered-list card (`rounded-card`, `paper-line` divide). Sound rows with ≥3 students use `surface-hover` plus the label **candidato para banco de sonidos**. Empty copy is muted `text-sm`. Attendance rates and engagement scores stay out (institute-admin territory).
- **Contenido (`/teacher/content`):** catalog list with kind/level filters. No labels on the chip rows. Gaps follow Grouping (proximity): 8px inside a row, 20px between kind and level, 40px before the list block. Sort lives on the right, 12px above the list (Ordenar: Recientes, Nombre, Tipo, Nivel). Not a column-header table. Create buttons for writing, exam, presentation, conversation (minimal form, then the Slice 55 editor). Stories are not created here (import pipeline). Trash on each row for catalog admins (`CATALOG_ADMIN_EMAILS`): blocked if any `course_sessions` row still references it, including archived months; confirm lists non-zero children. The delete cell is a full-height strip (no inset rounded chip). Title hover is `--surface-hover`; delete hover fills that strip with `--accent` and a white icon (`--surface`). Nueva clase for writing/exam/conversation: Nueva lección (compose) or Usar una anterior (copy, then assign). Presentation still picks the existing row. Exam editor: paste English-only vocab, Task 1 `(español)` parentheses, bare Task 2/3 lines. Answers optional at create. Collapsible **Respuestas (después de clase)** plus **Copiar respuestas de la clase**. Live preview shows the first 3 student items per task.

### Attendance (interaction rules)

- Binary: asistió / no asistió. Plus an "auto" marker on rows pre-filled from session-link clicks during the 90-min window. Manual override after class and on Zoom-only classes. During a live app class, a session-link click still marks attended.
- Two surfaces, same data: (1) class page Estudiantes list, each row a 44px toggle plus the existing opened/on-time line; (2) group-page right panel when a class is selected in the 8-class strip. Do not show both at once (no panel copy on the class page).
- Auto-save on every tap. No submit button, no unsaved state. Mid-Zoom: any extra friction is a bug.
- Recording URL uses the same chrome as the monthly Zoom field: paste + Guardar, then terracotta hyperlink + X. YouTube only.

## Component Patterns

### Buttons
Three button variants plus the step navigation pill.

**Primary (filled):**
- Background: `--accent` (terracotta #6f4627)
- Text: white
- Padding: 12px 20px
- Radius: `md` (16px)
- Hover: `--accent-hover`
- Font: `label-md` (Roboto Flex, 14px, 600)
- Min height: 44px

**Secondary (outlined):**
- Background: transparent
- Border: 1px solid `--paper-line`
- Text: `--text-primary`
- Same sizing as primary
- Radius: `md` (16px)

**Text / Icon (ghost):**
- Background: transparent
- Text: `--text-accent`
- Radius: `md` (16px), same as primary/secondary. Hover fill is never a sharp rectangle.
- Padding: icon-only is a 44×44 hit area with the icon centered. Text ghosts use 12px horizontal padding (`px-3`) so the hover fill is not flush to the glyphs.
- Min size: 44x44px touch target
- Hover: subtle background (`--accent-soft`)
- Active: background shift to `--surface-hover`

**Step Navigation (pill):**
- Background: `--surface` (white) with 1px `--paper-line` border, OR `--accent` for the primary next-step action
- Text: `--text-primary` (secondary) or white (primary)
- Radius: `full` (9999px)
- Padding: 12px 24px
- Min height: 44px
- Contains: chevron icon + step label (e.g., "Comprensión →")
- Used ONLY for the bottom navigation arrows in the step flow

**In-flight primary (`ActionButton`):**
Server-hitting primaries stay the **same 44px control**. On tap: `disabled`, `aria-busy`, label becomes the in-flight verb. No spinner-only void. No second toast system. `prefers-reduced-motion`: no extra animation on the button.

| Idle | In flight | Brief success (when the view stays) |
|---|---|---|
| Guardar | Guardando... | Guardado |
| Entregar | Entregando... | Entregado |
| Enviar / Mándame el código | Enviando... / Mandando... | (next view) |
| Comprobar | Comprobando... | (inline result) |
| Revisar pronunciación | Revisando... | (inline result) |
| Entrar / Intermedio / Pre-intermedio | Entrando... | (next view) |
| Invitar | Invitando... | (inline message) |
| Iniciar | Iniciando... | (next view) |
| Borrar / Sí, borrar | Borrando... | (next view) |
| Generar / Crear curso | Creando... | (next view) |
| Sí, a … | Moviendo... | (next view) |
| Cerrar sesión | Cerrando... | (next view) |
| No entendí | Guardando... | Listo |

Failure: existing "Algo salió mal" plus retry. Skip pure client toggles (play/pause, step pills that only change local step).

### Inputs (textareas, text fields)
- Background: `--surface` (white)
- Border: 1px solid `--paper-line`
- Radius: `md` (16px)
- Padding: 12px
- Focus: border thickens to 2px, color shifts to `--accent` (terracotta)
- Placeholder: `--text-muted`
- Font: `body-main` (Lora, 16px)

### Selects
Same chrome as text inputs. Hide the native disclosure arrow. Draw a 16px chevron (`--text-secondary`) as the caret. Place it `--select-caret-inset` (`md`, 16px) from the right edge, never flush to the rounded border. Extra right padding is inset + caret + 8px so the value never runs under the arrow. Change `--select-caret-inset` in `globals.css` when the caret needs to move; do not tweak one `<select>` in isolation.

### Cards
- Background: `--surface` (white)
- Border: 1px solid `--paper-line`
- Radius: `lg` (24px)
- Padding: 16px (mobile), 20px (desktop)
- No box-shadow (tonal layering only)

### Lists
- Items separated by 1px horizontal rules (`--paper-line`)
- Avoid chevron icons unless the list item is strictly navigational
- Let layout and typography imply interactivity

### Step instructions (`StepInstructions`)
Always-visible how-to for `kind=story` steps only. Dialogue uses the same `StorySteps` shell but does not render this block or the story why card. Lives in the scrolling content column, never in the sticky header or dot nav.

- Title: step name from `LESSON_COPY` (`headline-md`, `--text-primary`). This is the step heading ("Lee la historia"), not the story title from the lesson header.
- List: disc bullets, `body-main`, `--text-secondary`, 8px between items, 20px left indent (`pl-5`). `lang="es"`.
- Story only: last bullet lead **La regla más importante:** (`font-semibold`, `--text-primary`) then the rest of that line. Words wrapped in `*…*` in the copy module render as `<em>`.
- 16px gap (`mb-4`) before the why callout / activity.
- Why callouts stay `MicroExplanation` (accent-softer card, one-time localStorage dismiss). Copy is vault-sourced in `src/lib/lesson-copy.ts`. Personal why is omitted in classroom-live.

### Progress Dots
- Inactive: 8px circle, `--paper-dot` (#c4a574 warm gold)
- Active: 12px circle, `--accent` (terracotta), subtle ring
- Completed: 8px circle, `--paper-dot-done` (#8b7355)
- Connecting line: 2px height, `--paper-line` (inactive) or `--accent` (completed)
- All dots: 44x44px hit area (visible dot centered in larger touch target)

## Audio Player Layout Rules

Before play, the story shows one control. After play starts, that control leaves and the sticky bar owns skip, speed, and seek. The two never sit on screen together.

### Opening control
- One 48x48px circle, `--accent` background, white Play icon, with the label "Escuchar" (`label-md`, `--text-secondary`) beside it.
- No card, no skip, no speed, no seek, no "Lee y escucha" status.
- If play fails: the story stays, and a line says "No pude cargar el audio. Toca play otra vez." The same button tries again.

### Sticky Player (bottom of screen, after play starts)
- Container: `--audio-bg` background, top border 1px `--audio-border`, subtle shadow (sticky exception)
- Height: 64px total on mobile
- Layout: vertical. Seek bar (24px) on top, controls (40px) below.
- **Controls row must have horizontal padding: 12px left and right.** No element touches the screen edge.
- Controls row: `flex`, `items-center`, `justify-center`, gap 4px
- Element order: skip-back, play/pause, skip-forward, speed toggle, time
- Play/pause: 36x36px
- Skip/speed buttons: 36px wide touch target, 40px tall. Labels use `label-sm` (12px), not 11px.
- Time: 12px (Roboto Flex), right-aligned, `margin-left: auto`
- On desktop (768px+): centered pill, 480px max-width, rounded corners

### Seek Bar
- Track height: 4px visible, 24px touch target (transparent padding around it)
- Track background: a muted version of the accent color
- Fill: `--accent` (terracotta)
- Thumb: 16px circle, `--accent`, subtle shadow
- Works with touch (drag) and mouse (click/drag)

## Bottom Sheet (Ver el texto)
- Slides up from bottom. Enter **and exit** are 200ms ease-out fade + slide (not a hard cut). Overlay fades with the panel.
- Background: `--surface` (white)
- Top radius: `lg` (24px)
- No shadow (tonal layering: white sheet on paper background, 1px border at top)
- Drag handle: 36px wide, 4px tall, `#d1d5db` (gray-300), centered, 8px top margin
- Max height: 75vh (leaves a strip at top so learner knows questions are underneath)
- Close: tap outside, swipe down, or X button
- `prefers-reduced-motion`: jump to open/closed, no slide

## Word help sheet
Short paper sheet for a tapped word. Same family as Ver el texto, not 75vh.

- Height hugs content. Full width on a phone. On desktop, max 672px (the lesson column), wider than the 480px sticky player so they do not read as a matched pair. Cap ~45vh above the chrome.
- Tight stack: grabber, English head (the word, or the full expression when the tap is inside one) + close, then the gloss. Plain words: Spanish, POS in lowercase parentheses, IPA, ghost play. Expressions: Spanish, explanation when set, then the tapped word's IPA and play.
- Rises from the **viewport bottom behind** sticky audio (`z-index` 40) and `.step-nav` (`z-index` 35). Sheet stack is `z-index` 30. Overlay is full-screen so story text behind the frosted nav/audio dims the same as the rest of the page. Panel padding-bottom equals that chrome height so word copy is not hidden; the white sheet continues under the player and nav so its outline reads behind them. Nav and audio stay the same style and stay tappable.
- Grabber, tap outside, swipe down, Escape, or X. Focus trap while open. One sheet at a time.
- Motion: 200ms ease-out enter **and** exit. Overlay fades. Reduced motion: instant.
- A plain word: English headword, then one gloss line (Spanish, POS in lowercase parentheses, IPA, ghost play), then No entendí, teacher flags. Do not auto-play audio.
- A word inside a multi-word expression (`words.expression_id`): the whole phrase shares one `--accent-soft` wash, including the spaces between its words. Sheet head is `expressions.text`. Gloss is the expression's Spanish. `explanation` follows when it is set. IPA and play stay on the tapped word, on a second line that names that word, so they are not read as the phrase. No POS on an expression. Flags and No entendí stay on the tapped word. Same behavior for story, dialogue, Movie Talk, song lyrics, and any future lesson that stores expressions.
- Same component on story, dialogue, lyrics, bio, and taps inside Ver el texto.
- After a lookup, that word's dotted line becomes a 2px solid `--text-secondary` underline (`word-seen`). The 1px dotted `--paper-line` line on every other word stays. A teacher pronunciation underline stays 2px `--accent` and wins when both are on the same word. There is no control to clear the lookup line. The lookup row stays for the teacher. Logged-out / teacher preview: no writes.
