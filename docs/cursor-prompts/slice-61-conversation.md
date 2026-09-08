# Cursor Prompt: Build Slice 61 — Conversation Class (4-4-4, Both Levels)

## Context

Read these files before starting:
- `docs/PRD.md` — Search for "Slice 61", "ConversationPrompt", "conversation_prompt", and "round_current". The full data model, slice spec, and resolved-questions entry are there.
- `Language-Wiki/concepts/conversation-class-methodology.md` (Obsidian vault at `/Users/kylote/Documents/Obsidian Vault/`) — The full methodology. Key facts that drive the design: 6 rounds (3 as asker, 3 as speaker), SAME question set both halves (so no role display needed — every phone shows the identical page), round length 4 min pre-int / 5 min int (derive from course level, never store), teacher eavesdrops during rounds, class proceeds identically if a student never opens the app.
- `docs/cursor-prompts/slice-56-presentation.md` — The pattern reference for a non-reader lesson type: separate catalog table, separate session type, separate route, session access resolution, teacher assign, Realtime sync. Follow its structure closely.
- `docs/cursor-prompts/slice-55-teacher-content-editor.md` — Slice 61 adds conversation prompts to the content editor scope. If Slice 55 is already built, extend it; if not, note the addendum for that slice.

## What to build

A new classroom lesson type for the Conversation class (Sistema de 8 Class 4, both levels). This upgrades the Slice 57 "live-only" conversation card into a real lesson page. It replaces Kyle's Google Doc question sheet with a synced page:

1. Teacher creates a ConversationPrompt (catalog content): title, level, optional theme, 3-6 questions
2. Teacher assigns the prompt to a CourseSession (`session_type = "conversation"`)
3. Students click the session link → see: round number, countdown timer, question list. **Display-only — students never type anything. No responses table.**
4. Teacher controls rounds from the teacher session page: Siguiente ronda, Reiniciar ronda, Pausar/Reanudar. Students' pages update via Supabase Realtime.
5. All pairs must start and finish each round simultaneously — that is WHY the sync is teacher-driven. Do not add per-student timer control.

**Design rule (non-negotiable): the page is load-bearing for nobody.** Kyle's class runs identically if half the students never open the link (current adoption ~7/10). Every teacher control must have a verbal equivalent Kyle already uses ("cambien de pareja", "next round").

## Route

New route: `/conversation?session=TOKEN`

Separate page like `/exam` and `/presentation`, NOT a Story kind. Conversation prompts have no reader infrastructure (no body_text, no annotation, no IPA, no questions-with-answers, no audio).

Follow the same access check pattern as `src/app/exam/page.tsx`:
- Import a new `resolveConversationSessionAccess` from `src/lib/sessions.ts`
- Handle the same access outcomes (invalid, refused, expired, wrong-group, ok)
- Fetch the ConversationPrompt by `conversation_prompt_id` from the session

## Data model (from PRD)

### New table: `conversation_prompts`

```sql
CREATE TABLE conversation_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level text NOT NULL CHECK (level IN ('intermediate', 'pre_intermediate')),
  theme text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

The `questions` jsonb array structure:
```json
[
  { "id": 1, "question": "Have you ever read a García Márquez book? Which one?" },
  { "id": 2, "question": "Magical realism mixes the impossible with the everyday. Does that appeal to you or annoy you?" }
]
```

3-6 questions. No `answer` field — answers are spoken, not written. No role field — the same set serves both halves.

RLS: mirror `presentation_prompts` exactly (teachers INSERT/UPDATE/SELECT own rows; authenticated classroom students SELECT only when linked via an active session — copy whatever policy shape presentation_prompts uses, including the `can_read_*` helper approach if that's what presentation used).

### CourseSession changes

```sql
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS conversation_prompt_id uuid REFERENCES conversation_prompts(id) ON DELETE SET NULL;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS round_current integer NOT NULL DEFAULT 0;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS round_state text NOT NULL DEFAULT 'idle';
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS round_started_at timestamptz;
```

Semantics:
- `round_current`: 0 = before round 1 (idle), 1-6 = active round number, 7 = all rounds done ("Eso es todo")
- `round_state`: `'idle'` | `'running'` | `'stopped'` (paused)
- `round_started_at`: when the teacher started the current round. The countdown is ALWAYS computed as `round_length - (now - round_started_at)`, clamped at 0. Never store a client-side remaining value; never let students' clocks drive state.

**⚠️ CHECK constraint: `course_sessions_session_type_check` ALREADY includes `'conversation'`** (added in `supabase/migrations/20260906180000_dashboard_sessions.sql`). Do NOT drop or recreate it — that is the classic pitfall and here it would be a mistake. Verify it includes `'conversation'` and move on. Schema file: `supabase/schema-phase5-conversation.sql` (new table + ALTERs above, all idempotent with IF NOT EXISTS / IF EXISTS guards).

## Files to create

### 1. SQL schema: `supabase/schema-phase5-conversation.sql`
As above. No CHECK constraint change needed.

### 2. Types: add to `src/types/index.ts`

```typescript
export type ConversationQuestion = { id: number; question: string };

export interface ConversationPrompt {
  id: string;
  title: string;
  level: CourseLevel;
  theme: string | null;
  questions: ConversationQuestion[];
  createdAt: string;
}
```

Add to `CourseSession`: `conversationPromptId: string | null`, `roundCurrent: number`, `roundState: 'idle' | 'running' | 'stopped'`, `roundStartedAt: string | null`.

### 3. Session access: `src/lib/sessions.ts`

Add `resolveConversationSessionAccess(token)` following `resolvePresentationSessionAccess` exactly. Update `SessionRow`, `mapSession`, and any `session_type` unions/switches to include `"conversation"` with the three round fields.

### 4. Student page: `src/app/conversation/page.tsx`

Server component:
- Resolve access, handle all outcomes with `StoryAccessMessage`
- Fetch the prompt row, parse `questions` jsonb
- Load course level from the session's course (to derive round length)
- Determine classroom vs review the same way presentation does (`class_ended_at` / 90-min window) — but review mode is nearly identical here (see below)
- Render `<ConversationStudent>` client component with prompt data, course level, and initial round state

### 5. Main client component: `src/components/ConversationStudent.tsx`

The whole student experience on one page. Layout top to bottom (mobile-first, 375px):

1. **Round card** (the focal point, one focal point per screen per DESIGN.md):
   - `roundCurrent === 0`: "Esperando a que el profe empiece" with a subtle pulse
   - `roundCurrent` 1-6 and state `running`: "Ronda N de 6" headline (Lora) + large countdown (tabular numerals, Roboto Flex, ~56px). Last 30 seconds: countdown turns terracotta. At 0: shows "Tiempo" clamped, not negative.
   - state `stopped`: same display frozen at the last computed remaining, with a "Pausado" label
   - `roundCurrent === 7`: "Eso es todo" + check mark
2. **Question list** below: numbered cards (Lora for question text, 18px). Always visible in every state — students read ahead while waiting, same as receiving the doc early.
3. No inputs, no buttons, no save. The student page is a mirror.

**Realtime:** subscribe to `course_sessions` changes filtered by the session id (same pattern as video summary / presentation YouTube sync). On any change to `round_current`, `round_state`, or `round_started_at`: recompute the anchor and re-render.

**Timer math (do this exactly):**
- `roundLengthSeconds`: course level `pre_intermediate` → 240, `intermediate` → 300. Derived server-side and passed down; never fetched client-side.
- `secondsLeft = roundLengthSeconds - floor((Date.now() - Date.parse(roundStartedAt)) / 1000)`, clamped to [0, roundLengthSeconds]
- Local `setInterval` ticks every 1s between Realtime events. Realtime events are the source of truth — every event recomputes from `round_started_at`, so clock drift self-corrects.
- While `round_state === 'stopped'`: freeze the displayed value at the last computed `secondsLeft` and stop ticking. On resume (Realtime event: state `running` + new `round_started_at`), recompute — the teacher's resume action preserves elapsed time (see teacher actions), so students continue with the correct remaining time.

**Review mode** (after `class_ended_at` or the 4-hour cap): identical page, final round state, questions visible. There is nothing to review beyond this — do not build a separate review experience.

### 6. Teacher round controls: extend the teacher session detail page

`src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — add a conversation control panel when `session_type === "conversation"`:

- **Status line:** "Ronda N de 6" (or "Sin empezar" / "Terminado"), current state, remaining time
- **Siguiente ronda** (primary button): increments `round_current`, sets `round_started_at = now()`, `round_state = 'running'`. Disabled at 7. Label changes to "Terminar" at round 6 (advances to 7 = done).
- **Reiniciar ronda**: `round_started_at = now()`, state stays/becomes `running` (fresh full timer for the current round)
- **Pausar / Reanudar**: Pausar sets `round_state = 'stopped'`. Reanudar preserves elapsed time: the teacher's client sends `elapsedSeconds` (what it had counted at pause) and the server action sets `round_started_at = now() - elapsedSeconds`, `round_state = 'running'`. Seconds-level clock skew is acceptable.
- One confirmation NOT needed — these are low-stakes, Kyle taps fast mid-class. Keep it zero-friction.

Server actions in the teacher actions file (or a new `src/app/teacher/.../conversation-actions.ts`): `nextConversationRound(sessionId)`, `resetConversationRound(sessionId)`, `pauseConversationRound(sessionId)`, `resumeConversationRound(sessionId, elapsedSeconds)`. All validate: teacher owns the course, session is type `conversation`.

Do NOT add round controls to the group-page 8-class strip (that panel is for attendance/recordings). Session page only.

### 7. Server actions: none for students

There are no student actions on this page. No save, no reveal, no responses table. Do not create one.

### 8. Teacher prompt creation: conversation prompt editor

Same pattern as Slice 56's presentation prompt editor:
- Route: `/teacher/conversations/new` (or integrate into the existing session creation flow, whichever presentation used)
- Fields: title, level (radio: intermedio / pre-intermedio), theme (optional), questions (add/remove/reorder, 3-6; warn below 3: "La metodología usa 3-6 preguntas")
- Save to `conversation_prompts`

### 9. Session assignment

Update teacher session creation to support `session_type = "conversation"`:
- "Conversación" as an activity type option (both levels)
- Teacher selects a ConversationPrompt filtered to the course's level
- Session created with `session_type = "conversation"`, `conversation_prompt_id` set
- Session link behavior identical to other types (auto-attendance on open during the 90-min window)

### 10. Pre-int writing prompt creation: "Copiar preguntas de Clase 4"

In the writing prompt creation form, when the target level is pre-intermediate, add a source button **"Copiar preguntas de Clase 4"**:
- Opens a picker of `conversation_prompts` where `level = 'pre_intermediate'` (title + theme + question count)
- On pick: appends the questions into `prompt_text` as a numbered list (`1. Question one\n2. Question two\n...`), preserving any existing text (newline-separated)
- One-way snapshot at creation time. No live link, no sync back. Intermediate writing prompts never see this button (their prompts are TOEFL-style standalone).

### 11. Slice 55 addendum: content editor

Add `conversation_prompts` to the teacher content editor scope (see `docs/cursor-prompts/slice-55-teacher-content-editor.md`):
- Content index lists conversation prompts (title, level, question count)
- Edit route `/teacher/content/conversation/[id]`: title, level, theme, questions (add/delete/reorder)
- No desync guard needed (nothing references question ids; no responses exist)

If Slice 55 is not yet built, just note the addendum in its prompt file and do not build the editor in this slice.

### 12. Seed script: `scripts/seed-conversation.ts`

Follow the canonical seed pattern (`seed-presentation.ts`): typed `CONVERSATION_PROMPTS` array, `--title <t>` filter, upsert by title+level, never delete rows. Seed TWO example sets (one per level) so Kyle can assign immediately — mark them clearly in the script header as examples Kyle will edit or replace (via the Slice 55 editor once built). Both sets on the September theme (Gabo / Gabriel García Márquez, matching the Gabo presentation already seeded), in Kyle's voice (direct, personal, opinion-eliciting for intermediates; concrete for pre-int; English content), 4 questions each. Update `SCRIPTS.md` with the new script.

## Files to modify

1. `src/lib/activities.ts` — `"conversation"` in `SessionType` / `isSessionType`; `sessionTypeLabel` → `"Conversación"`; `studentSessionPath` → `/conversation?session=...`. Remove `conversation` from any live-only card list (Slice 57 made it live-only; it now has a real page).
2. `src/lib/sessions.ts` — resolver + row mapping
3. `src/types/index.ts` — types above
4. Teacher session creation + session detail pages — assign flow + round controls
5. Writing prompt creation form — the pre-int copy button
6. Any file that switches on `session_type` — add the `"conversation"` case
7. `SCRIPTS.md` — seed script entry

## Existing patterns to reuse

| Pattern | Source | What to reuse |
|---|---|---|
| Session access resolution | `resolveExamSessionAccess` / `resolvePresentationSessionAccess` | All outcomes, token handling |
| Realtime session-field sync | Video summary / presentation (`course_sessions` subscription filtered by id) | Subscription setup, re-render on field change |
| Teacher-driven server actions | Presentation YouTube control | Action structure, ownership validation |
| Catalog table + editor + assign | Presentation (Slice 56) | Table shape, RLS shape, creation form |
| Seed script shape | `seed-presentation.ts` | Typed array, `--title` filter, upsert-by-natural-key |
| Session link auto-attendance | Existing (Phase 2a + Slice 59) | Unchanged — verify it fires for the new type |
| DESIGN.md focal point + Paper Light | `DESIGN.md` | Round card as the single focal element, terracotta accent, 44px targets, no pill buttons outside step nav |

## Don't build (future)

- **Role assignment / role-flip UI** — the same question set serves both halves; no role display exists in v1. If Kyle later wants asker/speaker labels, that's a small add.
- **Per-student responses / any student input** — students never type in Class 4.
- **Review mode beyond the final page state** — nothing to review.
- **AI conversation partner** — premium AI tier (Phase 5 consumer). The prompt catalog being in the DB is the future freebie for it; nothing to build now.
- **Plan B modes (3-4 students, <3 students)** — Zoom-verbal practices, not app features.
- **Group-page round mini-controls** — session page only.
- **Student-local timers** — rejected by Kyle: all pairs must start/finish simultaneously. Teacher-driven sync is the spec, not a v1 compromise.

## Kyle's Rules (from PRD Section 10)

- No em dashes in UI text. UI copy in Spanish for navigation/CTA ("Siguiente ronda", "Pausado", "Eso es todo"), English for learning content (the questions).
- Mobile-first always. Test at 375px.
- The page must work perfectly with only 1 of 10 students opening it. No feature may assume everyone is present.
- Follow the data structure. The PRD is already updated for this slice; don't add tables or fields beyond it.

## Build order

1. Run `supabase/schema-phase5-conversation.sql` on the database (verify the existing `course_sessions_session_type_check` already includes `'conversation'` — do not touch it)
2. Types in `src/types/index.ts`
3. `src/lib/activities.ts` + `src/lib/sessions.ts`
4. `src/app/conversation/page.tsx` + `src/components/ConversationStudent.tsx`
5. Teacher actions + round controls on the session detail page
6. Teacher prompt creation + session assignment
7. Pre-int writing "Copiar preguntas de Clase 4" button
8. Slice 55 addendum (editor scope note or extension, per its build state)
9. `npx tsx scripts/seed-conversation.ts` + SCRIPTS.md entry
10. Test: create one prompt per level, assign sessions, open as student (Ronda 1 de 6 → countdown → questions), tap Siguiente ronda as teacher → student page advances in Realtime; timer hits 0 → "Tiempo"; Pausar freezes, Reanudar preserves remaining; round 7 → "Eso es todo"; student who never opens the link → class unaffected; pre-int writing form shows the copy button and copies numbered questions
11. `npx next build` must pass before push (Vercel serves stale deploys on broken builds)
12. Git commit: "Slice 61: Conversation class (4-4-4) with teacher-synced rounds"
