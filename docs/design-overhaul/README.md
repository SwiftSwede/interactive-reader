# Design Overhaul — Entry Point (Cursor: read this first)

A four-step design overhaul workflow, kickstarted by the Manus competitive report (`~/Downloads/Profe Kyle — Competitive Design & Market-Positioning Report.md`).

**Order of operations:**

1. Read `00-BRIEF.md` — user persona, problems, hard constraints, north stars, Manus decisions. Everything else depends on this.
2. Do `01-AUDIT.md` — audit the current app, pattern by pattern. Code + DESIGN.md. No recommendations.
3. Do `02-MOBBIN-GUIDE.md` — Mobbin pattern research mapped to audit findings. Capture patterns with sources, not vibes.
4. Write `03-RECOMMENDATIONS.md` — one proposal per change, in waves, using the format inside. Kyle approves/rejects/defers each. **Nothing is implemented until its Status is ✅ Approved by Kyle.**

**Rules:**
- DESIGN.md remains the final authority on visual decisions; approved proposals update it.
- Never violate the hard constraints in 00-BRIEF.md (no gamification, no pressure language, value-before-signup, 375px floor, input-first, $0 infra).
- Theme is decided: Paper Light. Do not reopen dark vs light in proposals.
- Build discipline per .cursorrules: `npx tsc --noEmit` + tests before any push touching src/.
