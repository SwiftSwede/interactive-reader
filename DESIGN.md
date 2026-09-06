# Design System

> This is the source of truth for all visual decisions in the app.
> Every component must use these tokens. Do not invent new colors, spacing, or sizing.
> If a value is not defined here, add it here first, then use it.

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
| `--text-muted` | `#83746b` | Timestamps, hints, placeholders |
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
- **Sticky elements only** (sticky audio player, sticky header): may use a subtle shadow (`0 4px 12px rgba(0,0,0,0.06)`) to separate from scrolling content. This is the only exception to the no-shadow rule.

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
- This is the only element that changes shape on desktop. Everything else just gets more side margin.

**Header (desktop):**
- Same 56px height, same layout, same content.
- Constrained to the 672px content width. The header does not stretch full-width on desktop. It matches the content column below it.
- The paper-header background fills the full width behind it (so the top of the screen isn't a different color), but the actual header content (logo, icons, back button, lesson name) is constrained to 672px centered.

**Sticky audio player (desktop):**
- Centered pill, 480px max-width, rounded corners (24px), 16px margin from bottom and sides. Same as mobile content but visually distinct as a floating element.
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

- **Left rail — fixed 240px.** Persistent nav, identical on every teacher page. White surface, 1px `--paper-line` border on the right edge. Items top to bottom: *Este mes* (default, `/teacher`), *Grupos* (all courses incl. archived), *Estudiantes* (global roster/search), *Analíticas* (palabras más consultadas), *Contenido* (disabled, "próximamente", until the content editor ships). Active item: `--surface-hover` background, terracotta left edge (3px) or terracotta text. Lucide icons (`home`, `users`, `search`, `bar-chart-3`, `book-open`). Rail bottom: teacher name/email + "Ver app como estudiante" link. UI language: Spanish.
- **Center — fluid, min-width 0.** The main view for the current route. Horizontal padding 24px. Content max-width 960px (NOT 672px — tables, grids, and multi-card rows benefit from width; the 672px rule is a story-readability rule and stories never render here).
- **Right context panel — 360px, collapsible.** Details for the item selected in the center column (e.g., selected class → attendance grid, recording URL, session time, "Ver como estudiante"). White surface, 1px `--paper-line` border on the left edge. On screens < 1280px the right panel collapses into a slide-over sheet triggered from the center selection. The shell degrades to 2 columns (rail + center) below 1024px; the rail collapses to an icon-only 64px strip. Mobile (< 600px): rail becomes a top bar with a menu button opening a full-screen nav sheet. Teacher pages are usable but not optimized below 1024px.

### Visual language

Same Paper Light theme, same tokens, same type scale as the student app (Lora headlines, Roboto Flex UI labels). Same tonal elevation: white cards on cream paper, 1px `--paper-line` borders, no shadows except sticky elements. Buttons: rounded-rectangle 16px (the pill shape stays reserved for lesson step nav). Touch targets 44px still apply — Kyle clicks fast mid-class.

### Key screens

- **Este mes (default):** current calendar month. One card per group (course): group name, level label, day/time pattern, theme if set, readiness summary ("3/8 clases listas"), next class with countdown. Clicking a group expands/drills into its 8-class strip. If no course exists for the current month: empty state "Próximo mes en preparación" with a "Nuevo mes" button (generator ships in a later slice; until then the button routes to the existing create-course form).
- **8-class strip:** the month's 8 sessions as a vertical list, one row per class: class number, type label (Historia, Pronunciación, Video, Conversación, Diálogo, Música, Escritura, Examen), date/time, content status (assigned / sin contenido), recording status (URL attached / empty). Selecting a row populates the right context panel.
- **Grupos:** all courses, current first, archived below under "Meses anteriores". Each row shows theme when set. Archived months are fully browsable read-only, EXCEPT the theme field and recording URLs stay editable (recordings are pasted day-after-class; themes are often named late).
- **Estudiantes:** searchable global roster across groups. Student card: name, email, current group, attendance history, writing submissions with WPM trend, "cambiar de nivel" action (existing roster-move behavior).
- **Analíticas:** palabras más consultadas only — per month, per level, aggregated across the month's stories. No other metrics in this phase (attendance rates, engagement scores etc. are future "institute administrator" territory, deliberately excluded).

### Attendance (interaction rules)

- Binary: asistió / no asistió. Plus an "auto" marker on rows pre-filled from session-link clicks. Manual override on ALL class types, including app-tracked ones.
- Right-panel checkbox grid: student display names, tap toggles. Auto-save on every tap — no submit button, no unsaved state. This happens mid-Zoom; any friction is a bug.

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

### Inputs (textareas, text fields)
- Background: `--surface` (white)
- Border: 1px solid `--paper-line`
- Radius: `md` (16px)
- Padding: 12px
- Focus: border thickens to 2px, color shifts to `--accent` (terracotta)
- Placeholder: `--text-muted`
- Font: `body-main` (Lora, 16px)

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

### Progress Dots
- Inactive: 8px circle, `--paper-dot` (#c4a574 warm gold)
- Active: 12px circle, `--accent` (terracotta), subtle ring
- Completed: 8px circle, `--paper-dot-done` (#8b7355)
- Connecting line: 2px height, `--paper-line` (inactive) or `--accent` (completed)
- All dots: 44x44px hit area (visible dot centered in larger touch target)

## Audio Player Layout Rules

The audio player appears in two places: inline (top of story) and sticky (bottom of screen while playing).

### Inline Player (top of story)
- Container: `--audio-bg` background, 1px `--audio-border` border, radius `md` (16px), padding 16px
- Layout: vertical stack. Controls row on top, seek bar below.
- Controls row: `flex`, `items-center`, `justify-center`, gap 8px between elements
- Element order: skip-back, play/pause, skip-forward, flexible spacer, speed toggle, time
- Play/pause button: 48x48px circle, `--accent` background, white icon
- Skip buttons: 44x44px touch target, SkipBack/SkipForward icon + "10s" label
- Speed button: 44x44px touch target, Gauge icon + "1x" / "0.75x" label
- Time display: 12px (Roboto Flex), `--text-muted`, tabular-nums, right-aligned

### Sticky Player (bottom of screen)
- Container: `--audio-bg` background, top border 1px `--audio-border`, subtle shadow (sticky exception)
- Height: 64px total on mobile
- Layout: vertical. Seek bar (24px) on top, controls (40px) below.
- **Controls row must have horizontal padding: 12px left and right.** No element touches the screen edge.
- Controls row: `flex`, `items-center`, `justify-center`, gap 4px
- Element order: skip-back, play/pause, skip-forward, speed toggle, time
- Play/pause: 36x36px (smaller than inline, fits in 40px row)
- Skip/speed buttons: 36px wide touch target, 40px tall
- Time: 12px (Roboto Flex), right-aligned, `margin-left: auto`
- On desktop (768px+): centered pill, 480px max-width, rounded corners

### Seek Bar
- Track height: 4px visible, 24px touch target (transparent padding around it)
- Track background: a muted version of the accent color
- Fill: `--accent` (terracotta)
- Thumb: 16px circle, `--accent`, subtle shadow
- Works with touch (drag) and mouse (click/drag)

## Bottom Sheet (Ver el texto)
- Slides up from bottom, animated 200ms ease-out
- Background: `--surface` (white)
- Top radius: `lg` (24px)
- No shadow (tonal layering: white sheet on paper background, 1px border at top)
- Drag handle: 36px wide, 4px tall, `#d1d5db` (gray-300), centered, 8px top margin
- Max height: 75vh (leaves a strip at top so learner knows questions are underneath)
- Close: tap outside, swipe down, or X button

## Step Transitions
- Fade + slight slide: 200ms ease-out
- No bounce, no rotation, no scale
- Only the content area transitions. Header and progress dots stay fixed.

## Icon System

Use **Lucide React** for all icons. Consistent thin stroke, uniform weight.
- Import pattern: `import { Play, Pause, SkipBack, SkipForward, Gauge, X, ChevronLeft, ChevronRight } from "lucide-react"`
- Icon sizes: 16px (compact/inline), 20px (standard), 24px (primary actions)
- Icons inherit text color by default. Do not hardcode icon colors — use `currentColor` or text color classes.
- Icons should feel like "ink" — the same color as the text they accompany.
- **Never use emojis as icons.** No "📖", "🎯", "✅", "🔥" in the UI. Use Lucide icons.
- **Never use text strings as icon substitutes** (e.g., "«10s"). Use SkipBack icon + "10s" text label.

### Standard icon mapping
| Concept | Lucide icon | Usage |
|---|---|---|
| Play audio | `Play` | Audio player, story playback |
| Pause audio | `Pause` | Audio player |
| Skip back 10s | `SkipBack` | Audio player |
| Skip forward 10s | `SkipForward` | Audio player |
| Speed toggle | `Gauge` | Audio player (0.75x / 1x) |
| Close / dismiss | `X` | Modals, bottom sheets, callouts |
| Previous step | `ChevronLeft` | Step navigation |
| Next step | `ChevronRight` | Step navigation |
| View story text | `BookOpen` | "Ver el texto" button |
| Check / done | `Check` | Completed steps, success states |
| Correct answer | `CheckCircle2` | Comprehension feedback |
| Incorrect answer | `XCircle` | Comprehension feedback |
| Volume / sound | `Volume2` | Audio-related elements |
| Microphone | `Mic` | Pronunciation recording |
| Info / explanation | `Info` | Micro-explanation callouts |
| Fullscreen | `Maximize2` | Classroom YouTube: student live view |
| Exit fullscreen | `Minimize2` | Classroom YouTube: student live view |

## Visual Hierarchy Rules

Every screen must have one clear focal point. The learner's eye should know where to land first.

### Weight System
| Level | Font | Size | Weight | Color | Usage |
|---|---|---|---|---|---|
| Primary | Lora | 24px | 700 | `--text-primary` | Story title, one per screen |
| Secondary | Lora | 18px | 600 | `--text-primary` | Step titles, section headings |
| Body | Lora | 18px | 400 | `--text-primary` | Story text, main content |
| Supporting | Roboto Flex | 14px | 600 | `--text-secondary` | Labels, instructions, callouts |
| Metadata | Roboto Flex | 12px | 500 | `--text-muted` | Timestamps, counts, hints |

### Rules
- One element per screen gets Primary weight. Everything else is Secondary or below.
- If everything is the same size and weight, the user has to read all of it to find what they want. That is a failure state.
- Use color sparingly: `--accent` for interactive elements, `--text-muted` for de-emphasized text. Never use color for decoration.
- Bold is for the one thing that matters on the screen. Not for emphasis on multiple things.
- No more than two font weights in a single visual region (one card, one header bar).
- Muted text (`--text-secondary`, `--text-muted`) turns the volume down so the focal point can be heard.

## Loading, Empty, and Error States

Every screen that fetches data or performs an action must handle all three states. These are not afterthoughts — design them deliberately.

### Skeleton Loaders
- Gray pulse shapes matching the content layout (gray bars where text will be, gray rectangles where cards will be)
- Background: `--surface-hover` (`#f2ede4`)
- Pulse animation: 1.5s ease-in-out infinite, opacity 0.5 to 1.0
- Never show a blank screen. If data takes more than 0.3s to load, show skeletons.
- Story page skeleton: gray title bar, gray paragraph lines (varying widths to look natural), gray button rectangles where audio controls go.

### Empty States
- Center the content vertically in the available space
- Icon (Lucide, 48px, `--text-muted` color) at top
- Short message in Spanish, Kyle's voice: "Aun no tienes clases asignadas. Tu profe te enviara un enlace."
- No generic "No data found" or English text
- If there is an action the user can take, show a secondary button below the message

### Error States
- Friendly message in Spanish, Kyle's voice: "Algo salio mal. Intenta de nuevo."
- No raw error codes, stack traces, or technical language
- Retry button (primary style) below the message
- If the error is permanent (e.g., story not found), show the message without a retry button

## Do's and Don'ts

### Do
- Use Lucide icons for all iconography. Consistent stroke weight and sizing.
- Use the color tokens via the semantic names (`accent`, `paper`, `surface`, `text-primary`, etc.)
- Reserve color for data, status, and interactive elements. Muted chrome looks expensive.
- Use one focal point per screen. Size, weight, and color establish hierarchy.
- Truncate long strings with ellipsis after a reasonable length. Real data is messy.
- Design empty states and loading states for every data-driven view.
- Use skeleton loaders for anything over 0.3 seconds load time.
- Keep all spacing on the 4px scale. No arbitrary values.
- Use the same verb for the same action everywhere. If it is "Eliminar" on one screen, it is "Eliminar" on every screen.
- Test every screen at 375px width before considering it done.
- Use pills (9999px) for step navigation buttons only. Rounded rectangles (16px) for everything else.
- Use Lora for story text and headlines. Use Roboto Flex for UI labels and navigation.

### Don't
- No emojis as icons. No "📖", "🎯", "✅", "🔥" in the UI. Use Lucide icons.
- No clashing gradients. No purple-to-blue backgrounds. No glow shadows.
- No saturated default AI colors (bright blue + bright purple). Use the earthy terracotta + moss palette.
- No hardcoded hex values in component code. All colors come from tokens.
- No repeated KPI cards or stat blocks on every page. Each page answers one question.
- No decorative elements where information should be. AI decorates. You inform.
- No "delete" on one screen and "remove" on another. Consistent vocabulary, always.
- No pure white (`#ffffff`) backgrounds for reading areas. Use `--paper` (`#faf6f0`).
- No dark mode. Not yet.
- No gamification (XP, streaks, badges, confetti).
- No arbitrary spacing values. Use the spacing scale.
- No mixing Tailwind utility classes and custom CSS classes for the same element. Pick one system per component.
- No em dashes in UI copy.
- No hover-dependent functionality on mobile.
- No more than two font weights in a single visual region (e.g., one card, one header bar).
- No infinite scroll. Use "load more" buttons if pagination is needed.
- No forced tutorial tours. Progressive onboarding only: one action, then reveal the next.
- No shadows on cards. Tonal layering (white on paper) + 1px borders only. Sticky elements are the only exception.
- No Material Design 3 token names. Use the semantic names defined in this file.

## Navigation Architecture

The app has two navigation modes that never overlap.

### Browsing Mode
Pages: Inicio (dashboard), Lecciones (lesson list), Herramientas (tools), Perfil (settings), Noticias (news)

- **Bottom tab bar** with 3 tabs: Inicio, Lecciones, Herramientas
- Tab bar is 56px tall, fixed at the bottom of the screen
- Tab labels use `label-md` (Roboto Flex, 14px, 600)
- Active tab: `--accent` (terracotta) text color + small dot or underline indicator above the label
- Inactive tabs: `--text-muted` color
- Tab icons (Lucide, 20px): Home (Inicio), BookOpen (Lecciones), Wrench or LayoutGrid (Herramientas)
- Content area has bottom padding of 56px + safe area so content never hides behind the tab bar

**Header (browsing mode):**
- Height: 56px, sticky, `--paper-header` background with backdrop blur
- Left: "Profe Kyle" (small, `--text-secondary`, `label-sm`)
- Right: Profile icon only (Lucide `User`, 20px, `--text-muted`, 44x44px touch target, links to `/profile`). The News icon is omitted until Noticias ships. No dead icon.
- These are the only header elements in browsing mode. No search bar, no title. The tab content below provides the page title.

**No sticky audio player in browsing mode.** The tab bar owns the bottom of the screen.

### Lesson Mode
Pages: story lessons, writing lessons, exams, movie talk, music, future lesson types

- **No bottom tab bar.** The lesson takes over the full screen.
- **No News or Profile icons.** The learner is in a focused task. No distractions.
- Tab bar is hidden. Sticky audio player (if the lesson has audio) uses the bottom of the screen.

**Main header (lesson mode):**
- Height: 56px, sticky, `--paper-header` background with backdrop blur
- Left: Back button "← Volver" (ghost button style, `--text-secondary`, `label-md`, 44px touch target, ChevronLeft icon)
- Center or left: "Profe Kyle" (small, `--text-muted`, `label-sm`)
- Below the header row: lesson type label (e.g., "Historia", "Escritura", "Examen") in `label-sm` (`--text-muted`), and lesson name (e.g., "The Soccer Jersey") in `headline-md` (Lora, 18px, 600, `--text-primary`)
- The back button exits the lesson entirely. It returns to wherever the learner came from (dashboard, Lecciones tab, or closes the page if arrived via direct link).

**Subheader (lesson mode):**
- Sits directly below the main header, also sticky
- Contains lesson-specific navigation:
  - **Stories and Traducción:** Progress dots (dot - line - dot). Active dot is larger. Dots are tappable (44px hit area). No "Paso N de N" text. The dots are the step chrome.
  - **Presentación:** Warmup has no dots. Inside a segment, `"Video 1 de 3"` plus 4 dots. Teacher-only pills during live class.
  - **Writing:** Timer display (countdown, `headline-md`, tabular-nums). No dots.
  - **Exams:** Task navigation ("Tarea 1 de 3", `label-md`). No dots.
  - **Movie talk:** Scene markers (timeline with scene thumbnails or timestamps). No dots.
  - **Music:** Lyric tracker or song structure markers. No dots.
- Each lesson type brings its own widget for this zone. The main header above and the content below stay the same.

**Lesson content:**
- Recording banner (after-phase only): when the session window is closed AND `recording_youtube_url` is set, a white card (`--paper-line` border, 16px radius) sits below the lesson header/subheader and above the steps/tasks. Terracotta play icon + "Ver la grabación de la clase" + "(YouTube)" in `--text-muted`. Opens the URL in a new tab. Hidden during the live window even if a URL was pasted early.
- One step at a time for stories (story text, comprehension, personal, dictation, choral, pronunciation)
- Full activity for writing (prompt, text input, timer, submit)
- Task-based for exams (fill-in, restructuring, translation)
- Scrolls between the sticky subheader and the bottom navigation buttons
- Max-width: 672px (`max-w-2xl`), centered

**Bottom navigation (lesson mode):**
- Step nav arrows at the bottom of the scroll content (not fixed)
- Pill-shaped buttons (9999px radius): "← El cuento" (left, secondary style) and "Comprensión →" (right, primary style)
- Left arrow hidden on first step. Right arrow hidden on last step.
- Last step shows completion message instead of right arrow: "Listo! Has practicado todos los ejercicios." (`label-md`, `--text-secondary`, centered)
- For lessons without steps (writing, exam): a single submit button (rounded rectangle, primary style) replaces the step nav arrows

**Sticky audio player (lesson mode):**
- Appears at the bottom of the screen when audio is playing
- Tab bar is hidden, so no conflict
- When learner taps back to exit lesson: audio stops, tab bar reappears

### Visual diagram (lesson mode)

```
┌─────────────────────────┐
│ ← Volver   Profe Kyle    │  Main header (sticky, 56px)
│ Historia                 │  Lesson type label
│ The Soccer Jersey        │  Lesson name
├─────────────────────────┤
│  •—•—●—•—•—•            │  Subheader (sticky): progress dots
├─────────────────────────┤
│                          │
│   [Step content]         │  Lesson content (scrolls)
│   One activity at a time │
│                          │
│                          │
│  ← El cuento   Personal →│  Bottom nav (end of scroll)
├─────────────────────────┤
│  [sticky audio player]   │  Only during audio playback
└─────────────────────────┘
```

### Visual diagram (browsing mode)

```
┌─────────────────────────┐
│ Profe Kyle         👤     │  Header (sticky, 56px)
├─────────────────────────┤
│                          │
│  [Page content]          │  Dashboard / lesson list / tools
│  Greeting, progress,     │  (scrolls, padding-bottom 56px)
│  assigned lessons...     │
│                          │
├─────────────────────────┤
│  Inicio  Lecciones  Herr.│  Tab bar (fixed, 56px)
└─────────────────────────┘
```

## Page Layouts

### Inicio (Dashboard)
The learner's home base. Shows today's class, progress, the month's 8-class stack, and recent practice.

**Section order (top to bottom):**
1. Greeting: "Hola, [name]" (`headline-lg`, Lora, 24px, 700, `--text-primary`). Fall back to "Hola" if the name is missing. In the normal state this is the only Primary-weight text on the page.
2. Class-day card (only when the active course has a session whose `session_date` is today on the student's phone). No empty slot on other days.
   - **Before T-10min (joinAt):** small white card: "La clase es HOY" / "Empieza en 3h 22m" (`headline-md`, tabular-nums) / "{typeLabel} · {courseName}".
   - **joinAt to session end:** JOIN HERO. Full-width terracotta primary card with a large white "ENTRAR A LA CLASE ▶" button. This becomes the page's focal point (greeting stays, the hero wins by color and size). Type label + course name below. For live-only types (Conversación, Pronunciación) render an info card instead, no button: "{typeLabel} · Entra por Zoom — el link está en el chat de Zoom."
   - **After session end, same day, no recording URL:** small moss-green card: "✓ Clase terminada · La grabación se subirá a YouTube pronto".
   - One client component ticks locally. No server polling.
3. Progress card: white surface, `--paper-line` border, 24px radius, 16px padding. Course display name (`label-md`), "Clases completadas: {n} de {total}" (`label-md`, `--text-secondary`), 4px progress bar (`--accent` fill, `--paper-line` track). Entire card links to `/progress`. `{total}` includes placeholders and live-only rows. Live-only types do not count toward `{n}` until teacher attendance ships. No upsell card for classroom students. Classroom Inicio shows the **current calendar month** at the student's Zoom level, not a prior month (a newly enrolled empty month still wins over last month's sessions). Older months on Lecciones are newest first; sessions inside those older months are newest first. Consumer "last opened course" is not stored yet.
4. "Este mes" section heading (`headline-md`, Lora, 18px, 600). 24px gap above, 16px gap below. The course is a monthly 8-session arc, not a week.
5. Assigned lesson list: each item is a row card (white surface, `--paper-line` border, 16px radius, 12px padding). Row contains:
   - Lesson type icon (Lucide, 20px): BookOpen (story), PenLine (writing), FileText (exam), Languages (video_summary), MonitorPlay (presentation), MessagesSquare (conversation), Mic (pronunciation)
   - Lesson name (16px, Lora, 600, `--text-primary`). Placeholders and live-only rows use the type label as the title.
   - Status line (12px, one line, ellipsis). Lifecycle:
     - placeholder (content FK null): 🔒 Lock, "Próximamente · {date}", not tappable, no chevron
     - upcoming: ○ hollow dot `--text-secondary`, "Sin empezar · {date}", chevron, tappable
     - live: ● filled `--accent` with a subtle pulse (`prefers-reduced-motion` respected), "EN VIVO · entra ahora", chevron
     - after-pending (window closed, no recording URL): ✓ `--success`, "Completada · {date}", plus muted "La grabación llega pronto"
     - after-recorded: ✓ `--success`, "Grabación disponible", chevron
   - Live-only overrides (never 🔒, never tappable, no chevron): upcoming "{typeLabel} · En vivo por Zoom · {date}"; live "EN VIVO · por Zoom"; after "Clase terminada · {date}"
   - Right side: ChevronRight (`--text-muted`) only if the row is navigational
   - Rows separated by 8px gap
6. "Práctica reciente" section heading (`headline-md`). 32px gap above, 16px gap below. Omit the whole section when every count is zero.
7. Recent practice summary: unordered list, no cards. Each row is `body-main` `--text-secondary` with a bold label (`font-semibold` `--text-primary`): Dictado, Palabras, Pronunciación. Same list pattern on `/progress`.
8. Bottom padding: 56px + safe area (tab bar space).

Empty: enrolled with zero sessions: BookOpen 48px `--text-muted` + "Tu profe todavía no ha publicado las clases de este mes." No-course: same icon + "Aún no estás en un grupo. Tu profe te enviará un enlace."

### Lecciones (Lesson List)
All assigned lessons, filterable by type.

**Section order:**
1. Page title: "Lecciones" (`headline-lg`, 24px, 700). Focal point.
2. Filter chips: "Todos" / "Historias" / "Escritura" / "Exámenes" / "Traducción" / "Presentación" (pill-shaped, 8px gap between them, `label-sm`). Active chip: `--accent` background, white text. Inactive: transparent, `--paper-line` border, `--text-secondary` text. No "En vivo" chip. Live-only rows still appear under Todos.
3. Lesson list: same row card structure as the dashboard assigned lessons, showing all sessions (current course first, then older courses). Group heading per course month ("AGOSTO · NIÑERA", `label-sm` uppercase `--text-muted`) only when the student has more than one course. Use "Cargar más" after 12 rows. No infinite scroll.
4. Empty state: if no lessons assigned, show Lucide `BookOpen` icon (48px, `--text-muted`), message "Aun no tienes clases asignadas. Tu profe te enviara un enlace." (`body-main`, `--text-secondary`), centered.
5. Bottom padding: 56px + safe area.

### Herramientas (Tools)
Supplementary learning tools. The sounds library ships in a later slice. This slice keeps the tab so the tab bar never has to be retrofitted.

**Section order (current):**
1. Page title: "Herramientas" (`headline-lg`, 24px, 700). Focal point.
2. Centered empty state: Lucide `LayoutGrid` (48px, `--text-muted`), "Próximamente: la biblioteca de sonidos del Profe Kyle."
3. Bottom padding: 56px + safe area.

**Later (sounds grid, not this slice):**
1. Sounds section heading: "Sonidos" (`headline-md`, 18px, 600). 16px gap below.
2. Short explanation callout: `--accent-softer` background, 16px radius, 12px padding. "Cada sonido que no existe en espanol necesita practica. Toca un sonido para ver el video del Profe Kyle explicandolo." (`body-main`, `--text-secondary`). Dismissible with X icon (Info icon on the left).
3. Sound grid: 2 columns on mobile. Each card:
   - IPA symbol (24px, monospace, `--accent`, centered)
   - Sound name (14px, Roboto Flex, 600, `--text-secondary`, centered)
   - Example words (12px, Roboto Flex, `--text-muted`, centered)
   - White surface, `--paper-line` border, 16px radius, 12px padding
   - Tappable: opens video modal
4. Video modal: centered, white, 24px radius, 1px `--paper-line` border (no shadow). Contains: X close button (top right), IPA symbol title, sound name, description, 16:9 video player area (dark `--text-primary` background, play button overlay), example words.
5. Future tools plug in below the sounds section. No architecture change needed.

### Perfil (Profile/Settings)
Account management. Accessed via profile icon in header, not a tab. Drill-down page.

**Section order:**
1. Page title: "Perfil" (`headline-lg`, 24px, 700). Focal point.
2. Account info card: white surface, `--paper-line` border, 24px radius, 16px padding. Shows:
   - Display name (18px, Lora, 600). Students can edit it (invite nicknames are sometimes a weird internet handle). Saving updates every enrollment row for that student plus auth `user_metadata`.
   - Email (14px, Roboto Flex, `--text-secondary`)
   - Subscription status: "Activa" (`--success`) or "Expirada" (`--error`) with colored dot
3. Logout button: secondary style (outlined), full width, 16px radius. Lucide `LogOut` icon + "Cerrar sesion" label.
4. No stats here. Stats live on the dashboard.
5. Bottom padding: 56px + safe area.

### Noticias (News)
Blog/updates. Accessed via news icon in header, not a tab. Drill-down page.

**Section order:**
1. Page title: "Noticias" (`headline-lg`, 24px, 700). Focal point.
2. Article list: each article is a card (white surface, `--paper-line` border, 16px radius, 16px padding). Card contains:
   - Date (12px, Roboto Flex, `--text-muted`)
   - Title (18px, Lora, 600, `--text-primary`)
   - Excerpt (14px, Roboto Flex, `--text-secondary`, 2-line max with ellipsis)
   - Tap to read full article
3. Empty state if no articles: Lucide `Newspaper` icon, "No hay noticias todavía." (`--text-secondary`).
4. Bottom padding: 56px + safe area.

### Story Lesson Page (detailed)
The step-based flow for story lessons. This is the most complex page layout.

**Header zone (sticky, 56px + subheader):**
- Main header: back button, "Profe Kyle", lesson type "Historia", lesson name "The Soccer Jersey"
- Subheader: progress dots (6 dots for 6 steps: El cuento, Comprension, Personal, Dictado, Coral, Pronunciacion)

**Content zone (scrolls, one step at a time):**

Step 1 - El cuento (Story):
- Micro-explanation callout (dismissable): "Leer en ingles es la base de todo..."
- Inline audio player (controls row + seek bar)
- Story text (Lora, 18px, line-height 32px, `--text-primary`). Interactive word spans with dotted underline. One word highlighted with yellow background (karaoke current word).
- "The End" (italic, centered, `--text-muted`)
- Bottom nav: right pill only ("Comprensión →")

Step 2 - Comprension (Comprehension):
- "Ver el texto" button (ghost, BookOpen icon + "El cuento" label) — opens bottom sheet
- Micro-explanation callout: "Contesta antes de ver la respuesta..."
- Question cards: white surface, `--paper-line` border, 16px radius, 16px padding. Each card: question (16px, Lora, 600), textarea (white, `--paper-line` border, 16px radius), "Ver respuesta" button (primary, 16px radius). Revealed answers show in `--surface-hover` background box.
- Bottom nav: left pill ("← El cuento"), right pill ("Personal →")

Step 3 - Personal (Personal Questions):
- "Ver el texto" button
- Micro-explanation callout: "Estas preguntas no tienen una respuesta correcta..."
- Question cards with textarea + "Comprobar" button. AI feedback shows inline (green additions, red strikethrough, amber moved words, underline-only at the destination). Legend chips use the same highlight marks as the words.
- Bottom nav: left pill ("← Comprensión"), right pill ("Dictado →")

Step 4 - Dictado (Dictation):
- "Ver el texto" button
- Micro-explanation callout: "Sabias que la mayoria de los errores de escucha..."
- Play button (64px circle, `--accent`, white Play icon, centered)
- "Escucha y escribe lo que oyes" (`label-md`, `--text-secondary`, centered)
- Textarea (full width, 4 rows)
- "Comprobar" button (primary, centered)
- Result state: learner text (errors in red strikethrough, missing in green), correct text, Spanish explanation, IPA transcription (monospace, tappable sounds)
- Bottom nav: left pill ("← Personal"), right pill ("Coral →")

Step 5 - Coral (Choral Practice):
- "Ver el texto" button
- Play button for choral audio
- Round counter: "Repeticiones: 0/10" (`headline-md`, tabular-nums)
- Round indicator: 5 dots filling as rounds complete
- "¡Práctica completa!" message after 5 rounds (`--success` color)
- Bottom nav: left pill ("← Dictado"), right pill ("Pronunciación →")

Step 6 - Pronunciación (Pronunciation Assessment):
- "Ver el texto" button
- Reference sentence in a card (white, `--paper-line` border)
- Microphone button (64px circle, `--accent`, white Mic icon)
- "Toca para grabar" (`label-md`, `--text-secondary`)
- "Evaluar" button (primary)
- Result: word-by-word breakdown with colored dots (green/yellow/red), IPA (tappable), coaching notes
- Overall feedback callout (`--accent-softer` background)
- Bottom nav: left pill only ("← Coral"). Completion message: "Listo! Has practicado todos los ejercicios." (centered, `--text-secondary`)

**Steps hidden in classroom-live mode:**
- Dictado, Coral, and Pronunciación steps are hidden during the 90-minute live class window
- Progress dots show only: El cuento, Comprension, Personal (3 dots instead of 6)
- In classroom-review and open mode: all 6 steps shown

### Writing Lesson Page (detailed)
No step flow. Single activity with a timer.

**Header zone:**
- Main header: back button, "Profe Kyle", lesson type "Escritura", lesson name (prompt title)
- Subheader: timer display (countdown, `headline-md`, tabular-nums, `--text-primary`). Pre-intermediate: 10 min. Intermediate: 20 min.

**Content zone:**
- Prompt question (18px, Lora, 600, `--text-primary`) in a white card
- Intermediate only: structure lesson / rubric / example paragraph in collapsible sections
- Text input area (full width, white, `--paper-line` border, 16px radius, min-height 300px)
- Live word count (12px, Roboto Flex, `--text-muted`, right-aligned)
- Pre-intermediate only: WPM display (12px, `--text-muted`)
- Submit button (primary, 16px radius, full width). Always available.
- Pre-intermediate: input locks at zero (auto-submit). Intermediate: input stays open after zero (visual alert only).

### Exam Lesson Page (detailed)
Task-based, collaborative (group of 2-3 students).

**Header zone:**
- Main header: back button, "Profe Kyle", lesson type "Examen", exam name
- Subheader: "Tarea 1 de 3" (`label-md`, `--text-secondary`)

**Content zone:**
- Task 1: Fill-in translation. Story with Spanish words in parentheses. Input fields for each slot. Vocabulary list at top (collapsible).
- Task 2: Paragraph restructuring (intermediate) or sentence correction (pre-intermediate). Scrambled sentences with letter input fields, or sentence list with correction textareas.
- Task 3: Translation sentences. 10 Spanish sentences, textareas for English translations.
- Submit button at the bottom (primary, full width). Only the designated group writer submits.

### Video Summary Lesson Page (detailed)
Classroom only. `Story.kind = "video_summary"`. Session type is `video_summary` (uses `story_id`). Three steps with the same progress dots as stories.

**Header zone:**
- Main header: back button, "Profe Kyle", lesson type "Traducción", lesson name
- Subheader: progress dots (3 dots, same widget as stories). No "Paso N de 3" text. Stories do not show that label; the dots are the global step chrome.

**Content zone:**
- Step 1 El Video: 16:9 `ClassroomYoutubePlayer` (rounded 16px, paper-line border). Before class starts, students may watch with normal controls. During `classroom-live`: teacher has YouTube controls; student video follows muted (play, pause, skip). Overlay "Toca el video para oír" until the first tap, then audio unmutes. After the first tap the overlay stays invisible and blocks student taps. Students get a 48px Lucide `Maximize2` control (bottom right) for fullscreen; they still cannot pause or scrub. After the 90-min window (`classroom-review`): normal YouTube controls, no overlay. Students see "Toma notas de lo que ves." Teachers do not. Primary "Empezar resumen" only after class starts. Before class, students cannot open step 2 or step 3.
- Step 2 Tu Resumen: 5-minute timer. Teacher starts it from the lesson (step 2) or the session page: "Iniciar tarea de escribir". Large textarea (min-height 300px). Entregar stays disabled until the timer hits zero. Auto-submit at zero. Then "Entregado. Sigue a Traducción." After the timer hits zero, teacher sees "Ver resúmenes de estudiantes."
- Step 3 Traducción: opens for students when the writing timer hits zero. No teacher Continuar / Empezar traducción button. Spanish paragraphs as Lora `story-body` (no word tooltips). English as Roboto Flex `story-english` (same size, sans). Teacher textarea uses `story-english` with terracotta 2px border, including before class for prep. Listo (moss `--success`) only during the live window. Students see live English via Realtime. If a paragraph has no English yet, show nothing. Never show "El profe está traduciendo..." Teacher-only collapsible English original.
- Teaching notes: yellow highlight (`teaching-note-mark`, same yellow as karaoke). The mark stays inline and does not expand the line. Tap opens a small lightbox (`teaching-note-modal`, 24px radius, dimmed backdrop) with the note. Teacher selects text during live class; the compose form is the same lightbox. Teacher lightbox includes Borrar. Notes belong to this class session only. On the teacher English textarea, matching highlights also appear under the box so the mark is visible while typing.

Keep the YouTube player in review mode (solo controls). Students never see other students' free writes.

### Music Lesson Page (detailed)
Same Lesson mode shell as stories. `Story.kind = "song"`. Session type stays `story`.

**Header zone:**
- Main header: back button, "Profe Kyle", lesson type "Música", song name
- Subheader: lyric tracker is the existing story progress dots if the song has practice steps. During the lyric step, no extra widget beyond the YouTube player in content.

**Content zone (lyric step):**
- 16:9 `ClassroomYoutubePlayer` (rounded 16px, paper-line border). Same live lock / review solo rules as Traducción.
- Fill-in-the-blank listening (8-10 items in class; same card style as comprehension). "Comprobar" reveals answers. No score.
- Interactive lyrics: same word-span tooltips as stories. Truquitos live as expressions/tooltips on connected speech, not a second phonetic system.
- Karaoke uses the existing sticky audio player when story audio is present.

### Dialogue Lesson Page (detailed)
Same as the story lesson page. Lesson type label "Diálogo". First step "El diálogo". Speaker names (`Name:`) render in terracotta `label-md` before the line. Same tooltips and practice steps.

### Movie Talk Lesson Page (detailed)
Same as the story lesson page. Lesson type label "Movie Talk". First step "El video". If `youtube_url` is set, `ClassroomYoutubePlayer` uses the same live lock / review solo rules as music. `***` lines in the body are scene breaks (muted "Escena N" divider). Role reading uses the dialogue name styling when lines are `Name:`.

### Presentation Lesson Page (detailed)
Classroom only. `session_type = "presentation"`. Catalog lives in `presentation_prompts`. Route: `/presentation?session=`.

**Header zone:**
- Main header: back button, "Profe Kyle", lesson type "Presentación", presentation title
- Subheader: warmup has no part row and no dots. Inside a segment, a part switcher (`Part 1 | Part 2 | Part 3`, or `Video 1` if untitled) in `label-md` above the 4 progress dots (Vocabulario, Preguntas, Video, Respuestas). Same dot widget as stories. No "Paso N de N" text.
- Current part uses `text-text-primary`. Other parts are muted during live class for students (visible, not tappable). Teacher, post-class review, and later consumer self-study can tap a part. A tap keeps the same inner step (Video stays Video).

**Before class (students):** title plus warmup text if present. Message that class has not started. Vocab, questions, and video stay closed. Teacher is not locked and can walk the full lesson to prep.

**Content zone:**
- Warmup: English discussion prompt in a white card (`story-body` Lora). No input. Teacher-only "Empezar".
- Vocabulario: vertical list of cards (white, `--paper-line` border, 16px radius, 16px padding). English in Lora (`story-body`). Spanish in Roboto Flex (`label-md`, `--text-secondary`). Catalog example sentence in italic muted text. Session example note underneath when present. Teacher can edit Spanish (catalog) and add/edit a session-only example note from a small lightbox (`teaching-note-modal`).
- Preguntas: numbered list of information questions. No inputs. Students see what to listen for.
- Video: 16:9 `ClassroomYoutubePlayer` (rounded 16px, paper-line border). Same live lock / review solo rules as Traducción. Overlay "Toca el video para oír" until the first tap.
- Respuestas: same question cards as story comprehension (textarea + "Ver respuesta"). Reveal gated during live class.
- Done: centered message "Eso es todo. Vuelve a este link después de clase para repasar."

**Bottom navigation:**
- During live class, only the teacher sees Atrás / Siguiente pills. Students follow the teacher's step. Students still see the part row so they know how many videos are coming.
- After the 90-min window, students get the same pills and can tap parts to jump. Consumer self-study uses that same free nav.

Keep YouTube in review mode with normal controls. No pronunciation. No group work.
