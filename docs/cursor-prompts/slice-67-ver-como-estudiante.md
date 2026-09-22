# Cursor Prompt: Build Slice 67 — Ver como estudiante (Read-Only Student Preview)

## Context

Read these files before starting:

- `.cursorrules` — all rules. Build verification before push (`npx tsc --noEmit` / `npx next build`), service layer separation, decisions review at the end.
- `DESIGN.md` — "Teacher Dashboard" section already specifies the rail-bottom "Ver app como estudiante" link. This slice delivers it. Paper Light tokens throughout.
- `src/lib/browsing-auth.ts` — `requireBrowsingStudent()` currently redirects teachers to `/teacher`. This is the main browsing-page gate you will extend.
- `src/lib/sessions.ts` — `loadSessionAccess()` / `resolveSessionAccess()`: the `role === "teacher"` branch (read-only, `allowReveal: true`, `saveResponses: false`) and the student branch (enrollment via `enrollClassroomStudent`, `recordSessionAttendance`, `classroomStudentCanAccessSession`, `allowReveal` per phase). This is the main lesson-page logic you will extend.
- `src/app/dashboard/page.tsx` — uses `requireBrowsingStudent` + `loadDashboard(supabase, user.id, profile?.classroomLevel ?? null, displayName)`.
- `src/app/lesson/[slug]/page.tsx` — `const isTeacher = profile?.role === "teacher"` and its downstream branches (`skipFlags`, teacher pacing controls, Slice 65 pronunciation gate).
- `src/components/shell/BrowsingShell.tsx` — browsing-mode chrome (header + tab bar).
- The shared lesson header chrome (from the Slice 55 commit) — lesson-mode pages use this, not BrowsingShell.
- `src/lib/auth-server.ts` — `requireTeacher()`, `getProfile()`.

**No schema changes in this slice.** The mechanism is a cookie plus role-branch logic. If you find yourself wanting a migration, stop and surface it in the decisions review.

## The problem

Kyle can only see student pages through an incognito window with a student login. He wants to click one button and see exactly what students see — including the things students see that teachers don't (Slice 65 pronunciation gate, step-locking, "Discutir en clase" instead of inputs, reveal timing) — without polluting real class data (attendance, responses, word-lookup analytics) or accidentally firing teacher controls (pacing, timers, video sync).

## Design: session-scoped preview cookie

**Cookie:** `pk_student_preview`, value = `'intermediate'` or `'pre-intermediate'` (exact level strings from the courses table). `httpOnly`, `sameSite=lax`, `secure` in production, **no maxAge (session cookie — dies with the browser close, so a forgotten preview can't linger)**. `path=/`.

**Consulted ONLY when the authenticated user's role is `teacher`.** A student with this cookie (impossible via UI, possible via devtools) must see zero behavioral difference — never read the cookie outside teacher branches. Never render the preview banner for non-teachers.

**Server actions** (in a new `src/app/teacher/preview/actions.ts`, following the existing action patterns — `requireTeacher()` gate, typed results):
- `enterStudentPreview(level)` — sets the cookie, redirects to `/dashboard`.
- `exitStudentPreview()` — clears the cookie, redirects to `/teacher`.

## What to build

### 1. Entry: `/teacher/preview` (inside TeacherShell)

A calm interstitial page: title "Ver como estudiante", one paragraph explaining what preview is ("Ves exactamente lo que ven tus estudiantes: las mismas puertas, los mismos candados. Solo lectura: nada se guarda, nadie queda marcado presente."), then two big buttons — **Intermedio** and **Pre-intermedio** — each calling `enterStudentPreview(level)`. Link to this page from the rail bottom (per DESIGN.md: below teacher name/email), label "Ver app como estudiante".

### 2. Exit: preview banner on every student page

`StudentPreviewBanner` component: sticky top bar, distinct but on-theme (moss `--success` background or terracotta — pick what reads as "notice" against Paper Light; not red), text "Vista de estudiante · solo lectura" + level label + button "Volver al panel" (calls `exitStudentPreview`).

Rendered by: `BrowsingShell` (covers Inicio, Lecciones, Herramientas, Perfil) AND the lesson-mode pages (`/lesson/[slug]`, `/writing`, `/exam`, `/conversation`, `/presentation`) — hook it into the shared lesson header chrome so all lesson pages get it in one place. Server-side detection (read the cookie in the server component / shell), no client flicker. The banner must not overlap or break sticky headers — it pushes content down.

### 3. Browsing pages: `requireBrowsingStudent` extension

When the user is a teacher AND the preview cookie is set: do NOT redirect to `/teacher`. Return the normal context PLUS `{ preview: { level } }` (derive `classroomLevel` = cookie level). Pages then:

- `/dashboard` — pass preview level to `loadDashboard` as the classroom level. The teacher's own practice stats (word lookups, dictation attempts, pronunciation) will show 0 — that is expected and correct for a preview; do not fake data.
- `/lessons` — student lesson list for that level's current course.
- `/progress`, `/profile` — render student views with the teacher's own (empty/own) data. Profile shows the teacher's real email — fine.

### 4. Lesson pages: preview takes the STUDENT path

In `loadSessionAccess` (or `resolveSessionAccess`), when the user is a teacher AND preview cookie is set, resolve access as a student WOULD, with these preview overrides:

- **Skip** `enrollClassroomStudent` (never enroll the teacher into a course — the roster must not show the teacher).
- **Skip** `recordSessionAttendance` (never mark attendance).
- **Skip** `classroomStudentCanAccessSession` (the teacher isn't enrolled; preview bypasses the subscription check).
- **Apply student gating faithfully:** `allowReveal` per phase (not the teacher's `true`), the Slice 65 pronunciation gate (dictado/coral/pronunciación hidden until the pronunciation session's start time — this is exactly what Kyle wants to verify), step-locking to `lesson_step_current` in live mode, "Discutir en clase" renderings, flex-slot student rendering ("El profe está preparando esta clase.").
- `saveResponses: false` — all student write actions disabled (below).

The `isTeacher` computation in lesson pages becomes `role === "teacher" && !previewActive` — so preview suppresses teacher controls (pacing pills, flag tools ⌘B/⌘U, teacher answer textareas, "Iniciar tarea de escribir", video sync writes, "Desbloquear ahora", Abrir todas/Bloquear pasos, teacher-only collapsibles like the English original). The preview shows the student's side of every teacher/student fork in the codebase.

### 5. Student write paths: render, disable, explain

Every student write action renders but is disabled in preview, with the banner carrying the explanation (no per-input nagging). Inventory to cover:

- Comprehension responses (textareas + submit)
- Personal questions (textareas + AI feedback submit)
- Dictation + choral practice submissions/completions
- Song lyric blanks (worksheet inputs + Entregar respuestas)
- Writing submission + textarea (and never start the timer)
- Exam join/group formation/answers
- Presentation responses
- Video summary free write textarea
- "No entendí" word-flag requests
- Word-lookup **logging** (tooltips still open and show translations — but do not insert `word_lookups` rows, or Analíticas gets polluted by Kyle's browsing; the tooltip component needs a preview-aware code path for its logging side-effect only)

Realtime subscriptions stay ACTIVE (reading pace, round state, video position, teacher answers appearing) — that's the point: preview shows the live class as students experience it.

## Edge cases (spec-level, all must work)

1. **Preview with no course that month:** student empty states render ("próximo mes en preparación" style). This is a feature — Kyle tests what students see before generating a month.
2. **Preview + session deep link:** Kyle copies a student session link from the strip and opens it with the cookie set → renders student mode for that session, same rules.
3. **Two-tab live check (the critical test):** tab 1 = teacher pacing the lesson (pills, reveal); tab 2 = student preview of the same session. Tab 2 follows tab 1 in Realtime: steps advance, teacher-typed answers appear, reveal status updates. Tab 2 can never act.
4. **Preview during conversation class:** round counter + countdown + questions render; no writes exist there anyway; attendance never marks.
5. **Preview on `/teacher/*` routes:** the cookie is ignored entirely — teacher routes are unaffected. Banner does not appear there.
6. **Real student with the cookie:** no visible change (cookie only consulted in teacher branches). Banner never renders for them.
7. **Expired preview cookie (browser restarted):** gone — teacher lands on `/teacher` as usual.

## Out of scope (do NOT build)

- Per-student impersonation ("see what Cristina sees" — v1 is a generic level preview, not per-student data).
- Consumer/free-story preview modes (`/sample`, `/free-story` untouched).
- Any preview of teacher routes, any preview persistence beyond the browser session, any DB writes (no schema changes).
- Editing anything from preview mode (read-only, period).

## Acceptance criteria

1. From the teacher rail: "Ver app como estudiante" → `/teacher/preview` → pick a level → lands on `/dashboard` in student mode with the banner; everything the student sees renders (progress card, lesson stack, class-day card).
2. Banner appears on every student page (browsing + lesson chrome) while preview is active; "Volver al panel" clears the cookie and returns to `/teacher`.
3. Closing the browser kills preview; reopening lands the teacher back on `/teacher` normally.
4. Lesson page in preview: student gating faithful — Slice 65 gate applies, step-locking applies live, reveal follows phase rules, teacher controls absent.
5. Two-tab live test passes (edge case 3).
6. Zero DB writes from a full preview session: open dashboard, open a lesson, tap 10 words, type in comprehension/song/writing inputs (all disabled), watch Realtime — then verify in Supabase that `session_attendance`, `comprehension_responses`, `word_lookups`, `song_lyric_attempts`, `writing_submissions`, `word_flag_requests` gained no rows from the teacher's user_id.
7. No auto-enrollment: the teacher's user_id never appears in `course_enrollments` after previewing.
8. A real student with a forged cookie experiences no difference.
9. Teacher routes render identically with and without the cookie.
10. Spanish UI, Paper Light tokens, TeacherShell for the interstitial; `npx tsc --noEmit` + `npx next build` pass BEFORE any push.

## Test path (before committing)

1. As teacher: enter preview (intermediate), walk `/dashboard` → `/lessons` → open a live-ish session link → verify banner everywhere, no teacher controls.
2. Verify acceptance #6's no-write guarantee against Supabase (row counts before/after).
3. Two-tab Realtime check on a teacher-paced lesson (music or presentation are the richest).
4. Exit via banner → confirm cookie gone, back on `/teacher`.
5. Build, then commit.

## Plan review decisions

Recorded 2026-09-22 before the build:

- **Cookie vs two tabs:** Keep the session cookie. Chrome for teaching and another browser for preview is the intended QA path. Preview is for checking a lesson before class, not simultaneous teach-and-preview in the same browser window. Same-browser two-tab teacher+preview is impossible with one session cookie; accepted.
- **Exam preview:** Generic level preview cannot join a group. Show the waiting-for-group student state. Do not invent a fake group.
- **No schema / no migrations.** Cookie + role-branch only.

## Decisions review

Before committing, surface: where you hooked the banner into lesson chrome, the cookie-read placement (server vs client), any write path you found that the inventory missed, how you handled the word-lookup logging skip (tooltip still works), any page where the teacher branch and student branch diverged in a way preview couldn't cleanly express, and any deviation from this spec. No hidden migrations, no hidden features.
