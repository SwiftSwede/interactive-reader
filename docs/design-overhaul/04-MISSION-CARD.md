# 04 — Mission Card + Drill Lab: Design Brief (ADR 015 Phase 2 student surfaces)

**Status:** ⬜ Pending — Kyle approves/rejects this brief before the Phase 2 slice runs. Nothing implements until ✅.

**Purpose:** the design input for the two new student-facing surfaces ADR 015 calls for (Decisions 6–7 + design-governance riders). Cites the patterns already captured in `02-MOBBIN-GUIDE.md` — no new capture session needed. DESIGN.md stays the final authority; approved decisions here update it in the same slice commit.

## The visibility frame (governs everything below)

Students see **one mission** and **tu colección** (a growing pile of graduated items). They never see flags, error history, scores, or any deficiency data — structurally absent, not hidden (ADR 015 Decision 11, Guiding Principle 20). The card and the Lab are an invitation, not a report card.

## 1. Mission card — Inicio

**Placement:** directly under today's class card. Rank by size: class card and lesson input always outrank drills. The page stays finite — class card, mission card, nothing else. (Headspace "Rows grouped by moment": finite rows, skip the illustrations. Spotify "Start listening plus recents": one resume row, then the finite month. Never the Netflix catalog arms race.)

**Contents:** mission title · one line of honest framing · one primary action · one quiet dismissal.
- Title: the mission's display name, Spanish, Kyle's voice (e.g. "Preposiciones: depend ON").
- Framing line: honest, no hype ("No hay lógica. 'Depend ON'. Practícalo cuando quieras.").
- Action: ONE button — "Practicar" → opens the Drill Lab. Single next action, Headspace "Continue as one button" pattern: no check-circle completion trail, no path of green dots.
- Dismissal: "más tarde" as quiet text, not a button-shaped control.

**States:**
- No mission → **nothing renders.** Absence, not an empty-state card.
- Active mission → the card above.
- Graduation → the mission card leaves Inicio; the item appears in "tu colección" inside the Drill Lab. A quiet confirmation line, never confetti/streak/XP. Duolingo captures are the standing negative reference: pattern skeleton yes, engagement mechanics no.

## 2. Drill Lab — Herramientas

**Entry:** inside the existing Herramientas tab — no new bottom-nav tab (ADR 015 Decision 7). One card: "Laboratorio de práctica" + current mission name + item count. Sessions stay ~6 items forever: current mission + repaso from graduated items.

**Session view:** calm page in the Blinkist / Apple Books "quiet page" register — text first, minimal controls, 44px targets. One item on screen at a time. When items are re-tests, the header reads "práctica de repaso" — never "examen."

**The ladder (one mission, mixed TARGETS after session 1):**
1. **Teach card** — Kyle's honest memory hook, serif reading typography. The hook IS the content.
2. **Typed cloze** — typing, not tapping; MCQ only for a brand-new item's first round, never again.
3. **Translation** — phrase level first, full sentence for intermediate.
4. **Order-the-sentence** — word-order errors only.

**Progress:** "tu colección" — a count of graduated items, growing over time. Counts only; no percents, no "N of M left" (Blinkist "time left" and Apple Books percents are captured as pressure language — avoid), no streak-shaped anything.

## Hard constraints

- No Duolingo mechanics under any name: streaks, XP, hearts, currencies, countdowns (product.md anti-reference).
- Paper Light, existing DESIGN.md tokens only. Uncovered pattern → ask Kyle first (`.cursorrules` ask-gate), then DESIGN.md front matter AND body update in the same slice commit.
- 375px floor, 44px targets, Spanish student UI, IPA everywhere if sounds appear.
- No runtime AI: drill content is authored offline under the drill style guide (ADR 015 Decision 10).

## Open decisions (Kyle — my call in parentheses)

1. **"más tarde" semantics:** hides until tomorrow, or until next visit? (Until tomorrow — a standing invitation, not a nag.)
2. **Graduation moment:** quiet card-state change with one line, or a toast? (Card-state change — a toast is app noise.)
3. **Mission title source:** tag display name, or a Kyle-written label per family? (Display name now; Kyle-written labels ride the Phase 3 briefing generator.)
