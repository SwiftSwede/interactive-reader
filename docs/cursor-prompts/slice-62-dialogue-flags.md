# Cursor Prompt: Build Slice 62 — Dialogue Session Type + Word Flagging

> ⚠️ **Snapshot warning:** Any "verified", line-number, or SQL citation in this file is a snapshot from 2026-09-08 early AM, taken BEFORE Slice 61 landed (commit 75a10f9 rewrote `course_sessions_activity_check`). Per `.cursorrules` "Source of truth": the repo wins. Regenerate constraint SQL from the newest migration that touches it (`grep -l course_sessions_activity_check supabase/migrations/*.sql | sort | tail -1`), and re-verify every code citation before building. Report discrepancies to Kyle rather than following either version blindly.

## Plan review decisions (Kyle, 2026-09-08 — ratifications from Cursor's plan review; binding)

- **Dialogue is a lesson type, not a story-kind display.** That is the whole point of part (a) — Kyle explicitly rejected keeping `dialogue` under `session_type = "story"`.
- **Scope expansion ratified: `movie_talk` and `song` also become real session types** (all three previously rode `session_type = "story"`, mislabeled). Each gets its own button + kind-filtered picker in CreateSessionForm; the Historia picker excludes all of them plus video_summary.
- **Flagging UI scope unchanged: songs get a session type but NO flag UI** (ADR 009 — lyric flagging is Truquitos territory, Slice 57+). Movie talk keeps flag UI.

## Context

Read these files before starting:
- `docs/adr/009-word-flags-persistent-per-content.md` — THE decision record. Word flags are persistent per-content marks, not session records. The text+occurrence anchor and the two-layer design (flags vs requests) come from here. Do not deviate.
- `docs/PRD.md` — Search for "Slice 62", "WordFlag", "WordFlagRequest", and "dialogue". The full data model and slice spec are there.
- `Language-Wiki/concepts/dialogue-class-methodology.md` (Obsidian vault at `/Users/kylote/Documents/Obsidian Vault/`) — the class methodology. Key facts that drive the design: cold read in breakout rooms, corrections collected never delivered live, vocabulary review is the largest teaching block (underline = pronunciation heard during the read, bold = prep-predicted comprehension blocker), Kyle screen-shares the text during review (which is why flags are teacher-only in v1), and students answer comprehension questions in groups during breakouts (which is why dialogue sessions need response persistence, same as story sessions).
- `docs/cursor-prompts/slice-61-conversation.md` — NOT a dependency (Slice 61 may not be built yet; this slice does not depend on it). Read it only for prompt-structure conventions.
- `docs/adr/007-check-constraint-migration-pattern.md` — the CHECK constraint pitfall. This slice touches TWO constraints, not one (see below).

## What to build

Two features in one slice (Kyle's call: the session type alone is meaningless without a class to flag in):

**(a) Dialogue session type.** Class 5 currently runs by assigning a dialogue as a "Historia" session — it renders fine but is mislabeled and the flag feature has no proper home. Add `session_type = "dialogue"` with `story_id` set where `stories.kind = "dialogue"`. It reuses the story lesson path (`/lesson/[slug]`) — no new route, no new resolver branch, no new FK. Per the plan-review decisions above, `movie_talk` and `song` get the same treatment (their own session types, kind-filtered pickers, removed from the Historia picker).

**(b) Word flagging (ADR 009).** Teacher bold/underline marks on words in the lesson text, persisted per-content. Plus student "No entendí" requests that aggregate into count badges on the teacher's view during class.

**Design rule (non-negotiable): the page is load-bearing for nobody.** Class runs identically if no student ever opens the link. Flags are prep artifacts Kyle could live without (he does today, in Slides); requests are additive signals. Nothing in this slice may gate or block the existing lesson flow.

## Part (a): Dialogue session type

### SessionType plumbing — `src/lib/activities.ts`

1. Add `"dialogue"` to the `SessionType` union and to `isSessionType()`.
2. `sessionTypeLabel("dialogue")` → `"Diálogo"`.
3. `studentSessionPath`: dialogue sessions carry a `storySlug`, so the existing fall-through (`return lessonPath(input.storySlug, input.token)`) already handles them. Verify, don't add a branch.
4. `isLiveOnlySessionType`: dialogue is NOT live-only. No change.

### `src/lib/sessions.ts`

Dialogue mirrors `story` everywhere a lesson-path behavior switches on session type. Grep for `"story"` in this file and audit each site; the two known ones:
- The access-resolution guard (~line 169): sessions of type `story` / `video_summary` / `presentation` resolve to a story-backed lesson. Add `"dialogue"` to that list.
- The `saveResponses` determination (~line 501): `story` and `video_summary` allow students to save comprehension/personal responses. Add `"dialogue"` — students answer the questions in their groups during the breakout phase, same as a story class.

### CreateSessionForm — `src/app/teacher/classes/[id]/CreateSessionForm.tsx`

- Add a **"Diálogo"** type button (both levels). It sits in the same grid; the grid wraps.
- When `sessionType === "dialogue"`: render a story picker filtered to `kind === "dialogue"` (label "Diálogo", placeholder "Elige un diálogo"). The form already receives `stories` with `kind` on each option.
- **Tighten the "Historia" picker:** `storyOptions` currently excludes only `video_summary`. Change it to exclude `video_summary` AND `dialogue` — once a real Diálogo type exists, the mislabel workaround must stop being reachable.
- Disable the submit button when the filtered picker is empty, same as the existing types.

### Teacher session page — `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx`

- `openedLabel` union gains `"dialogue"`, noun `"el diálogo"` ("Todavía no abre el diálogo." / "Abrió el diálogo. Llegó a tiempo.")

### Any other session_type switches

Grep the whole `src/` for `session_type` and `sessionType` switches; every place that has a `story` case for lesson-path behavior gets a `dialogue` case (labels, dashboards, attendance — attendance is type-agnostic and should need nothing).

## Part (b): Word flagging

### The anchor (read this twice)

Flags anchor on **`{story_id, flag_text, occurrence_index}`** — NOT `word_id`. The `words` table is wiped and re-inserted on every `annotate-story.ts` run; an FK anchor would orphan every flag. The client computes `occurrence_index` during the exact same tokenization walk the reader already does: split `bodyText` by `\n`, then each paragraph by `/\s+`, walking tokens in order and keeping a `Map<string, number>` of how many times each token text has been seen so far. `occurrence_index` for a token = the count BEFORE incrementing (0-based: first "the" in the text is 0, second is 1...).

Two consequences:
- `flag_text` is the **raw token as it appears in `body_text`** (punctuation attached: `"word,"` is one token). Do NOT normalize curly quotes for the flag anchor — the DOM data attributes carry the raw token, and matching is exact string equality on the same tokenization. (The existing curly-quote normalization for word-table matching stays untouched — that is a different comparison.)
- Flags only render on **word spans** (tokens with a matching `words` row). A token with no word record has no span and cannot be flagged. Re-annotation re-inserts all words, so flags survive it — this is the acceptance test at the end.

### SQL — `supabase/schema-slice62-dialogue-flags.sql` AND `supabase/migrations/20260908120000_slice62_dialogue_flags.sql` (same content)

```sql
-- 1. word_flags: teacher's persistent per-content marks (ADR 009)
CREATE TABLE IF NOT EXISTS word_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN ('underline', 'bold')),
  flag_text text NOT NULL,
  occurrence_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, flag_text, occurrence_index, flag_type)
);
CREATE INDEX IF NOT EXISTS idx_word_flags_story ON word_flags(story_id);

-- 2. word_flag_requests: student "No entendí" signals, session-scoped
CREATE TABLE IF NOT EXISTS word_flag_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  course_session_id uuid NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_text text NOT NULL,
  occurrence_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, user_id, flag_text, occurrence_index)
);
CREATE INDEX IF NOT EXISTS idx_wfr_session ON word_flag_requests(course_session_id);
CREATE INDEX IF NOT EXISTS idx_wfr_anchor
  ON word_flag_requests(course_session_id, flag_text, occurrence_index);

-- 3. BOTH session-type constraints gain 'dialogue' (verified 2026-09-08:
--    the live constraint list is story, writing, exam, video_summary,
--    presentation, conversation, pronunciation — no dialogue)
ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN (
    'story', 'writing', 'exam', 'video_summary',
    'presentation', 'conversation', 'pronunciation', 'dialogue'
  ));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_activity_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_activity_check
  CHECK (
    (session_type = 'story' AND story_id IS NOT NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NULL)
    OR (session_type = 'writing' AND story_id IS NULL AND writing_prompt_id IS NOT NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NULL)
    OR (session_type = 'exam' AND story_id IS NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NOT NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NULL)
    OR (session_type = 'video_summary' AND story_id IS NOT NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NULL)
    OR (session_type = 'presentation' AND story_id IS NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NOT NULL AND conversation_prompt_id IS NULL)
    OR (session_type = 'conversation' AND story_id IS NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NOT NULL)
    OR (session_type = 'pronunciation' AND story_id IS NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NULL)
    OR (session_type = 'dialogue' AND story_id IS NOT NULL AND writing_prompt_id IS NULL AND exam_prompt_id IS NULL AND presentation_prompt_id IS NULL AND conversation_prompt_id IS NULL)
  );
```

⚠️ **The activity matrix above is a REWRITE, not a patch.** It must contain ALL eight branches — the seven existing ones (copied from `supabase/migrations/20260906180000_dashboard_sessions.sql`, which is the verified current state) plus the new dialogue branch, with `conversation_prompt_id IS NULL` added to every branch that lacked it. Dropping a branch silently would break that session type. Diff your migration against the Sept 6 file branch-by-branch before running.

⚠️ `stories_kind_check` needs NO change — `dialogue` has been a valid `Story.kind` since Phase 4a. Do not touch it.

### RLS + Realtime (same file)

```sql
-- word_flags: teacher-only read and write (students never see flags in v1)
ALTER TABLE word_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_teacher_all" ON word_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin'))
);

-- word_flag_requests: students insert/read own; teacher reads and consumes on own courses
ALTER TABLE word_flag_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wfr_student_insert_own" ON word_flag_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "wfr_student_read_own" ON word_flag_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wfr_teacher_select" ON word_flag_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sessions cs
      JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = word_flag_requests.course_session_id
        AND c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "wfr_teacher_delete" ON word_flag_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM course_sessions cs
      JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = word_flag_requests.course_session_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Realtime: requests only (teacher badge aggregation). Flags have no fan-out.
ALTER TABLE word_flag_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.word_flag_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

### Types — `src/types/index.ts`

```typescript
export type WordFlagType = "bold" | "underline";

export interface WordFlag {
  id: string;
  storyId: string;
  flagType: WordFlagType;
  flagText: string;
  occurrenceIndex: number;
}

export interface WordFlagRequest {
  id: string;
  flagText: string;
  occurrenceIndex: number;
}
```

### Service — `src/lib/word-flags.ts`

Service-layer functions (per `.cursorrules` — components do not query Supabase directly):
- `loadWordFlags(supabase, storyId): Promise<WordFlag[]>` — teacher-only read.
- `loadOwnWordFlagRequests(supabase, sessionId, userId): Promise<WordFlagRequest[]>` — for the student's own markers.
- `loadSessionWordFlagRequests(supabase, sessionId): Promise<WordFlagRequest[]>` — teacher-only (RLS scopes it to own courses); initial badge counts on page load, before any Realtime event arrives.

### Server actions — `src/app/lesson/[slug]/word-flag-actions.ts` (new file, `"use server"`)

- `setWordFlag({ storyId, flagText, occurrenceIndex, flagType, on })` — teacher-only. `on: true` upserts (respecting the UNIQUE anchor), `on: false` deletes the flag. Returns the action result type used by existing actions.
- `requestWordFlag({ storyId, sessionId, flagText, occurrenceIndex })` — student-only (reject teachers). Upsert; the UNIQUE constraint makes double-taps idempotent.
- `convertRequestsToFlag({ storyId, sessionId, flagText, occurrenceIndex })` — teacher-only. One atomic conversion: upsert a `bold` flag on the anchor + delete that session's requests for that anchor. "No entendí" is a meaning signal, so conversion lands as bold (ADR 009 semantics).

All three validate auth server-side and scope errors in Spanish.

### InteractiveStory — the flag layer

New props (all optional, so existing call sites and `React.memo` behavior stay intact):

```typescript
flagging?: {
  enabled: boolean;            // isTeacher && kind !== "song"
  flags: WordFlag[];           // server-fetched
  requests: WordFlagRequest[]; // teacher: aggregated for this session; student: own
  isTeacher: boolean;
  sessionId: string | null;   // requests need it; flags don't
  storyId: string;
  readerMode: "classroom-live" | "classroom-review" | "open";
};
```

**Build with `useMemo` (stable references — `WordTooltip` is `React.memo`'d; unstable props will break it):**
- `flagMap: Map<string, WordFlagType[]>` keyed `` `${flag_text}::${occurrence_index}` ``
- During the tokenization walk, track `occurrenceCounts: Map<string, number>` (increment per token) and pass each rendered token's `occurrenceIndex` down to its `WordTooltip`.

**Rendering:**
- Word spans gain `data-word-text` and `data-word-occurrence` attributes (raw token, occurrence index). These are how selection-resolved marking and the fallback actions know the anchor.
- If `flagging.enabled`, a word span with a matching anchor gets `word-flag-bold` and/or `word-flag-underline` classes. These are React-managed classes alongside `.word-seen` / `.word-active` — do NOT touch the karaoke's direct-DOM `.word-audio-current` system (different class set, RAF-managed; they must not interfere).
- Teacher badge: when `flagging.isTeacher && flagging.sessionId`, each anchor present in `requests` renders a small terracotta count badge attached to the word (superscript, count of requests for that anchor). Tapping the badge calls `convertRequestsToFlag`. Badge count updates live via Realtime (below).

**Keyboard (primary teacher entry point):** a `keydown` listener on the story container. Intercept `(metaKey || ctrlKey) && (key === "b" || key === "u")` ONLY when ALL of: `flagging.enabled`, the current `window.getSelection()` is non-collapsed and lies within the story container, and `document.activeElement` is not an input/textarea/contenteditable. Then `preventDefault()` and apply toggle semantics:
- Resolve the selection to word spans: every `[data-word-text]` span inside the container that intersects the selection range at all (partial overlap counts — users select mid-word).
- Toggle semantics per flag type: if ALL resolved anchors already have that type → unmark all; otherwise → mark all.
- ⌘B → bold, ⌘U → underline. Kyle's muscle memory is Docs/Word: same keys mark and unmark. (He said ⌘V once — that is paste; the habit to preserve is ⌘B/⌘U. Never bind paste.)

**Mouse fallback:** `WordTooltip` gains an optional actions block in the pinned popup:
- Teacher: two small buttons **"Subrayar"** / **"Negrita"** acting on the single word (toggle: a button reflects its current state). Available in `flagging.enabled` contexts, pinned state only.
- Student (NOT teacher): one small button **"No entendí"** when `flagging.sessionId` is set, `readerMode === "classroom-live"`, and the anchor isn't already requested. On tap: optimistic personal marker (`word-requested-own` class), call `requestWordFlag`. Tapping again does nothing (idempotent upsert; keep the marker).
- Students never see teacher buttons; teachers never see the student button.

**Realtime (teacher view only):** when `flagging.isTeacher && flagging.sessionId`, subscribe to `word_flag_requests` filtered by `course_session_id` (same pattern as the video-summary paragraph subscription). New inserts aggregate into the badge counts. Students do NOT subscribe — they only see their own taps (optimistic) and their own markers (server-fetched on load).

### CSS — `src/app/globals.css`

```css
.word-flag-bold { font-weight: 700; }
.word-flag-underline {
  text-decoration: underline;
  text-decoration-color: var(--accent /* terracotta #6f4627 */);
  text-decoration-thickness: 2px;
}
.word-requested-own {
  /* subtle personal marker — student knows it registered */
}
```

Flags must stay clearly visible through Zoom screen-share compression: bold 700, underline 2px terracotta. `.word-seen`'s existing subtle underline may coexist — the flag's thicker colored decoration draws over it. The badge: terracotta circle, white count, small (16-18px), positioned superscript-right of the word, min touch target rules apply to its tap area (not its visual size). No em dashes in any UI text.

### Data plumbing — `src/app/lesson/[slug]/page.tsx`

- When `isTeacher`: `loadWordFlags(supabase, storyId)`.
- When `isTeacher` AND the page carries a session (`access.kind === "ok"`): also `loadSessionWordFlagRequests(supabase, session.id)` — the initial badge counts.
- When student with a session and `readerMode === "classroom-live"`: `loadOwnWordFlagRequests(supabase, sessionId, user.id)`.
- Pass both down through `StoryReader` → `StorySteps` → `InteractiveStory` as the `flagging` bundle. `StoryReader` and `StorySteps` already thread `isTeacher`; add the bundle to the same chain (server data, no new client fetches).
- `flagging.enabled = isTeacher && kind !== "song"` — story, dialogue, and movie talk get the UI; songs don't (Truquitos is a separate workflow); video_summary doesn't render InteractiveStory at all.

### Files to create
1. `supabase/schema-slice62-dialogue-flags.sql` + `supabase/migrations/20260908120000_slice62_dialogue_flags.sql`
2. `src/lib/word-flags.ts`
3. `src/app/lesson/[slug]/word-flag-actions.ts`

### Files to modify
1. `src/lib/activities.ts` — union, isSessionType, label
2. `src/lib/sessions.ts` — the two story-behavior sites + audit
3. `src/types/index.ts` — types above
4. `src/app/teacher/classes/[id]/CreateSessionForm.tsx` — Diálogo button + picker, Historia picker tightened
5. `src/app/teacher/classes/[id]/sessions/[sessionId]/page.tsx` — openedLabel
6. `src/app/lesson/[slug]/page.tsx` — flag data fetch + pass-down
7. `src/components/StoryReader.tsx`, `src/components/StorySteps.tsx` — thread the flagging bundle
8. `src/components/InteractiveStory.tsx` — tokenization occurrence tracking, data attributes, flag classes, keyboard listener, badges, Realtime
9. `src/components/WordTooltip.tsx` — tooltip action buttons (teacher Subrayar/Negrita, student No entendí)
10. `src/app/globals.css` — flag classes
11. `SCRIPTS.md` — no new scripts, but if it documents session types, add the note

## Existing patterns to reuse

| Pattern | Source | What to reuse |
|---|---|---|
| Session type addition (label + union + form) | `presentation` (Slice 56), `conversation` (Slice 61 spec) | The three-place checklist |
| Story-backed session type with `story_id` | `video_summary` (Slice 54) | How a second type reuses the lesson path |
| RLS: teacher-write table | `video_summary_teaching_notes` (`vstn_write_teacher`) | role IN ('teacher','admin') EXISTS check |
| RLS: student-own rows | `video_summary_free_writes` (`vsfw_student_own`) | user_id = auth.uid() |
| RLS: teacher scoped to own courses | Slice 59 attendance | The courses JOIN scope for request reads/deletes |
| Realtime subscription on a table filtered by session | video summary paragraphs | Subscription setup, re-render on INSERT |
| Server actions with Spanish error strings | `src/app/lesson/[slug]/actions.ts` | Action shape, auth checks, result types |
| React.memo-safe prop threading | WordTooltip architecture (skill reference) | useMemo maps, useCallback actions |

## Don't build (future)

- **Student-visible flag rendering / Realtime flag fan-out** — v1 is teacher-only; Zoom screen-share carries the marks. A later read-policy change can expose flags in review mode (the content-keyed shape makes that trivial).
- **Note fields on flags** — mark-only. Bold = meaning, underline = pronunciation. Classification notes belong to `video_summary_teaching_notes`.
- **Song lyric flagging** — Truquitos ghosting is a separate live-annotation workflow (Slice 57 territory).
- **Video summary flagging** — Spanish text, own note system.
- **Cross-session request accumulation** — requests are session-scoped on purpose: the badge means "N students in THIS class asked." The durable layer is the flags themselves.
- **A separate "Palabras de hoy" list view** — the marked text IS the teaching list; Kyle walks it on screen-share.
- **Group-shared comprehension answers** — students type their own answers, same as story sessions. Kyle confirmed group-typed shared answers are not a requirement.

## Kyle's Rules (from PRD Section 10)

- No em dashes in UI text. UI copy in Spanish ("Subrayar", "Negrita", "No entendí", "Diálogo").
- Mobile-first always. Test at 375px. The teacher flags from a laptop (Zoom screen-share) but the student "No entendí" tap happens on a phone — the tooltip button must be a 44px target.
- The class runs identically if nobody opens the app. Flags are prep conveniences; requests are additive.
- Follow the data structure in the PRD and ADR 009. Don't add tables, fields, or note columns beyond it.

## Build order

1. Write the SQL file + migration. **Diff the activity-check matrix branch-by-branch against `20260906180000_dashboard_sessions.sql`** — eight branches must survive plus the new one. Kyle runs it in the Supabase dashboard SQL editor; DDL cannot run from the app.
2. Types → `src/lib/word-flags.ts` → server actions.
3. `activities.ts` + `sessions.ts` + CreateSessionForm + openedLabel (the whole dialogue session type — this is independently testable: create a dialogue session, open the lesson, everything works as before but labeled "Diálogo").
4. InteractiveStory flag layer (tokenization occurrence tracking → data attributes → classes → hotkeys → tooltip buttons).
5. Student requests + teacher badges + Realtime.
6. `npx tsc --noEmit` then `npx next build` — both must pass before any push (Vercel serves stale deploys on broken builds).
7. Git commit: "Slice 62: Dialogue session type + word flagging (ADR 009)".

## Acceptance tests (all must pass)

1. **Session type:** Create a dialogue session ("Diálogo" picker shows only `kind = "dialogue"` stories; "Historia" picker no longer shows dialogues). Open the student link: lesson renders, comprehension answers save during class, review mode unlocks after. The teacher session page says "Abrió el diálogo."
2. **Flags persist:** As teacher, select two words in the dialogue, ⌘B one and ⌘U the other. Reload → both marks persist (per-content: they are there next month too).
3. **Toggle semantics:** Select an already-bolded word, ⌘B → unmarks. Select three words where two are underlined and one isn't, ⌘U → all three become underlined.
4. **The re-annotation survival test (the trap — do not skip):** run `npx tsx scripts/annotate-story.ts --slug <the dialogue slug>` (Kyle runs this, ~5-12 min, ~$0.02 — it wipes and re-inserts the words table, which is its normal operation). Then reload the lesson as teacher → **flags still render on the right words.** The anchor is text+occurrence, not word_id. If flags vanish or land on wrong words, the anchor implementation is wrong.
5. **Hotkey guard:** focus a comprehension-answer textarea, press ⌘B with text selected in it → nothing happens (no intercept). Select text outside the story container, ⌘B → nothing.
6. **Requests:** As a student during a live class: pin a word tooltip, tap "No entendí" → the word gets the personal marker; reload → marker persists. As teacher in the same session: the badge count appears within seconds (Realtime), showing 1. A second student requests the same word → badge shows 2.
7. **Conversion:** Teacher taps the badge → the word becomes bold (flag layer), the badge disappears (that anchor's requests consumed). Reload → bold persists, requests stay gone.
8. **Isolation:** Student A never sees student B's requests or any teacher flags. Student B never sees student A's markers. Teacher with no session open (prep mode): flags work, badges absent.
9. **Scope:** Open a song lesson as teacher → no flag UI (no hotkeys, no tooltip buttons). Open a story and a movie talk as teacher → flag UI works.
10. **Nothing regressed:** story, video_summary, presentation, writing, exam sessions all still create and open; karaoke highlight still works during audio playback (flag classes and `.word-audio-current` coexist).
