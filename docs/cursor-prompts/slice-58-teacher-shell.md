# Cursor Prompt: Build Slice 58 — Teacher Dashboard Shell (3-Column Desktop Layout + Re-Skin)

## Context

Read these files before starting:

- `DESIGN.md` — the source of truth for all visual decisions. **Read the new "Teacher Dashboard (`/teacher/*`)" section in full — it is the spec for this slice.** Also read "Core Principle: One Layout, Not Two" to understand the scoped exception: the teacher dashboard is desktop-first 3-column; the student app stays mobile-first single-column. These two layout systems never mix.
- `.cursorrules` — follow all rules, especially: build verification before push (`npx tsc --noEmit` or `npx next build`), service layer separation (components are presentation-only; data access in `src/lib/`), and the decisions review at the end.
- `src/app/teacher/page.tsx` — current teacher home (course list + create course form + invite student form + student list, all on one page, all in generic gray Tailwind classes). This slice restructures and re-skins it.
- `src/app/teacher/classes/[id]/page.tsx` — course detail (roster, sessions).
- `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — session detail (word lookups, comprehension answers, reveal countdown, "Desbloquear ahora").
- `src/app/teacher/classes/[id]/students/[studentId]/page.tsx` — student detail.
- `src/lib/teacher.ts` — existing teacher helpers (`loadSessionsForCourses`, `pickCurrentSession`, `countActiveStudentsByCourse`, `sessionTitle`, labels). Extend this file for new queries; do not duplicate its logic.
- `src/lib/auth-server.ts` — `requireTeacher()`, `getClassroomStudents()`.
- `src/app/dashboard/page.tsx` and the BrowsingShell from Slice 57 — understand how the student shell works so you can guarantee the teacher shell never renders inside it and vice versa.

**Slice 57 dependency:** this slice assumes Slice 57 (student dashboard shell) is merged. If it isn't yet, the only hard dependency is that teacher routes must not render the student bottom tab bar / BrowsingShell. Verify whichever way the code stands.

## What to build

The teacher-facing shell and a full re-skin of the existing teacher pages. **No new features in this slice** — the data shown is the data that exists today, reorganized into the new information architecture and restyled to DESIGN.md tokens.

1. **TeacherShell** — the desktop-first 3-column layout that wraps every `/teacher/*` route (details below).
2. **Left rail nav** — persistent across all teacher pages: Este mes, Grupos, Estudiantes, Analíticas, Contenido (disabled).
3. **Route restructure:**
   - `/teacher` → **Este mes** (current-month group cards)
   - `/teacher/groups` → **Grupos** (all courses, current first, archived under "Meses anteriores")
   - `/teacher/students` → **Estudiantes** (global roster + invite form, moved off `/teacher`)
   - `/teacher/analytics` → **Analíticas** (calm "Próximamente" empty state — the aggregation query ships in a later slice; the rail item exists now so the nav never has to be retrofitted, same pattern as Herramientas in Slice 57)
4. **Re-skin** all existing teacher pages (course detail, session detail, student detail) from generic gray Tailwind to DESIGN.md tokens, rendered inside the shell.
5. **"Nuevo mes" affordance** — on Este mes, when no course exists for the current calendar month: empty state "Próximo mes en preparación" + a "Nuevo mes" button. In this slice the button opens the EXISTING `CreateCourseForm` (unchanged behavior). The real generator ships in Slice 60.

**Out of scope (do NOT build):** manual attendance UI (Slice 59), recording URL paste-box (Slice 59), the nuevo-mes generator wizard (Slice 60), `courses.theme` column and theme editing (Slice 60), the palabras-más-consultadas aggregation query (later slice — Analíticas is a stub), the "Ver app como estudiante" preview (needs a role-bypass mechanism — deferred; rail bottom shows teacher name/email only), the content editor / Slice 55 (Contenido rail item stays disabled), any Zoom/Meet/Teams integration, any YouTube auto-populate integration, any changes to student-facing routes or lesson behavior, any schema changes (this slice needs none — `courses.archived` already exists).

## The shell

Per DESIGN.md "Teacher Dashboard → Shell". Summary of the binding decisions:

```
┌────────────┬──────────────────────────────┬───────────────┐
│ Left rail  │        Center                │ Right panel   │
│ fixed 240px│        fluid, min-w-0        │ 360px,        │
│ white,     │        24px h-padding,       │ collapsible   │
│ border-r   │        max-w 960px content   │ white,        │
│ paper-line │                              │ border-l      │
└────────────┴──────────────────────────────┴───────────────┘
```

- Full viewport height. The shell columns scroll independently (center scrolls; rail is static).
- **No student chrome on teacher routes:** the Slice 57 BrowsingShell (sticky header + bottom tab bar) must NOT render on `/teacher/*`. Implement the teacher shell as its own layout file: `src/app/teacher/layout.tsx` rendering `TeacherShell`, with the same auth gate (`requireTeacher`) hoisted into it so individual pages don't each call it.
- **Right panel:** in this slice most pages don't need it — when a page provides no panel content, the center column takes the full remaining width (panel hidden, not empty-bordered). The panel slot exists and is exercised by at least one page: on **Este mes**, selecting a group card shows its next class details (date/time, type label, content status) in the panel. The attendance grid + recording paste-box arrive in Slice 59 and will live here — build the panel so adding content slots later is trivial.
- **Responsive degradation:** < 1280px: right panel becomes a slide-over sheet. < 1024px: rail collapses to icon-only 64px. < 600px: rail becomes a top bar with menu button opening a full-screen nav sheet. Usable, not optimized — Kyle is on desktop.

### Left rail

- Items (top→bottom): **Este mes** (`/teacher`, icon `home`), **Grupos** (`/teacher/groups`, icon `users`), **Estudiantes** (`/teacher/students`, icon `search`), **Analíticas** (`/teacher/analytics`, icon `bar-chart-3`), **Contenido** (no href, icon `book-open`, disabled state: `--text-muted`, tooltip/label "Próximamente").
- Active item: `--surface-hover` background + terracotta accent (3px left edge or terracotta text — pick one, be consistent).
- Rail bottom: teacher display name + email (`label-sm`, `--text-secondary`).
- UI language: Spanish throughout.
- Top of rail: small "Profe Kyle" wordmark or app name in Lora (`label-lg`) — links to `/teacher`.

### Visual language

Same Paper Light theme and tokens as the student app. White cards on `--paper` background, 1px `--paper-line` borders, no shadows (tonal elevation). Lora for page titles/headlines, Roboto Flex for UI labels. Buttons: rounded-rectangle 16px — **the pill shape stays reserved for lesson step nav and must not appear here**. 44px touch targets. Replace every instance of the old palette (`text-gray-900`, `text-gray-600`, `text-gray-500`, `border-gray-100`, `bg-gray-50`, `divide-gray-100`) in teacher files with the corresponding token classes.

## Page specs

### `/teacher` — Este mes

- Determines the current calendar month. Finds courses (groups) whose sessions fall in this month (a course belongs to "this month" if any of its sessions' `session_start_time` is in the current calendar month; fall back to `created_at` month if a course has no sessions).
- **One card per group** (not per session): group name, level label (`courseLevelLabel`), day/time pattern derived from its sessions (e.g., "Mar y Jue · 18:00"), active student count (`countActiveStudentsByCourse`), next upcoming class (type label via `currentSessionKindLabel` + `sessionTitle` + `LocalDateTime`), readiness summary "N/8 clases listas" (a session counts as "lista" when it has its content FK assigned — `story_id`, `writing_prompt_id`, `exam_prompt_id`, `presentation_prompt_id`, etc., matching what `loadSessionsForCourses` already returns).
- Clicking a card → drills into `/teacher/classes/[id]` (the existing course detail page, re-skinned). Selecting a card (click vs. navigate: use a subtle select affordance, e.g. a chevron row inside the card navigates; the card body selects) populates the right panel with the next class details.
- **Empty state:** no course this month → centered card: "Próximo mes en preparación" + subtext + "Nuevo mes" primary button → opens existing `CreateCourseForm` (can render in a modal or swap into the center column).
- The invite-student form and global student list MOVE OUT of this page to `/teacher/students`. This page is groups-only now.

### `/teacher/groups` — Grupos

- All courses for this teacher: current/unarchived first (newest first), then "Meses anteriores" section (archived, newest first).
- Row: group name, level label, month (derived from sessions or created_at), student count, next/last class date. Click → `/teacher/classes/[id]`.
- Archived courses are browsable — their detail pages render normally inside the shell (existing behavior; sessions/recordings/review mode all keep working for students — nothing about display changes student access).

### `/teacher/students` — Estudiantes

- Search input (client-side filter is fine at current scale): filters by display name or email.
- List: display name, email, current group name (derive from active enrollments via `getClassroomStudents` + enrollment data — extend `src/lib/teacher.ts` if needed).
- Click a student → their existing student detail page (`/teacher/classes/[id]/students/[studentId]` — keep the current route; if a student belongs to multiple courses prefer the active one).
- Below the list: the existing "Invitar estudiante" section (`InviteStudentForm`) with its current explanatory copy, and the existing `RemoveStudentButton` behavior on each row (keep the current caveats copy about ThriveCart/PayPal).
- The WPM/writing-history enrichment of this card ships later — do not build it now.

### `/teacher/analytics` — Analíticas

- Calm empty state per DESIGN.md empty-state specs: `bar-chart-3` icon, "Analíticas", "Próximamente: las palabras más consultadas por mes y nivel." Nothing interactive.

### Re-skinned existing pages (course detail, session detail, student detail)

- Wrap in TeacherShell via the layout file; convert to tokens; keep ALL existing functionality untouched: roster management, move-student button, session list, word lookup aggregation ("Palabras más consultadas" per session stays where it is — the global Analíticas aggregation is separate and later), comprehension/personal response viewing, reveal countdown + "Desbloquear ahora", writing submission links, exam review links.
- On the course detail page, render sessions in month order as a vertical list (this becomes the 8-class strip in Slice 59 — structure the row component so it can gain selection → right-panel behavior later).
- Session detail: no layout change beyond tokens + shell. The `openedLabel` union stays as-is.

## Files to create / modify

**Create:**
- `src/app/teacher/layout.tsx` — TeacherShell + `requireTeacher` gate
- `src/components/teacher/TeacherShell.tsx` — the 3-column shell (rail + center slot + optional right panel slot)
- `src/components/teacher/TeacherNav.tsx` — left rail nav with active-state detection (`usePathname`)
- `src/components/teacher/ContextPanel.tsx` — right panel (and its slide-over variant < 1280px)
- `src/app/teacher/groups/page.tsx`
- `src/app/teacher/students/page.tsx`
- `src/app/teacher/analytics/page.tsx`

**Modify:**
- `src/app/teacher/page.tsx` — becomes Este mes (groups-only; invite/student list removed — they move to `/teacher/students`)
- `src/app/teacher/classes/[id]/page.tsx` — tokens + shell integration
- `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — tokens only (shell comes from layout)
- `src/app/teacher/classes/[id]/students/[studentId]/page.tsx` — tokens only
- `src/lib/teacher.ts` — extend with: current-month course resolution, day/time pattern derivation, readiness count, student→current-group mapping
- Any shared components these pages import that render teacher-only UI (e.g. `CreateCourseForm`, `InviteStudentForm`, `RemoveStudentButton`) — re-skin to tokens; do NOT change their behavior.

**Do not touch:** student routes (`/dashboard`, `/lessons`, `/tools`, `/profile`, lesson pages), `src/lib/session-phase.ts`, `src/lib/progress.ts`, exam/writing student components.

## Data notes

- No schema changes. `courses.archived` exists. All queries are reads over existing tables (`courses`, `course_sessions`, `course_enrollments`, `profiles`/users).
- Follow the existing graceful-degradation pattern from `src/lib/progress.ts` where sensible: missing/empty data renders empty states, not thrown errors.
- RLS already scopes everything to `teacher_id` — keep using the user-scoped server client (`createClient` from `src/lib/supabase/server`), never a service-role client in these pages.

## Acceptance criteria

1. Every `/teacher/*` route renders inside TeacherShell: left rail always visible and identical, active item highlighted per route.
2. The student BrowsingShell (header + bottom tab bar) never renders on teacher routes; the teacher rail never renders on student routes.
3. Center column content is capped at 960px; no teacher page uses the old 672px `max-w-2xl` constraint or any `text-gray-*`/`border-gray-*` classes.
4. Right panel appears only where specified (Este mes selection); elsewhere center takes full width with no empty panel border. Below 1280px the panel becomes a slide-over; below 1024px the rail is icon-only; below 600px the rail is a top-bar menu sheet.
5. `/teacher` (Este mes) shows one card per current-month group with readiness "N/8 clases listas", and the "Próximo mes en preparación" empty state + Nuevo mes button (→ existing CreateCourseForm) when no current-month course exists.
6. `/teacher/groups` lists unarchived courses first, archived under "Meses anteriores"; archived course detail pages remain fully browsable.
7. `/teacher/students` has working client-side search over name/email, shows each student's current group, links to student detail, and hosts the invite form + remove buttons with behavior unchanged.
8. `/teacher/analytics` renders the "Próximamente" stub.
9. All existing teacher functionality is preserved: session detail word lookups + reveal controls, roster move-student, writing/exam review links, student detail view.
10. Contenido rail item is visibly disabled with "Próximamente".
11. `npx tsc --noEmit` and `npx next build` pass. Verify the build BEFORE any push (Vercel serves stale code on broken builds).
12. No changes to any student-facing route, component behavior, or database schema.

## Where this is headed (reference — do NOT build in this slice)

- **Slice 59 — Attendance + recordings:** manual attendance override for ALL session types (binary asistió/no asistió, "auto" marker for link-click pre-fills, auto-save checkbox grid in the right context panel); recording YouTube URL paste-box per session (writes `course_sessions.recording_youtube_url` from Slice 57's migration); the course-detail session list becomes the selectable 8-class strip feeding the right panel.
- **Slice 60 — Nuevo mes generator:** wizard (level → month → weekly pattern with day-of-week per group and time, pre-filled from last month, flexible enough for 2/week, 4/week, or Saturday-only cadences) generating the fixed 8-row template with correct session types per level (pre-int: video_summary at Class 3; int: presentation); `courses.theme` nullable column, editable post-hoc; Grupos becomes the browsable theme archive; auto-archive of the previous month on generation; multiple groups generatable in one sitting but independently.
- **Later:** Analíticas real aggregation (palabras más consultadas per month per level from `word_lookups`), Estudiantes card enrichment (WPM trend), "Ver app como estudiante" preview, content editor (Slice 55), YouTube/Zoom integrations.

## Decisions review

When finished, before committing: list any decisions you made that you are not confident about (component boundaries, the select-vs-navigate affordance on group cards, slide-over implementation, month-resolution edge cases like a course whose sessions span two months). Surface them for Kyle's review.
