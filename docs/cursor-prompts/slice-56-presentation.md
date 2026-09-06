# Cursor Prompt: Build Slice 56 — Presentation Class (Intermediate Class 3 Format A)

## Context

Read these files before starting:
- `docs/PRD.md` — Search for "Slice 56", "PresentationPrompt", "PresentationResponse", "presentation", and "presentation_prompt". The full data model, activity flow, and slice spec are there.
- `Language-Wiki/concepts/presentation-class-methodology.md` (Obsidian vault at `/Users/kylote/Documents/Obsidian Vault/`) — The full methodology page. Read for context on how this class works: the 6-step per-video cycle, vocabulary design, comprehension questions, and what's deliberately absent (no group work, no pronunciation, no discussion).
- `docs/cursor-prompts/slice-54-video-summary.md` — The previous classroom lesson type. This slice follows the same patterns: separate session type, teacher prompt creation, student page with YouTube embed, session link access, reveal gating.

## What to build

A new classroom lesson type for the Presentation class (intermediate Class 3 Format A). This replaces Kyle's Google Slides presentations with an interactive web page where:

1. Teacher creates a PresentationPrompt (catalog content) with 2-3 video segments
2. Each segment has: YouTube URL, vocabulary list (English=Spanish with optional example sentences), comprehension questions with answers
3. Teacher assigns the prompt to a CourseSession (`session_type = "presentation"`)
4. Students click the session link → see a step-based flow: optional warm-up → for each segment: vocabulary cards → questions to listen for → YouTube video → answer questions → self-check reveal
5. Classroom mode: teacher controls YouTube playback (same Realtime sync pattern as video summary)
6. Review mode (after 90-min window): normal YouTube controls, self-check always available

## Route

New route: `/presentation?session=TOKEN`

This is a **separate page** like `/exam` and `/writing`, NOT a Story kind. Presentations have no reader infrastructure (no body_text, no word annotation, no IPA). They are a different shape entirely.

Follow the same access check pattern as `src/app/exam/page.tsx`:
- Import a new `resolvePresentationSessionAccess` from `src/lib/sessions.ts`
- Handle the same access outcomes (invalid, refused, expired, wrong-group, ok)
- Fetch the PresentationPrompt by `presentation_prompt_id` from the session

## Data model (from PRD)

### New table: `presentation_prompts`

```sql
CREATE TABLE presentation_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level text NOT NULL DEFAULT 'intermediate' CHECK (level IN ('intermediate')),
  theme text,
  warmup_question text,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

The `segments` jsonb array structure:
```json
[
  {
    "id": 1,
    "youtube_url": "https://www.youtube.com/watch?v=XXXXX",
    "title": "Part 1 (optional)",
    "vocabulary": [
      { "english": "Neat", "spanish": "ordenado", "example_sentence": null },
      { "english": "Quintessential", "spanish": "por excelencia", "example_sentence": "The arepa is quintessential Colombian food." }
    ],
    "comprehension_questions": [
      { "id": 1, "question": "Paris limits the height of new buildings to how many meters?", "answer": "37 meters" },
      { "id": 2, "question": "In what decade did a cholera pandemic hit Paris?", "answer": "1830s" }
    ]
  },
  {
    "id": 2,
    "youtube_url": "https://www.youtube.com/watch?v=YYYYY",
    "title": "Part 2 (optional)",
    "vocabulary": [ ... ],
    "comprehension_questions": [ ... ]
  }
]
```

### New table: `presentation_responses`

```sql
CREATE TABLE presentation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_prompt_id uuid NOT NULL REFERENCES presentation_prompts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_session_id uuid REFERENCES course_sessions(id) ON DELETE SET NULL,
  segment_id integer NOT NULL,
  question_id integer NOT NULL,
  response_text text,
  revealed_answer boolean NOT NULL DEFAULT false,
  revealed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_session_id, user_id, segment_id, question_id)
);
```

### CourseSession changes

Add `presentation_prompt_id` column:

```sql
ALTER TABLE course_sessions ADD COLUMN presentation_prompt_id uuid REFERENCES presentation_prompts(id) ON DELETE SET NULL;

-- Update the session_type CHECK constraint to include 'presentation'
-- (Drop and recreate the existing constraint if it restricts session_type values)
```

Update `video_playing`, `video_seconds`, `video_rate` columns already exist on `course_sessions` (added for video summary). Reuse them for presentation YouTube sync.

## Files to create

### 1. SQL schema: `supabase/schema-phase5-presentation.sql`

Create the two new tables, add `presentation_prompt_id` to `course_sessions`, update the `session_type` CHECK constraint to include `'presentation'`.

### 2. Types: add to `src/types/index.ts`

```typescript
export type PresentationSegment = {
  id: number;
  youtube_url: string;
  title: string | null;
  vocabulary: PresentationVocabItem[];
  comprehension_questions: PresentationQuestion[];
};

export type PresentationVocabItem = {
  english: string;
  spanish: string;
  example_sentence: string | null;
};

export type PresentationQuestion = {
  id: number;
  question: string;
  answer: string;
};

export interface PresentationPrompt {
  id: string;
  title: string;
  level: CourseLevel;
  theme: string | null;
  warmupQuestion: string | null;
  segments: PresentationSegment[];
  createdAt: string;
}
```

### 3. Session access: `src/lib/sessions.ts`

Add `resolvePresentationSessionAccess(token: string | undefined)` following the exact pattern of `resolveExamSessionAccess`. The session must have `session_type = "presentation"` and a valid `presentation_prompt_id`.

Also update:
- `SessionRow` type to include `presentation_prompt_id?: string | null`
- `mapSession` to handle `presentation_prompt_id` and recognize `"presentation"` session type
- `isSessionType` in `src/lib/activities.ts` to include `"presentation"`
- `sessionTypeLabel` to return `"Presentación"` for `"presentation"`
- `studentSessionPath` to return `/presentation?session=...` for `"presentation"`

### 4. Student page: `src/app/presentation/page.tsx`

Server component. Same pattern as `src/app/exam/page.tsx`:
- Resolve session access via `resolvePresentationSessionAccess`
- Handle all access outcomes (invalid, refused, expired, wrong-group) with `StoryAccessMessage`
- Fetch the `presentation_prompts` row by `presentation_prompt_id`
- Parse the `segments` jsonb into typed objects
- Determine classroom mode (during 90-min window) vs review mode (after window)
- Render `<PresentationPlayer>` client component with the prompt data, session info, and mode

### 5. Main client component: `src/components/PresentationPlayer.tsx`

The core student experience. Step-based flow (same visual pattern as `StorySteps` — one activity at a time with progress dots at the top and pill-shaped nav arrows at the bottom).

**Flow:**

```
[Warm-Up Question] → Segment 1: [Vocabulary] → [Questions] → [Video] → [Answers] → Segment 2: [Vocabulary] → [Questions] → [Video] → [Answers] → ...
```

**Steps:**

If `warmupQuestion` exists:
- **Warm-up step**: Display the warm-up question text. No input. Just a discussion prompt. Button: "Empezar" → moves to Segment 1.

For each segment (1-based `segment_id`):

- **Vocabulary step** ("Vocabulario"): Display vocabulary cards. Each card shows the English word/phrase and Spanish translation side by side. If `example_sentence` is not null, show it below the card in a muted/secondary style. Cards are listed vertically (mobile-first). This is the pre-teaching phase. Button: "Ver preguntas" → moves to Questions step.

- **Questions step** ("Preguntas"): Display the comprehension questions for this segment. This is BEFORE the video — students see what they need to listen for. Questions are listed as text, no input yet. Button: "Ver video" → moves to Video step.

- **Video step** ("Video"): YouTube embed of `segment.youtube_url`.
  - **Classroom mode** (during 90-min window): Teacher controls playback. Students see the video but controls are locked. Use the same `video_playing`/`video_seconds`/`video_rate` Realtime sync pattern from the video summary class. Students tap the video area once ("Toca el video para oír") to follow along. Show a "El Profe Kyle está controlando el video" label.
  - **Review/consumer mode**: Normal YouTube controls. Play, pause, scrub.
  - Button: "Responder" (appears after video or can be clicked anytime) → moves to Answers step.

- **Answers step** ("Respuestas"): Display the comprehension questions again, now with a text area for each question. Student types their answer. Each question has a "Ver respuesta" button that reveals the correct answer (self-check).
  - **Classroom mode**: "Ver respuesta" is gated (same reveal-gating pattern as story comprehension questions — `answers_revealed` on the session, auto-flips at `session_end_time`). During class: students type but can't reveal.
  - **Review/consumer mode**: "Ver respuesta" always available.
  - On submit (typing + blur or a "Guardar" button): save to `presentation_responses` via a server action. Include `segment_id`, `question_id`, `response_text`, `course_session_id`.
  - On reveal: update `presentation_responses` row with `revealed_answer = true`, `revealed_at = now()`.
  - Button to next segment: "Siguiente video" (or "Terminar" if last segment).

After the last segment's Answers step: show a completion screen ("¡Eso es todo! Vuelve a este link después de clase para repasar.")

### 6. Teacher prompt creation: presentation prompt editor

Add to the teacher dashboard. Same pattern as `GroupExamPrompt` creation (Slice 49a):

New route: `/teacher/presentations/new` (or integrate into existing session creation flow).

Teacher can:
- Enter title
- Enter optional warm-up question
- Add/remove segments (2-3)
- For each segment: enter YouTube URL, add/remove vocabulary items (English + Spanish + optional example sentence), add/remove comprehension questions (question + answer)
- Save to `presentation_prompts`

### 7. Teacher session assignment

Update the teacher session creation page (`/teacher/classes/[id]/sessions/[sessionId]`) to support `session_type = "presentation"`:
- When creating a session, teacher can select "Presentación" as the activity type
- Teacher selects a PresentationPrompt from the catalog
- Session is created with `session_type = "presentation"` and `presentation_prompt_id` set

### 8. Server actions: `src/app/presentation/actions.ts`

```typescript
"use server";

// Save a student's answer to a comprehension question
export async function savePresentationResponse(params: {
  presentationPromptId: string;
  courseSessionId: string;
  segmentId: number;
  questionId: number;
  responseText: string;
}): Promise<{ error?: string }>

// Mark that a student revealed the answer for a question
export async function revealPresentationAnswer(params: {
  presentationPromptId: string;
  courseSessionId: string;
  segmentId: number;
  questionId: number;
}): Promise<{ error?: string }>
```

### 9. Seed script: `scripts/seed-presentation.ts`

Seed one example presentation based on the "Paris" presentation from Kyle's Drive:

- Title: "Paris"
- Theme: "Paris, France"
- Warm-up question: "Have you ever been to Paris? Would you like to go?"
- Segment 1: YouTube URL `https://www.youtube.com/watch?v=WoOEWvhj_0M`, vocabulary: Neat=ordenado, Cramped=estrecho (de espacio), Barred from=prohibido de, Seize=tomar con fuerza, Fastrack=acelerar, Appoint=nombrar, Drive=ambición, Spring water=agua manantial, Sewer system=sistema de alcantarillado, Battle=luchar, Maze=laberinto, Narrow=estrecho (de ancho), Armed uprising=levantamiento armado, Urge on=animar a, Painstaking=minucioso, Slope=tener pendiente, Landmark=monumento, Rule of thumb=regla general, Radiate=irradiar, Depth=profundidad. Questions: "Paris limits the height of new buildings to how many meters?" (37 meters), "In what decade did a cholera pandemic hit Paris?" (1830s), "How many laborers did Haussmann hire to rebuild Paris?" (10,000), "What material did they use for Paris' facades?" (Limestone), "Napoleon and Haussmann wanted everything rebuilt in time for what event?" (The 1855 World's Fair).
- Segment 2: YouTube URL `https://www.youtube.com/watch?v=TfI9nEKdGfg`, vocabulary: Overrated=sobrevalorado, Hyped=exagerado por el público, Set you up right=te prepara adecuadamente, Walkable=se puede caminar, Hidden gem=algo increíble que nadie conoce, Quintessential=por excelencia (with example: "The arepa is quintessential Colombian food."), French vibes=ambiente francés, FOMO=fear of missing out, Atmosphere=ambiente, Biased=parcial, Stick with=quedarse con, Starter=entrada, Main (dish)=plato principal, Overwhelming=abrumador, Big crowds=grandes multitudes. Questions: "Where should you have breakfast in Paris?" (Local bakery), "Do Parisians usually wake up early or late?" (Late), "Is French onion soup common in France?" (No), "Does she recommend going to Le Louvre?" (No), "Where is the best view of the Eiffel tower without dealing with the big crowds?" (Across the river).
- Segment 3: Same YouTube URL `https://www.youtube.com/watch?v=TfI9nEKdGfg` (timestamp 6:57), vocabulary: Chill=relax, Welcome break=merecido descanso, Under the radar=poco conocido, Budget=presupuesto, Artsy=artístico (with example: "It has a very artsy feel."). Questions: "What is the national sport of Paris?" (People watching), "How long can you stay in French cafés?" (However long you want), "What's the best mode of transport for a tourist in Paris?" (Your feet).

## Supabase Realtime (YouTube sync)

Reuse the exact same pattern from the video summary class for classroom YouTube control:

Subscribe to `course_sessions` changes (filter by `id`). When `video_playing`, `video_seconds`, or `video_rate` changes, update the student's YouTube player state. The teacher's controls call a server action that updates these fields on the session row.

The YouTube embed should use the YouTube IFrame API (or react-youtube package if already in use) to:
- Play when `video_playing` is true
- Pause when `video_playing` is false
- Seek to `video_seconds` when it changes significantly
- Set playback rate to `video_rate`

In classroom mode: students see the video but the play/pause/scrub controls are hidden or disabled. They see a "Toca el video para oír" overlay (same pattern as video summary).

In review/consumer mode: normal YouTube controls.

## Design system

Follow `DESIGN.md` at the project root. Paper Light theme.

- Vocabulary cards: Lora for the English word (serif, readable), Roboto Flex for the Spanish translation (sans-serif, secondary color). Cards have a subtle border and padding. Example sentences in italic muted text below.
- Comprehension questions: Lora for the question text. Text areas use the same style as the writing class and story comprehension questions.
- "Ver respuesta" reveal: same pattern as story comprehension — button reveals the answer text below the text area, styled in a subtle highlight.
- Progress dots: same pattern as StorySteps — dots at the top showing which step the student is on.
- YouTube embed: full-width, 16:9 aspect ratio, rounded corners (matches DESIGN.md card radius).
- Warm-up question: displayed in a callout/card style, distinct from segment content.
- Completion screen: simple centered message with a check or similar marker.

## Files to modify

1. `src/lib/activities.ts` — add `"presentation"` to `SessionType`, `isSessionType`, and `sessionTypeLabel`. Update `studentSessionPath` to handle `"presentation"`.
2. `src/lib/sessions.ts` — add `presentation_prompt_id` to `SessionRow`, update `mapSession`, add `resolvePresentationSessionAccess`.
3. `src/types/index.ts` — add `PresentationPrompt`, `PresentationSegment`, `PresentationVocabItem`, `PresentationQuestion` types. Add `presentationPromptId` to `CourseSession`.
4. Teacher session creation page — add "Presentación" as a session type option, fetch presentation prompts for selection.
5. Any file that switches on `session_type` or `SessionType` — add the `"presentation"` case.

## Existing patterns to reuse

| Pattern | Source file | What to reuse |
|---|---|---|
| Session access check | `src/app/exam/page.tsx` + `src/lib/sessions.ts` | Same access resolution flow, all outcomes (invalid/refused/expired/wrong-group) |
| Reveal gating | `src/lib/session-phase.ts` + story comprehension | `answers_revealed` on session, auto-flip at `session_end_time`, teacher manual unlock |
| YouTube Realtime sync | Video summary class (Slice 54) | `video_playing`/`video_seconds`/`video_rate` on session, Supabase Realtime subscription |
| Comprehension question text area + reveal | Story comprehension questions (Slice 8) | Text area styling, "Ver respuesta" button, reveal animation |
| Step-based flow | `src/components/StorySteps.tsx` | Progress dots, pill nav arrows, one-step-at-a-time layout |
| Teacher prompt creation | Group exam prompt creation (Slice 49a) | Form layout, add/remove items, save to catalog table |
| Server actions pattern | `src/app/exam/actions.ts` or `src/app/lesson/[slug]/actions.ts` | Server action structure, Supabase client, error handling |

## Don't build (future)

- **AI feedback on answers** — premium AI tier, future slice. The text areas save answers but no AI grading in this slice. Self-check only (reveal correct answer).
- **Consumer self-study mode** — this slice is classroom only (teacher creates session, students access via session link). Consumer mode (browse presentation library, self-paced) is a future slice.
- **Group work / pair discussion** — Kyle's live class doesn't use group work (vocabulary pre-teaching takes too long). Don't add breakout rooms or pair features.
- **Pronunciation** — no pronunciation work in this class. No IPA, no phonetic respelling, no dictation.
- **Second video pass** — one pass only in classroom mode. Review mode allows replay (inherent to normal YouTube controls), but don't add a "watch again" prompt.

## Kyle's Rules (from PRD Section 10)

Follow all rules in `docs/PRD.md` Section 10. Key ones for this slice:
- No em dashes in UI text. Use colons, periods, or commas.
- UI copy in Spanish for navigation/CTA, English for learning content. "Ver respuesta" not "Reveal answer". "Siguiente video" not "Next video".
- Mobile-first always. Test on 375px width.
- Kyle's voice in all generated text. Direct, warm, no jargon.
- Contractions everywhere in English content.
- Follow the data structure. Don't create new tables or fields without updating the PRD first (already done for this slice).

## Build order

1. Run `supabase/schema-phase5-presentation.sql` on the database
2. Add types to `src/types/index.ts`
3. Update `src/lib/activities.ts` and `src/lib/sessions.ts`
4. Create `src/app/presentation/page.tsx` (server component, access check)
5. Create `src/app/presentation/actions.ts` (server actions)
6. Create `src/components/PresentationPlayer.tsx` (main client component)
7. Add teacher prompt creation page
8. Update teacher session creation to support presentation type
9. Run `npx tsx scripts/seed-presentation.ts` to seed the Paris example
10. Test: open session link as student, verify vocabulary cards, YouTube embed, question text areas, reveal
11. Git commit: "Slice 56: Presentation class (intermediate Class 3 Format A)"
