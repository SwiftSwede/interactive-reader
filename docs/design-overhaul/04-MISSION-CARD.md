# 04 — Mission Card + Drill Lab: Design Brief (ADR 015 Phase 2 student surfaces)

**Status:** ✅ Approved (Kyle, 2026-09-29: placement and Lab rules below). **Do not implement UI or schema until ADR 015 Phase 2** (mission picker, authored drills, graduation writes). Empty Inicio must not show a fake card.

**Purpose:** the design input for the two new student-facing surfaces ADR 015 calls for (Decisions 6–7 + design-governance riders). Cites the patterns already captured in `02-MOBBIN-GUIDE.md` — no new capture session needed. DESIGN.md stays the final authority; approved decisions here update it in the **Phase 2 slice commit**, not in a docs-only pass.

## Kyle decisions (2026-09-29)

Recorded from chat so Phase 2 does not ship Hermes’s stripped home or a premature library.

| # | Decision | Implication |
|---|---|---|
| 1 | Keep Circle Inicio’s eight | Greeting, class-day card, Seguir la lección, month bar, Este mes. Rank the mission; do not delete the month. |
| 2 | Reject “class card + mission, nothing else” | ADR 015 Decision 7 still holds: mission under today’s class, input outranks drills. Rank, not deletion. |
| 3 | Inicio order when a mission exists | See §1 Placement. Join hero still wins over Continue and mission (P03). |
| 4 | Drop Práctica reciente from Inicio | Dictado / Palabras / Pronunciación counts stay on `/progress` only. Phase 2 removes the Inicio block. |
| 5 | “más tarde” | Hides the **Inicio card** until the **next calendar day** in the student’s local timezone (same “today” as the class-day card). Not 24h. Not until next visit. **Herramientas / Drill Lab stays available.** |
| 6 | Graduation | Card leaves Inicio. Quiet card-state change with one line on the Lab, not a toast. **No next-mission carousel.** One mission; picker supplies the next when it runs. |
| 7 | Mission title | Tag display name now. Kyle-written labels wait on the Phase 3 briefing generator. |
| 8 | Lab percents vs library percents | Drill Lab: counts only (`tu colección`). No percents, no “N of M left,” no streaks. That ban does **not** forbid a later **Lecciones / consumer library** percent for *how far through this title* (Audible-style). Two meters, two jobs. Do not freeze library progress in this brief. |
| 9 | Audible library | Type chips, word count, difficulty, per-title percent: **later consumer / Lecciones slice.** Not Phase 2. Circle students keep assigned-session rows. True title percents need a last-step field `user_progress` does not have yet. |

## The visibility frame (governs everything below)

Students see **one mission** and **tu colección** (a growing pile of graduated items). They never see flags, error history, scores, or any deficiency data — structurally absent, not hidden (ADR 015 Decision 11, Guiding Principle 20). The card and the Lab are an invitation, not a report card.

## 1. Mission card — Inicio

**Placement (locked):** Circle Inicio stays the month’s class, plus one ranked drill invite.

1. Greeting
2. Class-day card (only when there is a session today). Join window: terracotta join hero only; no Continue, no mission above or instead of it (P03).
3. Seguir la lección (omit when empty or during join). P03 already shipped; Phase 2 must not delete it.
4. Mission card (smaller than the class card; omit if no mission or dismissed until the next local calendar day)
5. Month progress card → `/progress`
6. Este mes (the eight)

Headspace “rows grouped by moment”: finite rows, skip illustrations. Spotify: one resume row, then the finite month. Never a Netflix catalog on Inicio. Never “class card + mission, nothing else.”

**Contents:** mission title · one line of honest framing · one primary action · one quiet dismissal.
- Title: the mission's display name, Spanish, Kyle's voice (e.g. "Preposiciones: depend ON"). Source: tag display name (decision 7).
- Framing line: honest, no hype ("No hay lógica. 'Depend ON'. Practícalo cuando quieras.").
- Action: ONE button — "Practicar" → opens the Drill Lab. Single next action, Headspace "Continue as one button" pattern: no check-circle completion trail, no path of green dots.
- Dismissal: "más tarde" as quiet text, not a button-shaped control. Semantics: decision 5.

**States:**
- No mission → **nothing renders.** Absence, not an empty-state card.
- Active mission → the card in the order above.
- Dismissed today → nothing on Inicio until the next local calendar day; Lab entry unchanged.
- Graduation → the mission card leaves Inicio; the item appears in "tu colección" inside the Drill Lab. A quiet confirmation line, never confetti/streak/XP. Duolingo captures are the standing negative reference: pattern skeleton yes, engagement mechanics no. No replacement card until the picker assigns the next mission.

## 2. Drill Lab — Herramientas

**Entry:** inside the existing Herramientas tab — no new bottom-nav tab (ADR 015 Decision 7). One card: "Laboratorio de práctica" + current mission name + item count. Sessions stay ~6 items forever: current mission + repaso from graduated items. Phase 2 replaces today’s Próximamente empty. Sounds library still later.

**Session view:** calm page in the Blinkist / Apple Books "quiet page" register — text first, minimal controls, 44px targets. One item on screen at a time. When items are re-tests, the header reads "práctica de repaso" — never "examen."

**The ladder (one mission, mixed TARGETS after session 1):**
1. **Teach card** — Kyle's honest memory hook, serif reading typography. The hook IS the content.
2. **Typed cloze** — typing, not tapping; MCQ only for a brand-new item's first round, never again.
3. **Translation** — phrase level first, full sentence for intermediate.
4. **Order-the-sentence** — word-order errors only.

**Progress:** "tu colección" — a count of graduated items, growing over time. Counts only; no percents, no "N of M left," no streak-shaped anything. Blinkist "time left" and Apple Books *accuracy / time-left* pressure stay out of the Lab. Title-completion percent on a future library is out of scope here (decision 8–9).

## Hard constraints

- No Duolingo mechanics under any name: streaks, XP, hearts, currencies, countdowns (product.md anti-reference).
- Paper Light, existing DESIGN.md tokens only. Uncovered pattern → ask Kyle first (`.cursorrules` ask-gate), then DESIGN.md front matter AND body update in the same slice commit.
- 375px floor, 44px targets, Spanish student UI, IPA everywhere if sounds appear.
- No runtime AI: drill content is authored offline under the drill style guide (ADR 015 Decision 10).
- No `src/` for this brief. No mission card, no Lab, no Audible Lecciones, no `user_progress` last-step percent until their slices.

## Open decisions

None. Kyle 2026-09-29 closed Hermes’s three parentheses (más tarde = next local calendar day, Inicio card only; graduation = card-state change; title = display name now).
