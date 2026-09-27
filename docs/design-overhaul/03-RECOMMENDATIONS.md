# Step 3 — Design Recommendations (Cursor writes, Kyle decides)

**Working agreement:** each proposal is standalone, references an audit finding + a Mobbin pattern, and checks every constraint in `00-BRIEF.md`. Nothing is implemented until its status is ✅ Approved by Kyle. Cursor never edits a status line.

## Proposal format (copy per proposal)

```
## P## — [Short title]

**Status:** ⬜ Pending  (Kyle sets: ✅ Approved / ❌ Rejected / 🔁 Deferred)

**Audit finding:** [## from 01-AUDIT.md — what currently exists / is missing]
**Pattern evidence:** [Mobbin capture or Manus report section]
**Proposed change:** [concrete: what screen, what component, what behavior]
**Constraint check:** [confirm against 00-BRIEF.md hard constraints — any violation kills it]
**Effort:** S / M / L (files touched, roughly)
**Risk:** [what could break / what persona would hate about it]
```

## Ordering rule

Group proposals into waves so Kyle can review in short sessions:

- **Wave 1 — Reader experience** (A1–A8): typography, tap-word sheet, sentence audio, IPA, comprehension checks. Highest persona impact.
- **Wave 2 — Shell & navigation** (B9–B12): bottom nav, Home continue card, deep-link entry.
- **Wave 3 — Sistema de 8 surfaces** (C13–C15): lesson-type page consistency, class mirror.
- **Wave 4 — Visual system** (E18–E21): the light-vs-dark theme question (present BOTH options neutrally with mockups — do NOT assume Manus's dark theme wins over Paper Light), tokens, states, accessibility.
- **Wave 5 — Pressure-language cleanup** (F22): every Lighthouse violation found in audit, as one proposal per surface.

## Special decision: visual theme

The single biggest open question. Manus proposed a dark graphite/warm-paper/teal system; the app currently ships Paper Light (warm off-white, terracotta, moss green, Lora). These are different philosophies:
- **Dark museum** = stronger Lighthouse filter, premium reading-room mood, but a full re-theme of every existing component.
- **Evolved Paper Light** = keeps shipped work, terracotta already carries warmth; can adopt Manus's structural patterns (typography scale, spacing, quiet accents) without a dark rewrite.

Present this as proposal #1 with both directions mocked. Kyle decides; everything in Wave 4 cascades from it.

---

## Proposals

*(Cursor appends proposals below, newest wave last. Do not reorder or delete.)*
