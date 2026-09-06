# Cursor Prompt: Build Slice 57 — Student Dashboard Shell (Inicio + Lecciones + Tab Bar)

## Context

Read these files before starting:

- `DESIGN.md` — the source of truth for all visual decisions. Read the "Navigation Architecture" and "Page Layouts" sections in full. This slice implements the browsing-mode shell (header + bottom tab bar) and the Inicio and Lecciones page layouts specified there, with the amendments listed at the bottom of this prompt.
- `.cursorrules` — follow all rules, especially: build verification before push (`npx tsc --noEmit`), service layer separation (components are presentation-only, no direct Supabase queries in components), and the decisions review at the end.
- `src/lib/session-phase.ts` — existing `getSessionPhase()` returning `"before" | "live" | "after"`. You will extend this file (do not duplicate its logic elsewhere).
- `src/lib/activities.ts` — `SessionType`, `sessionTypeLabel()`, `studentSessionPath()`. Reuse these for lesson rows and navigation targets.
- `src/lib/sessions.ts` — how session access is resolved today.
- `src/lib/progress.ts` — existing `loadStudentProgress()`. Note its error-handling pattern: **missing tables or half-applied schema return empty data, not thrown errors.** You must follow this exact pattern (see "Graceful degradation" below).
- `src/app/dashboard/page.tsx` — the current placeholder page. This slice replaces the student branch entirely and moves the teacher branch out.
- `src/app/progress/page.tsx` — stays as-is. It remains a separate drill-down page.
- `src/app/lesson/[slug]/page.tsx`, `src/app/writing/page.tsx`, `src/app/exam/page.tsx` — the existing lesson entry points. You add one small thing to each (recording banner); otherwise do not modify lesson behavior.

## What to build

The student-facing browsing shell. Today the app has lesson pages but no home: `/dashboard` is a placeholder ("Ya estás adentro") that doubles as the teacher invite UI. This slice builds:

1. **BrowsingShell** — sticky header (56px) + fixed bottom tab bar (56px) wrapping the browsing-mode pages.
2. **Inicio (`/dashboard`)** — the student home: greeting, countdown/join/live card on class days, progress card, "Este mes" lesson stack (lessons 1–8), recent practice line.
3. **Lecciones (`/lessons`)** — all lessons for the student's active course, with filter chips and load-more.
4. **Herramientas (`/tools`)** — calm "Próximamente" empty state. The sounds grid ships in a later slice; the tab exists now so the tab bar never has to be retrofitted.
5. **Perfil (`/profile`)** — minimal stub per DESIGN.md's Perfil layout (display name, email, subscription status, logout). No stats.
6. **Schema change** — one new nullable column: `course_sessions.recording_youtube_url`.
7. **Recording banner** — shown inside lesson pages when the session is in its "after" phase and a recording URL exists.
8. **Teacher cleanup** — `/dashboard` redirects teachers to `/teacher`; the invite-student UI moves to `/teacher`.

Out of scope (do NOT build): `/` landing page changes, `/sample`, Noticias page (the News header icon is hidden entirely until it exists), consumer upsell card (hidden for all students in this slice), the Herramientas sounds grid, any Realtime subscriptions, the teacher **manual attendance** feature (planned for a teacher-dashboard slice; live-only classes will get their completion signal from it — do not stub it here), the **"nuevo mes" month generator** (planned teacher-dashboard slice — generates the 8 placeholder rows from Kyle's fixed monthly template), any gating of pronunciation steps inside story lessons (planned: classroom students get dictado/coral/pronunciación steps unlocked only after the Class 2 pronunciation session ends — separate slice), and any changes to teacher dashboards beyond moving the invite form.

## Kyle's monthly template (reference — NOT to be implemented here)

Every month, both levels follow a fixed 8-class sequence. This is the shape the teacher will create sessions in (today by hand, later via the "nuevo mes" generator):

| Clase | Pre-intermediate | Intermediate | App lesson |
|---|---|---|---|
| 1 | Story | Story | `story` ✅ built |
| 2 | Extreme Pronunciation | Extreme Pronunciation | `pronunciation` (live-only; activities are the dictado/coral/pronunciación steps inside the Class 1 story lesson) |
| 3 | Video Summary Translation | Presentation or Movie Talk | `video_summary` / `presentation` / `movie_talk` |
| 4 | Conversation (4-4-4) | Conversation (4-4-4) | `conversation` (live-only, Zoom) |
| 5 | Dialogue | Dialogue | `story` kind `dialogue` |
| 6 | Music | Music | `story` kind `song` |
| 7 | Writing | Writing | `writing` ✅ built |
| 8 | Group Exam | Group Exam | `exam` ✅ built |

## Route table

| Route | Mode | Auth | Notes |
|---|---|---|---|
| `/dashboard` | Browsing | required | Inicio. `role = teacher` → redirect to `/teacher`. No session → redirect `/login?next=/dashboard`. |
| `/lessons` | Browsing | required | Lecciones tab. |
| `/tools` | Browsing | required | Herramientas tab (empty state). |
| `/profile` | Browsing | required | Drill-down via header profile icon. NOT a tab. |
| `/progress` | Drill-down | required | Unchanged. Reached by tapping the progress card. |
| `/lesson/[slug]`, `/writing`, `/exam`, `/presentation` | Lesson mode | unchanged | No tab bar, no header icons. Only addition: recording banner (below). |
| `/` | Public | unchanged | Free story landing stays exactly as-is. |

## Architecture: shell component, not route group

Do NOT restructure existing routes into a Next.js route group. Create a presentation component:

```
src/components/shell/BrowsingShell.tsx
```

Props: `children`, `activeTab: "inicio" | "lecciones" | "herramientas" | null`, `title?: string`. It renders:

- **Header (sticky, 56px, `--paper-header`, backdrop blur):** left "Profe Kyle" (`label-sm`, `--text-secondary`); right: Profile icon only (Lucide `User`, 20px, `--text-muted`, 44×44 touch target, links to `/profile`). The News icon is omitted entirely until Noticias exists — no dead icon.
- **Content area:** `max-w-2xl` (672px) centered, `px-4`, `padding-bottom: 56px + env(safe-area-inset-bottom)`.
- **Tab bar (fixed bottom, 56px):** three tabs — Inicio (`Home`, → `/dashboard`), Lecciones (`BookOpen`, → `/lessons`), Herramientas (`LayoutGrid`, → `/tools`). Active tab: `--accent` text + small dot indicator above the label. Inactive: `--text-muted`. Labels `label-md` (Roboto Flex 14px 600).

Desktop: tab bar renders as a centered floating pill (480px max-width, 24px radius, 16px bottom margin) per DESIGN.md desktop rules. Header background fills full width; header content constrained to 672px.

Each browsing page is a server component that renders `<BrowsingShell activeTab="...">` around its content. Lesson-mode pages do not use BrowsingShell at all — the two navigation modes never overlap.

## Schema change (migration)

New file: `supabase/migrations/<timestamp>_dashboard_sessions.sql`

```sql
-- 1. Recording URL for class recordings (YouTube)
ALTER TABLE course_sessions
  ADD COLUMN IF NOT EXISTS recording_youtube_url text;

-- 2. Two live-only session types: Conversation (Class 4) and
--    Extreme Pronunciation (Class 2). These classes happen on Zoom;
--    the app tracks their schedule only — no lesson page exists.
ALTER TABLE course_sessions DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;
ALTER TABLE course_sessions ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN ('story', 'writing', 'exam', 'video_summary', 'presentation', 'conversation', 'pronunciation'));
```

**CHECK constraint pitfall (ADR 007 — the #1 migration error in this project):** the constraint name above is a guess. Before writing the final migration, query the real name:

```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'course_sessions'::regclass AND contype = 'c';
```

The recreated constraint must contain the FULL value list — every value the existing constraint allows, plus `conversation` and `pronunciation`. If the existing list differs from the five shown above, keep the existing values and add the two new ones. Never write a partial list.
- Update the `SessionRow` type in `src/lib/sessions.ts` and the `CourseSession` type in `src/types` (find the actual location via the `@/types` import) with `recordingYoutubeUrl?: string | null`.
- RLS: the column inherits the existing `course_sessions` policies. No new policies. Students can read it; only the teacher can write it (existing write policy covers this — verify, don't assume).

## Placeholder sessions (no new schema)

A **placeholder** is a `course_sessions` row where the session type and date are set but the content FK is null (`story_id`, `writing_prompt_id`, `exam_prompt_id`, `presentation_prompt_id` all null, as applicable to the type). Kyle creates the month's 8 session rows up front with types and dates, then attaches content as each lesson becomes ready.

Rules:
- Placeholder rows are NOT tappable. No chevron. (DESIGN.md: chevron only if the row is navigational.)
- When content is attached later, the row lights up automatically — no status flag to flip, the FK being non-null IS the ready signal.
- `session_link_token` may or may not exist on placeholders; irrelevant since they're not tappable.

## Live-only session types (conversation, pronunciation)

Two of Kyle's eight monthly classes have no app lesson page: **Conversation (Class 4, 4-4-4 method)** and **Extreme Pronunciation (Class 2 — its activities already live inside the story lesson as the dictado/coral/pronunciación steps)**. They are scheduled on Zoom; the app tracks their place in the month so the "Este mes" stack reads 1-8, and their class day gets the countdown card like any other.

Extend `src/lib/activities.ts`:
- `SessionType` union gains `"conversation" | "pronunciation"`; update `isSessionType()` and `sessionTypeLabel()` ("Conversación", "Pronunciación").
- `studentSessionPath()` must NOT produce a path for these types. Dashboard code passes `href: null` for them.

Add a `liveOnly: boolean` field to `DashboardLesson` and a `liveOnly` prop to LessonCard, computed as `sessionType === "conversation" || sessionType === "pronunciation"`. Live-only sessions keep the normal time-based lifecycle (their phase drives the countdown card) but their CARD rendering overrides:

| Phase | Live-only card |
|---|---|
| before class day | ○ hollow dot, "{typeLabel} · En vivo por Zoom · {date}", no chevron, not tappable. NOT 🔒 — 🔒 is reserved for placeholders awaiting content; live-only content never arrives. |
| live window | ● accent dot + pulse, "EN VIVO · por Zoom", still not tappable (no app page exists) |
| after | ✓ "Clase terminada · {date}", not tappable |

`getSessionLifecycle` in `session-phase.ts` does not need a new value for this — live-only is a rendering concern derived from session type, not a phase. Do not conflate the two axes.

Class-day card behavior for live-only sessions: countdown card renders normally ("La clase es HOY / Empieza en 3h 22m / Conversación"). At joinAt, instead of the terracotta join hero, render an INFO card (white surface, no button): "Conversación · Entra por Zoom — el link está en el chat de Zoom." After session end: "✓ Clase terminada · La grabación se subirá a YouTube pronto" (recording applies to live-only classes too — Kyle records every class).

## Session lifecycle & card status matrix

This is the core spec. One lesson card component, five visual states, computed server-side.

### Lifecycle states (per session, computed in the service layer)

| State | Condition | Card treatment | Tap |
|---|---|---|---|
| `placeholder` | content FK null | 🔒 `Lock` icon, type label, "Próximamente · {date}" in `--text-muted` | none |
| `upcoming` | content ready, now < joinAt (see below) | ○ hollow dot `--text-secondary`, "Sin empezar · {date}", chevron | opens lesson (preview/gated mode — existing `StoryAccessMessage` behavior) |
| `live` | joinAt ≤ now ≤ sessionEndTime | ● filled dot `--accent` with subtle pulse (CSS animation, `prefers-reduced-motion` respected), "EN VIVO · entra ahora", chevron | opens lesson directly |
| `after-pending` | now > sessionEndTime, `recording_youtube_url` null, completion signal absent or present | ✓ `Check` icon `--success`, type label + "Completada · {date}" — plus muted line "La grabación llega pronto" when no completion yet OR always show recording-pending line until URL exists | opens lesson (review mode) |
| `after-recorded` | now > sessionEndTime, `recording_youtube_url` set | ✓ `Check` `--success`, status line "Grabación disponible", chevron | opens lesson (review mode, banner inside) |

**joinAt = `session_start_time` minus 10 minutes.** Extend `src/lib/session-phase.ts`:

```ts
export const JOIN_LEAD_MINUTES = 10;

export function getSessionJoinTime(session: Pick<CourseSession, "sessionStartTime">): Date
// returns sessionStartTime - 10min

export type SessionLifecycle = "placeholder" | "upcoming" | "live" | "after";
export function getSessionLifecycle(session, hasContent: boolean, now = new Date()): SessionLifecycle
```

Keep the existing `getSessionPhase` export untouched — other code depends on it.

### Completion signal per session type (for the ✓ status and progress card count)

| session_type | Completed when |
|---|---|
| `story` | row in `user_progress` for this user + story with status completed (match what `/progress` already counts — reuse `loadStudentProgress` reading logic or its query) |
| `writing` | row in `writing_submissions` for this user + prompt |
| `exam` | the user's group exam has been submitted (check how `ExamSession` persists submission state; count the user's participation) |
| `video_summary` | row in `video_summary_free_writes` for this user + session |
| `presentation` | ≥1 row in `presentation_responses` for this user + session |
| `conversation` / `pronunciation` | **none in this slice** (live-only; the teacher manual-attendance feature will supply this later). `completed` is always `false` for them until then. |

**Graceful degradation (mandatory):** tables for `video_summary` and `presentation` may not exist yet in the database (Slices 54/56 are specced but unbuilt). Query them inside try/catch or check availability the same way `progress.ts` does. A missing table means "no completion signal" → treat as `upcoming`/`after-pending` based on time only. The dashboard must never throw or show an error state because an optional table is missing.

### LessonCard component

```
src/components/dashboard/LessonCard.tsx
```

Presentation-only. Props:

```ts
type LessonCardProps = {
  sessionType: SessionType;          // from src/lib/activities
  title: string | null;              // content title, or null for placeholder
  lifecycle: SessionLifecycle;       // from session-phase.ts
  completed: boolean;
  hasRecording: boolean;
  sessionDate: string;               // for "· 12 ago" / "· 26 ago"
  href: string | null;               // from studentSessionPath(); null for placeholder
};
```

- Row card: white surface, 1px `--paper-line` border, 16px radius, 12px padding, 8px gap between rows (DESIGN.md row-card spec).
- Icon by type (Lucide 20px): story `BookOpen`, writing `PenLine`, exam `FileText`, video_summary `Languages`, presentation `MonitorPlay`, conversation `MessagesSquare`, pronunciation `Mic`.
- Title: 16px Lora 600. Placeholder rows show the type label (`sessionTypeLabel()`) as the title instead.
- Status line: 12px Roboto Flex per the matrix above. Truncate long titles to one line with ellipsis; status line to one line.
- Whole card is a single tap target (`<Link>` when `href` non-null, `<div>` when null). NO expansion, NO secondary buttons, NO bottom sheets. The recording is mentioned in the status text only; the actual recording link lives inside the lesson page.
- Dates rendered via the existing `LocalDateTime` component (check its props) or a shared date formatter — respect the student's timezone.

## Inicio page (`/dashboard`)

Server component. Loads via a new service function (below). Section order:

1. **Greeting:** "Hola, {displayName}" (`headline-lg`, Lora 24px 700). Fall back to "Hola" if displayName is null (new students have no name). The greeting is the only Primary-weight text element on the page in normal state.

2. **Class-day card** (only when the student's course has a session whose date is today, student's local time):
   - **Before joinAt:** countdown card — small white card: "La clase es HOY" / "Empieza en 3h 22m" (`headline-md`, tabular-nums) / "{typeLabel} · {courseDisplayName}".
   - **joinAt → sessionEndTime:** JOIN HERO — full-width terracotta primary card with a large white "ENTRAR A LA CLASE ▶" button (this becomes the page's focal point; greeting stays but the hero wins by color and size), type label + course name below.
   - **After sessionEndTime, same day, no recording:** small moss-green card: "✓ Clase terminada · La grabación se subirá a YouTube pronto".
   - Implemented as ONE client component (below) receiving `sessionStartTime`, `sessionEndTime`, `href`, labels — it ticks locally and swaps its own content. The server decides only whether to render it at all (is there a session dated today?) and the initial state.
   - On non-class days: no card. Do not render an empty slot.

3. **Progress card:** white surface, `--paper-line` border, 24px radius, 16px padding. Course display name (`label-md`), "Clases completadas: {n} de {total}" (`label-md`, `--text-secondary`), 4px progress bar (`--accent` fill, `--paper-line` track). `{total}` = number of sessions in the active course (placeholders and live-only rows included — the month is always an 8-session arc). `{n}` = sessions with a completion signal per the matrix below. **Live-only sessions (conversation, pronunciation) have no completion signal until the teacher-attendance feature ships — they count toward `{total}` but can never count toward `{n}` in this slice.** That is accepted and intentional; the attendance feature (teacher dashboard, later slice) will supply their completion. Entire card is a `<Link>` to `/progress`.

4. **"Este mes"** (`headline-md`, Lora 18px 600; 24px gap above, 16px below): the full lesson stack for the active course, ordered by `session_start_time` ascending — lessons 1–8, placeholders included. All LessonCards. This IS the dashboard's main content: a stack of 8 rows, one per class of the month.

5. **"Práctica reciente"** (`headline-md`, 32px above / 16px below): plain text line, no cards — e.g. "Dictado: 2 intentos · Palabras: 47 · Pronunciación: 1 sesión". Data from `loadStudentProgress()`. If everything is zero, omit the section entirely (new students see nothing here, not a line of zeros).

6. **No upsell card.** The consumer tier doesn't exist; classroom students are paying. Do not render it.

7. Bottom padding for the tab bar (handled by BrowsingShell).

**Empty state (enrolled student, course exists, zero sessions):** BookOpen icon 48px `--text-muted` + "Tu profe todavía no ha publicado las clases de este mes." centered.

**No-course state (student with no enrollment):** same icon + "Aún no estás en un grupo. Tu profe te enviará un enlace." No progress card, no lesson stack.

## Lecciones page (`/lessons`)

Server component inside BrowsingShell (`activeTab="lecciones"`):

1. Title "Lecciones" (`headline-lg`).
2. Filter chips (pill-shaped, `label-sm`, 8px gap): Todos / Historias / Escritura / Exámenes / Traducción / Presentación / En vivo. Active chip: `--accent` background, white text. Inactive: transparent, `--paper-line` border. "En vivo" filters to the live-only types (conversation, pronunciation). Filtering is client-side over the already-loaded list (a month is ~8 rows; no server round-trip). Implement chips + list in a small client component receiving the serialized lesson rows.
3. Group heading per course month ("AGOSTO — NIÑERA", `label-sm` uppercase `--text-muted`) when the student has sessions from more than one course; omit the heading when there is exactly one active course (Inicio already names it).
4. Same LessonCard rows, ALL sessions (current course first, then older courses below, newest course first).
5. "Cargar más" button (secondary style) after 12 rows if more exist. No infinite scroll.
6. Empty state per DESIGN.md.

## Herramientas page (`/tools`)

Title "Herramientas" (`headline-lg`) + centered empty state: `LayoutGrid` icon 48px `--text-muted`, "Próximamente: la biblioteca de sonidos del Profe Kyle." Nothing else. Do not build the sounds grid.

## Perfil page (`/profile`)

Per DESIGN.md Perfil layout: title "Perfil", account card (display name read-only, email, subscription status dot: "Activa" `--success` when `subscription_status` is active, else "Expirada" `--error`), logout button (secondary, full-width, `LogOut` icon + "Cerrar sesión" — reuse the existing `signOut` server action from the current `/dashboard/actions.ts`; move that file if the route changes ownership, but keep the action working). Back navigation: reuse `BackLink`. No stats.

## Service layer

New file: `src/lib/dashboard.ts` (follow the flat `src/lib/*.ts` convention — the `src/lib/services/` directory does not exist in this codebase; do not create it).

```ts
export type DashboardLesson = {
  sessionId: string;
  sessionType: SessionType;
  title: string | null;          // story.title / prompt title, null for placeholder
  lifecycle: SessionLifecycle;
  completed: boolean;
  hasRecording: boolean;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  href: string | null;           // studentSessionPath(); null for placeholder
};

export type DashboardData = {
  displayName: string | null;
  courseDisplayName: string | null;
  lessons: DashboardLesson[];              // active course, ordered by start time
  olderCourses: { displayName: string; lessons: DashboardLesson[] }[];
  totals: { completed: number; total: number };
  todaySession: DashboardLesson | null;    // session dated today (student tz) for the countdown card, null otherwise
  practice: { dictationAttempts: number; wordsLookedUp: number; pronunciationSessions: number };
};

export async function loadDashboard(supabase, userId, classroomLevel): Promise<DashboardData>
```

- Compose existing queries in parallel (`Promise.all`) the way `progress.ts` does. Reuse `loadStudentProgress` for the practice line and story completion where possible; do not duplicate its queries.
- Join sessions → course content titles (story title, writing prompt title, exam prompt title) to populate `title`.
- Same try/catch graceful-degradation contract as `progress.ts`: any missing optional table yields empty data, never a throw.
- Page components are server components that call `loadDashboard` and pass plain serializable props down. LessonCard, chips, and countdown receive data — they never query.

## CountdownCard / JoinHero client component

```
src/components/dashboard/ClassDayCard.tsx  ("use client")
```

- Receives `sessionStartTime`, `sessionEndTime` (ISO strings), `href`, `typeLabel`, `courseName`, and the server-computed `initialPhase` ("countdown" | "join" | "done-pending").
- A single `setInterval` at 1000ms updates a `now` state ONLY while mounted and phase ≠ "done-pending"; it clears itself once the phase reaches "done-pending". No polling of the server, no Realtime, no re-fetch.
- Phase transitions computed locally: now ≥ joinTime (start − 10min) → join hero; now > endTime → done-pending card.
- Countdown format: "3h 22m" above one hour, "22m 05s" under one hour (tabular-nums).
- The join hero button is an `<a href>` (or `router.push`) to the lesson — a plain navigation, no client-side access checks; the lesson page enforces access as it does today.
- If JS fails/hydrates late, the server-rendered `initialPhase` content is already correct for page load. The component only improves from there.
- Respect `prefers-reduced-motion` for the live-dot pulse.

## Recording banner (lesson pages)

```
src/components/lesson/RecordingBanner.tsx  (server-rendered, presentation-only)
```

Props: `youtubeUrl: string`. Renders a white card, `--paper-line` border, 16px radius, containing a terracotta play icon (`Play` in a circle) + "Ver la grabación de la clase" + "(YouTube)" in `--text-muted`. Links to the URL with `target="_blank" rel="noopener"`.

Placement: at the top of the lesson content area (below the lesson header/subheader, above the steps/tasks), rendered ONLY when:
- the session phase is `after` (window closed), AND
- `recording_youtube_url` is non-null.

Add it to the three lesson pages that exist today: `/lesson/[slug]`, `/writing`, `/exam`. Each already resolves its session; pass the URL through. (`/presentation` gets it when Slice 56 is built — the component is ready and reusable; do not build the presentation page here.)

Do NOT show the banner during the live window even if a URL was pasted early.

## Teacher changes (minimal)

1. In the new `/dashboard`: if `profile.role === "teacher"`, `redirect("/teacher")`.
2. Move `InviteStudentForm` (+ its heading/copy) and the "Estudiantes de clase" list into `/teacher` (`src/app/teacher/page.tsx`), preserving the existing copy and the `RemoveStudentButton` behavior. Also move `signOut` usage so the teacher can still log out (the `/teacher` page or its header must retain a Cerrar sesión path — check what `/teacher` currently has and don't duplicate).
3. `src/app/dashboard/actions.ts` keeps the `signOut` action (still used by `/profile` and wherever the teacher logout lands).
4. Delete the old student placeholder branch ("Ya estás adentro…") entirely.

## DESIGN.md amendments (update DESIGN.md in the same commit)

Add to the "Inicio (Dashboard)" and "Navigation Architecture" sections:

- Class-day card spec (countdown card / join hero / done-pending card) — the join hero becomes the focal point on class days between T-10min and session end.
- Lesson row lifecycle states: placeholder (🔒, non-tappable, no chevron), upcoming (○), live (● accent pulse), after-pending (✓ + "La grabación llega pronto"), after-recorded (✓ + "Grabación disponible").
- Filter chip list for Lecciones updated to six chips: Todos / Historias / Escritura / Exámenes / Traducción / Presentación.
- Recording banner spec (lesson pages, after-phase only).
- Header in browsing mode: Profile icon only; News icon deferred until Noticias ships.
- "Este mes" replaces "Esta semana" as the Inicio section heading (the course is a monthly 8-session arc, not a week).

Also update PRD Section 8 / the Slice table if it references "Esta semana" — keep docs in sync per the project's sync rule.

## Acceptance criteria

1. `npx tsc --noEmit` passes. `npx next build` passes. Verify BEFORE any push (ADR: broken pushes leave Vercel serving stale code for hours).
2. At 375px: tab bar 56px fixed, no content hidden behind it, lesson rows single-line-truncated, countdown/join hero full-width, no horizontal scroll.
3. At 1440px: content column 672px centered, tab bar is the floating pill, no sidebars, no multi-column dashboard.
4. Lesson-mode pages (`/lesson/*`, `/writing`, `/exam`) show NO tab bar and NO browsing header. The two modes never overlap.
5. A placeholder session (null content FK) renders non-tappable with 🔒 and no chevron. Attaching content (manually set a `story_id` in the DB) makes the row tappable on next load without any other change.
6. A `conversation` or `pronunciation` session renders with ○ / ● / ✓ per phase, "En vivo por Zoom" status text, no chevron, never tappable — in ALL phases including live. Its class day still produces the countdown card, and at joinAt the info card (no join button) instead of the hero.
7. At T-10min the countdown card flips to the join hero without a page refresh; at session end it flips to the done-pending card without a refresh.
8. With `recording_youtube_url` set and the window closed, the lesson page shows the banner; during the live window it does not.
9. Missing `video_summary_free_writes` / `presentation_responses` tables do not break the dashboard (simulate by pointing at a DB without them or by verifying the try/catch paths — do not remove error handling to "fix" a type error).
10. Teacher visiting `/dashboard` lands on `/teacher`, and the invite form + roster still work there.
11. All colors/typography via existing tokens (`bg-paper`, `text-text-primary`, `rounded-card`, etc.). No hardcoded hex, no Material Design 3 token names, no shadows except sticky elements.
12. New/updated UI strings in Spanish, matching the register of existing pages ("Tu profe", informal tú).
13. The free story at `/` is untouched.

## Known pitfalls (from project history — do not repeat)

- **CHECK constraints:** if any migration you write touches an enum-like column's allowed values, you must drop and recreate the constraint with the FULL value list (ADR 007). This slice should add no enum values — if you think you need one, stop and re-read the spec.
- **Partial commits:** if you commit a page that imports a new service function, commit the service in the same push. The 2026-08-31 Vercel outage was exactly this.
- **Components must not query Supabase** (`.cursorrules` service-layer rule). If you find yourself importing `createClient` into a component, stop.
- **Timezones:** `session_start_time` is stored as timestamptz. "Today" and countdown math must run against the student's local clock (the client component's `new Date()` is already local — that's correct; server-side "is there a session today" should use the session date fields consistently with how the teacher dashboard displays them).

## Decisions review (mandatory, per .cursorrules)

When finished, before committing, answer: "While working on this, which important decisions or choices did you make that you are not confident about?" List them for Kyle. Pay special attention to: the completion-signal queries per session type (especially exam), anything you changed in `/teacher`, and how you handled the missing-table degradation.
