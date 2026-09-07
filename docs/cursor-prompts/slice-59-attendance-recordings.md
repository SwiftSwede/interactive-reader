# Cursor Prompt: Build Slice 59 — Attendance + recordings

## Context

Read these files before starting:

- `DESIGN.md` — Teacher Dashboard (8-class strip, right panel, attendance rules) and Inicio live-only card rules.
- `.cursorrules` — service layer, no em dashes in UI, Spanish UI copy, build verification.
- `src/app/teacher/classes/[id]/page.tsx` — group page session list (becomes the selectable 8-class strip).
- `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — class page Estudiantes list.
- `src/app/teacher/classes/[id]/ZoomUrlForm.tsx` — the recording field copies this chrome.
- `src/lib/teacher.ts`, `src/lib/sessions.ts`, `src/lib/dashboard.ts`, `src/components/dashboard/LessonCard.tsx`.

**Dependencies:** Slice 57 (`recording_youtube_url`, live-only types) and Slice 58 (TeacherShell + context panel) are merged.

## What to build

1. **Manual attendance** on every session type: binary asistió / no asistió, auto-save checkboxes.
2. **Auto marker** when `first_opened_at` falls inside the 90-min window. Zoom-only rows never get "auto".
3. **Recording paste** writes `course_sessions.recording_youtube_url`. Zoom-style: paste + Guardar, then terracotta link + X. YouTube only.
4. **Two teacher surfaces:** class-page Estudiantes toggles, and group-page right panel when a strip row is selected. Do not open the panel copy on the class page.
5. **Student follow-through:** live-only `completed` from `attended`; nested YouTube link on live-only cards. No new lesson pages.

**Out of scope:** Slice 60, theme, Contenido editor, Ver-as-student, Analíticas, Estudiantes attendance-history cards, Zoom/YouTube APIs, changing live-window auto-attendance for app classes.

## Decisions (binding)

- Override after class and on Zoom-only classes. During a live app class, a session-link click still sets `attended = true`.
- Unchecked with no row = not attended. Opening the UI does not write absent rows for the whole roster.
- Archived months: attendance stays editable, same as recordings.
- Este mes stays group-select → next-class panel. No attendance grid there.
- App-tracked completion signals stay as they are. Live-only completed = this student `attended === true`.

## Schema

- `session_attendance.first_opened_at` nullable (null when the teacher marked someone who never opened).
- Teacher INSERT/UPDATE RLS via `teacher_owns_course(course_sessions.course_id)`.
- No `auto_marked` / `manual_override` columns.

## Acceptance criteria

1. Class page: each student has a 44px attendance toggle; save is immediate; reload keeps the value.
2. Group page: selecting a class fills the right panel with the same grid + recording field. Chevron still opens the class page.
3. Recording: invalid URL rejected in Kyle's voice; empty + X clears; students see the lesson recording banner after the window (existing) and live-only cards show "Ver la grabación".
4. Mark a conversation/pronunciation student present → Inicio "Clases completadas" increments for that student.
5. Live-only cards are not lesson links. Nested recording link opens YouTube.
6. `npx tsc --noEmit` and `npm test` pass.
