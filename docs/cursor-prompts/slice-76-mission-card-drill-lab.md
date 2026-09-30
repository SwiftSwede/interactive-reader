# Cursor prompt — mission card + Drill Lab: the student surfaces (Slice 76, ADR 015 Phase 2)

## Context

Read `docs/adr/015-deficiency-queue.md` Decisions 6, 7, and 11, then **`docs/design-overhaul/04-MISSION-CARD.md` — the APPROVED design brief; it governs every visual and UX call in this slice and has zero open decisions**. This slice is the payoff: Slice 74 picks the mission, Slice 75 stores the drills — this slice is the first thing a student sees.

Code reality (verified):
- `src/lib/drills.ts` — `buildDeck`, `recordDrillAttempt` (line 252, admin client, writes `drill_attempt` / `drill_item_graduated`), `toDrillLevel(courseLevel)`, `DECK_SIZE = 6`. Deck input needs: mission tag id, items, the student's state rows, level, now.
- `src/lib/missions.ts` — `getOrCreateActiveMission` (line 240, the lazy picker: runs it, one active row comes back or nothing), `snoozeMission` (line 325, writes `dismissed_until`), `graduateMission`, `graduateClearedMission`. `student_missions.dismissed_until` is live.
- Tag catalogs (`grammar_tags` / `phonetic_tags` / `error_tags`) carry `display_name` — decision 7's mission title source.
- `src/app/dashboard/page.tsx` — student Inicio, server component under `BrowsingShell activeTab="inicio"`. Current order: greeting → `ClassDayCard` → Seguir la lección → two placeholder blocks → **Práctica reciente (line 165 — decision 4 removes this block)** → Este mes.
- `src/app/tools/page.tsx` — 28-line Herramientas stub with the "Próximamente: la biblioteca de sonidos" line.
- `src/lib/session-phase.ts` — the class-day clock utilities. The class-day card computes "today" client-side in the student's local timezone; más tarde uses the same local-day definition.
- RLS: `drill_items` authenticated SELECT; `drill_item_state` student own SELECT/INSERT/UPDATE. Attempt writes go through the server (`recordDrillAttempt`), never client-direct — the event-log rows are service-role inserts.

## Build

### 1. Mission glue in `src/lib/` (small, testable)

- `missionForStudent(userId)`-level helper: `getOrCreateActiveMission` + resolve `display_name` from the right catalog by `tag_type` + `tag_id`. Returns null when the picker finds nothing. **The picker is the supply mechanism** — the card and Lab both call this; there is no separate "assign" step.
- Resolve the student's course level (enrollment → course; see `src/lib/classroom-placement.ts` for how levels resolve) → `toDrillLevel`. No enrollment → no mission anyway; don't special-case.
- Export `isCorrectAnswer(item, answer)` from `drills.ts` (or a sibling): trim, case-insensitive, collapse whitespace; a `translation` answer with `" / "` alternates accepts any alternate; otherwise exact. **No fuzzy matching** — distractors are honest, so close-but-wrong is wrong. Teach items have no answer.

### 2. Inicio mission card — `src/app/dashboard/page.tsx` + `MissionCard` client component

Per the brief's locked placement: after Seguir la lección (join-hero outranks everything on a class day, P03 — do not touch that), before the month card.

- Server: call the mission helper; pass `{ displayName, dismissedUntil }` to a small client component. **No mission → render nothing at all** — absence, never an empty-state card.
- Client `MissionCard`: hides itself when `dismissedUntil` is after local now (next-local-calendar-day semantics, same local "today" as the class-day card). Title = `display_name` (decision 7). One line of honest framing — take the brief's example voice; no hype. ONE action button "Practicar" → `/tools/practica`. Dismissal: "más tarde" as quiet text, not button-shaped; it computes **next local midnight in the student's timezone** and calls a server action wrapping `snoozeMission` (own row only — the action takes the timestamp, not the mission id).
- Visual: smaller than the class card, `ClassDayCard` visual family, existing DESIGN.md tokens. Uncovered pattern → ask Kyle first (ask-gate), then DESIGN.md front matter AND body in the same commit.
- **Remove the Práctica reciente block** (line ~165) — decision 4. Counts stay on `/progress`; do not touch that page.

### 3. Drill Lab entry — `src/app/tools/page.tsx`

One card above the sounds-library placeholder: "Laboratorio de práctica" + current mission `display_name` + **tu colección count** (count of the student's `drill_item_state` rows with `status = 'graduated'`). No percents, no "N of M," no streaks — counts only. No mission → the card shows the Lab is there but there's nothing to practice yet (one quiet line — the Lab is not absence-gated like Inicio; brief decision 5). The sounds-library Próximamente line stays.

### 4. Lab session — new route `src/app/tools/practica/page.tsx` (server) + session client component

- Server: mission helper → if none, quiet empty page (no deck). Otherwise load active `drill_items` for the mission tag + the student's state rows → `buildDeck` → pass deck + per-item metadata (format, content, mcq allowed = `!mcq_used && options exist`) to the client.
- Session view: calm page, one item on screen at a time, text-first, 44px targets, 375px floor, Spanish UI. Ladder order as built by `buildDeck` (teach card first on session 1; mixed after). Formats present in the deck render; `order` has no items yet — nothing to do.
- **Teach card**: serif reading typography, the hook is the content, "Siguiente" advances. **No attempt recorded for teach items** — no state row, not collectible, never scheduled.
- **Typed cloze / translation**: text input (never tapping, except MCQ), submit → POST `/api/drills/attempt` `{ itemId, answer }`. MCQ chips render only when allowed (first round of a brand-new item); picking one fills the input; the answer is still submitted through the same route.
- `/api/drills/attempt`: requireStudent, load the item server-side, `isCorrectAnswer`, then `recordDrillAttempt`. Response: `{ correct, graduated, collectionCount }` — **no deficiency data ever** (ADR 015 Decision 11).
- When a deck item is a re-test (existing state from a prior session or repaso from another tag), the header reads "práctica de repaso" — never "examen".
- Item graduation (3 clean recalls, engine-handled): one quiet line in the session ("Se sumó a tu colección"), collection count grows. No confetti, no toast, no sound. End of deck: calm end screen with the collection count and a link back to Herramientas.
- Mission graduation (teacher clear, `graduateClearedMission`) needs nothing new here — next visit the picker supplies the next mission or Inicio shows nothing.

### 5. Tests

- `isCorrectAnswer`: exact, case/whitespace-insensitive, alternates split on " / ", honest-wrong stays wrong.
- Mission helper: no candidates → null; catalog display name resolution.
- Attempt route: teach items rejected; correct/incorrect state transitions via the engine (reuse drills.ts tests' fake-client pattern); response shape.
- Session/deck: MCQ allowed only when `!mcq_used`; repaso header flag derives from state.
- UI smoke level: render helpers pure where possible. All existing tests stay green; `tsc` clean.

## Constraints

- **Read `product.md` and `DESIGN.md` before any UI work** (AGENTS.md). Uncovered design values → ask Kyle BEFORE inventing; approved inventions update DESIGN.md front matter + body in the same commit.
- No Duolingo mechanics under any name: no streaks, XP, hearts, currencies, countdowns (product.md anti-reference).
- Students see one mission and tu colección — flags, error history, and scores stay structurally absent from student routes.
- No runtime AI. No new migrations (schema is complete from Slices 74–75). No changes to `missions.ts` ranking or `docs/drill-content/`.
- PRD row: Slice 76 (next free; if taken, use the next free number and note it in the header).
- Commit only: the files above, PRD row, this file. Do not sweep the working tree.

## Verification

- Pre-int student with a `make_vs_do` mission: deck ≤ 6, teach card first, no 'int'-only cloze.
- Three correct attempts on one cloze → `drill_item_graduated` once, collection count +1.
- "más tarde" → Inicio card gone locally, Lab still reachable; dismissed_until stored on the active row.
- Student routes leak no deficiency data (grep the response payloads).
