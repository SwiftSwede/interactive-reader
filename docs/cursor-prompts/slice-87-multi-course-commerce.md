# Slice 87: Multi-Course Commerce + Self-Paced Course Structure

> If the PRD slice number is taken, use the next free number and note it in the header.
> Decision record: `docs/adr/016-multi-course-commerce-self-paced.md` (read it first — this slice implements its Decision section).

## Plan review decisions (2026-10-10)

- Each library grants only its own level. Intermediate does not include pre-intermediate. Pronunciation includes pronunciation only. This replaces the cumulative-downward sentence in the ADR.
- Linear unlock is beginner courses only. Pre-intermediate and intermediate lessons stay open in any order.
- Unlock is per course. Finishing beginner course 1 does not gate course 2.
- Continuar stays on the Inicio card until every lesson in that course is completed. "Completaste el curso." is only for that case.
- Enrollment rows are created when Inicio loads, not inside the purchase insert.
- Continuar links to `/lesson/{slug}`.

## Goal

The app currently assumes every course is a monthly Zoom group. This slice makes the data model support self-paced courses and one-time-purchase products, wires access checks, adds teacher admin for creating a self-paced course and ordering its lessons, and gives Inicio the data it needs to show multiple courses with a continue pointer. NO Stripe Checkout yet, NO beginner step engine, NO Inicio visual redesign.

## Scope

### 1. Migration `supabase/migrations/20261009_slice87_multi_course_commerce.sql`

**`courses`** — keep one table (ADR 016):
- Add column `format text NOT NULL DEFAULT 'group'` with CHECK `courses_format_check` ('group' | 'self_paced').
- Drop and recreate `courses_level_check` to include 'beginner': `('pre-intermediate', 'intermediate', 'beginner')`.
- Add `description text`, `is_published boolean NOT NULL DEFAULT false`. (Group courses: is_published irrelevant, default false, teacher UI for groups ignores it.)

**New table `course_lessons`** (ordered lesson structure for self-paced courses):
- `id uuid PK default gen_random_uuid()`
- `course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE`
- `story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE` — beginner lessons are stories rows (storage); they are named LESSONS everywhere in UI.
- `position integer NOT NULL`
- `UNIQUE (course_id, story_id)`
- No unique constraint on (course_id, position): reordering swaps positions transiently; enforce contiguity in app code, not DB.
- Index on (course_id, position).

**New table `products`** (one-time purchase SKUs):
- `id uuid PK`, `name text NOT NULL`, `description text`
- `kind text NOT NULL` CHECK ('library' | 'course' | 'bundle')
- `level text` CHECK `products_level_check` ('beginner' | 'pre-intermediate' | 'intermediate') — the library's level, NULL for bundles
- `price_cents integer` (NULL until Kyle sets a price in admin), `stripe_price_id text` (NULL until the Stripe slice), `is_published boolean NOT NULL DEFAULT false`
- `created_at timestamptz default now()`

**New table `product_items`** (what a product grants):
- `id uuid PK`, `product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `item_type text NOT NULL` CHECK ('course' | 'level_library')
- `course_id uuid REFERENCES courses(id)` — set iff item_type='course'
- `level text REFERENCES-free CHECK` allowing NULL — set iff item_type='level_library'
- App-level invariant (enforce in a Zod validator / admin action, note in comment): exactly one of course_id / level is non-null, matching item_type.

**New table `purchases`** (permanent access):
- `id uuid PK`, `user_id uuid NOT NULL REFERENCES profiles(id)` (or auth.users — match however profiles does it), `product_id uuid NOT NULL REFERENCES products(id)`
- `purchased_at timestamptz default now()`
- `stripe_checkout_session_id text` (nullable — manual grants by Kyle leave it NULL)
- `UNIQUE (user_id, product_id)` (a student owns a product once; re-purchase is a no-op)
- **No ended_at. Purchases are permanent. Do NOT add period windows.**

**RLS:** mirror the existing pattern used for student-owned rows:
- `purchases`: student SELECT own rows (`user_id = auth.uid()`); writes via admin client only (webhook / teacher), no INSERT/UPDATE policies.
- `products`, `product_items`, `course_lessons`: public-authenticated SELECT for published products / enrolled-course lessons is NOT needed this slice — reads go through server libs with the admin client (same as classroom-access.ts). No RLS policies beyond what existing patterns require; document why in the migration comment.

### 2. Access helpers — `src/lib/library-access.ts`

- `getOwnedGrants(userId)`: admin-client query returning { courseIds: Set, levels: Set } from purchases ⨝ product_items (a bundle grants each item separately).
- `studentCanAccessSelfPacedCourse(grants, course)`: true iff course.format='self_paced' AND (course.id in courseIds OR course.level in levels). Library rule is cumulative downward: owning 'intermediate' grants 'intermediate' AND 'pre-intermediate'; owning 'pre-intermediate' grants 'pre-intermediate' only. Encode the ordering `intermediate > pre-intermediate > beginner` explicitly.
- `nextLessonForStudent(userId, courseId)`: course_lessons ordered by position LEFT JOIN user_progress; the next lesson = first with no 'completed' progress row (treat missing row as not started). Returns null when all complete.
- **Linear unlock enforcement:** in the story page load path, when the requested story belongs to a self_paced course_lessons row, allow it only if every lesson at a lower position is 'completed' for this user. v1 enforcement point: server-side check in the loader + a graceful "Completa la lección anterior" state. Earlier lessons stay always accessible.
- Teachers (role='teacher') bypass all of the above for admin/preview (existing Ver-como-estudiante pattern).
- **Do NOT touch `classroom-access.ts` logic for groups.** Group students do NOT get library access, and library buyers do NOT get group access. Two gates, never coupled.

### 3. Teacher admin

- Course create/edit form (`/teacher` routes, follow existing course CRUD from Slice 66): a new "Curso autoguiado" creation path — name, level (incl. beginner), description; no zoom_url, no session scheduling UI.
- Course detail for a self_paced course: an ordered lesson list with add (pick a story with level ≤ course level; search by title) / remove / reorder (up-down buttons are fine, no drag-and-drop needed).
- Products admin page: create a product, choose kind (library = pick level; course = pick course; bundle = pick multiple existing products' items), set price. For this slice a "publish" toggle exists but does nothing consumer-facing yet (no checkout).
- Manual grant: teacher can create a purchase row directly for a student (name/email search) — this is how the first real students get access before Stripe.

### 4. Inicio dashboard data (minimal visual change)

- Extend `loadDashboard`: alongside the existing group-course lanes, load self-paced enrollments + owned levels → `selfPacedCourses: { course, completed, total, nextStoryId | null }[]`.
- Render one card per self-paced course BELOW the existing class card / mission card area, reusing existing card components/tokens (Paper Light). Card = course name, "7/40 lecciones" meter (thin existing progress-bar pattern), Continuar button → `/story/{nextStoryId}` (or the course page if next is null). NO lesson list on Inicio. NO redesign of existing lanes.
- If a student owns a library whose courses aren't enrolled yet: auto-create `course_enrollments` rows for the library's courses at access-check time (or at purchase-grant time — pick ONE moment, document it; recommend grant time in the same transaction as purchase creation).

### 5. Seeds / verification

- Optional seed script `scripts/seed-products.ts` (idempotent, follows seed-knowledge-tags pattern): the four library products (beginner / pre-intermediate / intermediate / pronunciation) at 4700 cents, is_published=false. Do NOT seed made-up courses.
- Unit tests: library-access cumulative rule (own intermediate → grants pre-int; own pre-int → does NOT grant intermediate; beginner course via beginner library), nextLessonForStudent (empty progress → first lesson; mid-progress → correct next; all complete → null), linear unlock (blocked at gap, allowed on prior lessons), bundle grant expansion.
- `npx tsc --noEmit` clean; run the touched test files with `npx tsx --test`.
- Migration probe: after applying, run the seeder script once as the migration-applied probe (per ADR 007 pattern / seed-knowledge-tags precedent); `head: true, count: 'exact'` selects confirm products/purchases/course_lessons exist live.

## Out of scope (explicit)

- Stripe Checkout route + webhook for purchases (next slice).
- Beginner lesson content model, Iplo turn engine, per-line audio playback (blocked on ADR 016 consequences).
- Inicio visual redesign, recommendations, choose-your-own-path browsing for pre-int/int.
- Any change to group class access, subscription_periods, or course_sessions.

## Honesty rules

- Beginner lessons UI copy says LECCIONES, never "historias/stories" (ADR 016).
- Spanish UI copy carries written accents; no em dashes anywhere.
- If a listed column/FK doesn't match the live baseline migration, re-verify against the latest migration file and note the deviation in the PR, don't silently adapt.
