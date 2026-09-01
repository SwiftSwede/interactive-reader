# Cursor Implementation Prompt: Teacher Content Editor (Slice 55)

## Context

The interactive reader app at `/Users/kylote/Desktop/WebDev/interactive-reader/` is a Next.js 14+ App Router project. Teachers currently edit story content by running terminal scripts or accessing the Supabase dashboard. We need a teacher-facing content editor in the web app so Kyle (and future teachers) can make small edits to stories without AI, scripts, or database access.

## What to build

A new route: `/teacher/stories/[slug]/edit`

This is a teacher-only page (role check: `profile.role === "teacher"`) that lets the teacher edit story content fields directly in the database. No AI, no re-annotation, no re-seeding.

## Existing patterns to follow

- **Teacher routes** live in `src/app/teacher/`. Look at `src/app/teacher/classes/[id]/page.tsx` for the pattern: server component fetches data, renders client component for interactivity.
- **Auth** is handled by `src/lib/auth-server.ts` → `getProfile(user.id)` returns the profile with `role`. Check `role === "teacher"` and redirect if not.
- **Supabase** server client: `src/lib/supabase/server.ts` → `createClient()`.
- **Story data loading**: `src/lib/stories.ts` → `getStoryBySlug()` returns `LoadedStory` with `story`, `words`, `expressions`, `comprehensionQuestions`, `personalQuestions`, `pronunciationDrill`.
- **Design system**: Read `DESIGN.md` at the project root. Paper Light theme. Max-width 672px centered. Lora for headings, Roboto Flex for UI. Use existing Tailwind tokens (`bg-paper`, `text-text-primary`, `border-paper-line`, `rounded-card`, etc.).
- **Server actions**: Look at `src/app/teacher/classes/[id]/actions.ts` for the "use server" pattern. All mutations go through server actions.
- **Back link**: Use the existing `BackLink` component (`src/components/BackLink.tsx`).

## Page structure

### Server component: `src/app/teacher/stories/[slug]/edit/page.tsx`

1. Get slug from params
2. Auth check: get user, get profile, verify role === "teacher"
3. Load story by slug using `getStoryBySlug()`
4. If story not found, show "No encontré esa historia" message
5. Load the pronunciation drill (already in `LoadedStory.pronunciationDrill`)
6. Render the client component with all editable data

### Client component: `src/app/teacher/stories/[slug]/edit/ContentEditor.tsx`

Sections (each is a card with a header and editable fields):

**1. Story**
- `title` — text input
- `body_text` — large textarea, monospace font, min-height 400px
- Save button per section

**2. Comprehension Questions**
- List of questions, each with:
  - `question` — textarea (1-2 lines)
  - `answer` — text input (can be empty for intermediate inference questions)
  - Delete button (trash icon)
  - Drag handle for reordering (or up/down arrows — simpler)
- "Add question" button at the bottom
- Save button per section

**3. Personal Questions**
- Same pattern as comprehension questions
- `question` — textarea
- Add/delete/reorder
- Save button per section

**4. Pronunciation Drill**
- `focus_type` — dropdown (select): "sounds" | "ed-s-rules" | "emphasized-syllable"
- `symbol_legend` — textarea (the phonetic symbol legend block)
- `focus_content` — textarea (usually same as symbol_legend)
- `practica_coral_standard` — text input (the Práctica Coral sentence in standard spelling)
- `practica_coral_phonetic` — text input (Kyle's phonetic respelling)
- `practica_coral_ipa` — text input (IPA transcription)
- Save button per section

### Server actions: `src/app/teacher/stories/[slug]/edit/actions.ts`

"use server" functions that update the database:

```typescript
// Update story title and body_text
export async function updateStory(slug: string, title: string, bodyText: string): Promise<{ ok: boolean; error?: string }>

// Update comprehension questions (full replace: delete all, insert new)
export async function updateComprehensionQuestions(storyId: string, questions: { question: string; answer: string | null }[]): Promise<{ ok: boolean; error?: string }>

// Update personal questions (full replace)
export async function updatePersonalQuestions(storyId: string, questions: string[]): Promise<{ ok: boolean; error?: string }>

// Update pronunciation drill
export async function updatePronunciationDrill(storyId: string, fields: {
  focus_type: string;
  symbol_legend: string | null;
  focus_content: string | null;
  practica_coral_standard: string | null;
  practica_coral_phonetic: string | null;
  practica_coral_ipa: string | null;
}): Promise<{ ok: boolean; error?: string }>
```

Each action uses the Supabase server client with the service role key (already available via `src/lib/supabase/admin.ts` → `createAdminClient()` for writes that bypass RLS).

For comprehension and personal questions: the simplest approach is delete-all-then-insert (same as the seed script does). This handles add/delete/reorder naturally — the client sends the full list, the server replaces it.

### Navigation entry point

Add an "Editar contenido" link button on the existing teacher course detail page (`/teacher/classes/[id]/page.tsx`) or on the session detail page, next to each story assignment. The link goes to `/teacher/stories/[slug]/edit`.

Also add a link from the teacher dashboard (`/teacher`) — a simple list of all stories with edit buttons. This can be a new section on the existing `/teacher` page or a new route `/teacher/stories` that lists all stories with edit links.

## What NOT to edit

- **Word annotations** (words table, expressions table) — these are managed by the annotation script. The editor does not touch them.
- **Audio files** — managed by file drops into `public/audio/stories/`.
- **Course sessions** — managed by the existing session creation flow.

## Design notes

- Follow DESIGN.md: Paper Light theme, 672px centered, card-based sections
- Each section is a card with a header, editable fields, and a save button
- Save button shows "Guardando..." while saving, "Guardado" briefly after, then returns to normal
- No confirmation dialog needed — these are small text edits, not destructive operations
- The body_text textarea should be monospace and large enough to read a full story
- Add a "Ver en el sitio" link that opens the story page in a new tab (`/story/[slug]`)

## Verification

1. Go to `/teacher/stories/one-of-these-days/edit` as a teacher
2. Edit the Práctica Coral IPA field
3. Save
4. Open `/story/one-of-these-days` — verify the IPA change appears
5. Edit a comprehension question answer
6. Save
7. Reload the story page — verify the answer changed
8. Add a new comprehension question
9. Save
10. Reload — verify it appears
11. Delete a question
12. Save
13. Reload — verify it's gone
