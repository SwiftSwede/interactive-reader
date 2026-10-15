# Slice 91: Question capture button ("No sé cómo decir...")

> If the PRD slice number 91 is taken, use the next free number and note it in the header.

**Merge danger: LOW.** Additive: one new table + RLS, no changes to existing tables, no FK cascades into existing flows (both FKs nullable). Blast radius: none of the existing lesson flows change behavior; the button is an insert-only surface.

## Goal

Students hit a vocabulary gap or a question mid-lesson. Today that moment evaporates unless Kyle happens to catch it. This slice adds a small capture button so the need becomes a stored, per-student event Kyle can teach from at halftime and review later. It is NOT a translator: no API, no AI, no answer given to the student. It is a help-request ticket.

Ratified design rationale (do not re-litigate): the value is the notification + the permanent record, not translation. Google Translate answers the student and evaporates; this converts the need into teacher-visible data.

## Placement (Kyle, 2026-10-14)

There are TWO surfaces, both student-facing lesson screens:

1. **Step-nav pill row (primary).** In lesson mode the bottom of the page has `nav.step-nav` (Atrás pill on the left, Siguiente pill on the right). Between the two buttons there is open real estate: place a small ROUND accent-colored button with a `?` icon, vertically centered in the row. It must look like part of the existing nav, not an overlay: same row, no floating above content, does not push the pills apart awkwardly on 375px (pills may flex-shrink text labels; the round button is fixed ~40px).
2. **Browsing-mode bottom tab bar (secondary).** The student tab bar has 3 tabs (Inicio, Lecciones, Herramientas). Add the same `?` round button as a fourth slot styled as the accent circle (the Instagram-plus pattern). It is a button, not a tab: tapping it opens the same sheet, it does not navigate.

Components that render `nav.step-nav` for STUDENT-facing step lessons (confirmed by grep): `StorySteps.tsx` (story, dialogue, video summary via kind dispatch), `MusicLessonSteps.tsx`, `MovieTalkLessonSteps.tsx`, `PresentationPlayer.tsx`, and `ConversationStudent.tsx` (its own Siguiente/Terminar nav, same treatment). **EXCLUDED: `ExamSession.tsx` and `WritingSession.tsx`** (timed assessments, no interruptions).

## Schema

New migration `20261014000000_slice91_question_requests.sql`:

```sql
create table question_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid references stories(id) on delete set null,
  course_session_id uuid references course_sessions(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  addressed_at timestamptz
);
alter table question_requests enable row level security;
create policy "student inserts own requests" on question_requests
  for insert to authenticated with check (auth.uid() = student_id);
create policy "student reads own requests" on question_requests
  for select to authenticated using (auth.uid() = student_id);
create index idx_question_requests_session on question_requests(course_session_id) where course_session_id is not null;
create index idx_question_requests_student on question_requests(student_id, created_at desc);
```

Teacher reads/writes go through the existing admin-client pattern (service role) with ownership checks in code, matching `teacher_observation` (ADR 015 Phase 1). No teacher RLS policy.

## Student UI

Shared client component, e.g. `AskTeacherButton` (one implementation, wired into every placement above):

- Round accent button, `?` icon, aria-label "Preguntar al Profe".
- Tap opens a bottom sheet (existing sheet/bottom-sheet pattern from Slice 82's Cómo sheet): title "¿No sabes cómo decirlo?", one textarea, placeholder: "Escríbelo en español, o hazme una pregunta sobre la lección", char counter not needed, submit button "Enviar".
- On submit: POST insert (student's own row, story_id/course_session_id filled from the page's context), sheet closes, quiet confirmation ("Enviado. Pregúntame en el descanso."). The student can reopen and send again.
- Zero interruption to the lesson: no step navigation, no state changes, no audio interference.
- Spanish UI copy carries written accents (Sabías-style QA) and no em dashes.
- HIDDEN for teacher preview (`Ver como estudiante` / Vista de profe, `isTeacher`/previewLevel patterns already in `StorySteps.tsx`).
- Visible for classroom-live students (that is the primary use case) and consumer/self-learning students alike. No mode gating beyond the teacher-preview exclusion.

## Teacher UI

1. **Session page (live use, no tab switching).** On the teacher session detail page (`/teacher/classes/[id]/[sessionId]` or the existing equivalent), a compact badge row: "Preguntas (N)" where N = unaddressed count for this session. Polls every 5s while the page is open (cheap; no Realtime infra). Tapping expands the halftime queue: student name, phrase, time, ordered oldest first. Each item has a "Enseñada" action that stamps `addressed_at` (row disappears from the count but stays in the history list, visually muted).
2. **Student detail page (async use).** On `/teacher/classes/[id]/students/[studentId]`, add a "Preguntas" block (alongside the existing Ficha blocks): the student's recent 10 requests, newest first, unaddressed ones highlighted. No scores, no analytics, just the raw asks.

No push notifications, no email digests, no new teacher rail item. Self-learning students' requests surface through the student detail page (and any course where Kyle reviews them); that is sufficient for v1.

## Out of scope (explicit)

- No translator API, no AI gloss, no answer to the student.
- No SRS/flashcard hookup (parked; future slices feed from `question_requests`).
- No student-facing history of their own asks beyond the immediate confirmation.
- No Realtime; 5s polling is enough.
- Exam and writing sessions excluded.

## Verification (for the build)

1. `npx tsc --noEmit` clean; existing test suite green.
2. Open a story lesson as a student at 375px: round ? centered between the pills, sheet opens, submit works, row lands in `question_requests` with story_id set.
3. Open a conversation session as a student: same behavior with course_session_id set.
4. Open the teacher session page as Kyle: badge shows the count, queue lists the student's phrase, Enseñada stamps addressed_at and drops the count.
5. Teacher preview mode: button absent.
6. Exam/writing pages: button absent.
7. Migration probe: select from `question_requests` against prod (head: true, count: exact) via a temp script using `../src/lib/supabase/admin` + dotenv on `.env.local`; delete the script after.