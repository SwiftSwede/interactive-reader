# ADR 015: Deficiency queue — event log, missions, drills (amends ADR 009)

## Context

The app records rich learning evidence, but almost none of it survives or compounds:

- `word_flag_requests` ("No entendí" taps) are deleted per-session on teardown with no rollup — the per-student lexical signal dies when a session archives.
- `check-answer` computes correction diffs (13 L1 rules in its SYSTEM_PROMPT) but persists nothing.
- `user_topic_evidence` holds sticky-rule state, but conversation-class observations never enter it; machine sources set flags and nothing clears them.
- `pronunciation_attempts` holds per-phoneme weak sounds; `/teacher/analytics` is an empty stub waiting on a rollup.
- Nothing turns any of this into student-facing practice. Deficiencies are invisible to Kyle between classes and to students entirely by design.

Brainstorm provenance: proposed 2026-09-22, ratified with Kyle 2026-09-28. This ADR records the ratified design.

## Decision

1. **P0 guardrail: rollup before teardown.** Before session teardown deletes `word_flag_requests`, aggregate them into a per-student per-word rollup (user, word, count, last_flagged_at). This amends ADR 009 §4: requests remain session-scoped live signals, but the per-student signal is now durable. The same slice starts event-log writes (below). This is the first slice to build.

2. **Event log (the "diary").** New append-only `learning_events` table: user, typed `event_type`, occurred_at, nullable session context, jsonb detail. Meaningful learning events only (flag tap, drill attempt, re-test result, graduation, teacher observation) — no UI telemetry. Rows are never updated or deleted. `user_topic_evidence` remains the "whiteboard" (current state) built on top; the log is the history that spaced graduation, palabras-más-consultadas counts, and unknown future questions read. Zero AI cost.

3. **Error tags: fourth seed family in knowledge-tags.** Add an `error` family to `knowledge-tags.ts` alongside grammar/vocabulary/phonetic: the 13 L1 rules already enumerated in `check-answer`'s SYSTEM_PROMPT, plus `preposition_partner`, `false_friend`, `make_vs_do`, `say_vs_tell`, `countability`, `age_expression` ("I have 25 years"), `participle_adjectives` ("I am boring"), `for_vs_since`. A tag is the trap family; the specific pair (depend ON vs married TO) rides in evidence detail. Growth loop: Ficha notes → recurring pattern → Kyle ratifies a new tag. Nothing auto-generated. `check-answer`'s response JSON gains an enum-constrained `error_tags` field; unknown tags are dropped deterministically, and tagging rides the existing call — no new AI cost.

4. **Teacher tagging: `teacher_observation` evidence source.** New source type in topic-evidence.ts — the only source allowed to both SET and CLEAR sticky `needs_more_practice` (machines set, judgment clears). Two moments: end-class roster (EndClassButton → per-student tag chips, ~30 seconds, after screen-share ends) and the Ficha anytime. Tag entry is autocomplete over the controlled vocabulary; misses become free-text notes (ADR 014 pattern). This closes the conversation-class blind spot.

5. **Graduation is cheap by design.** Two spaced machine wins (re-test now + popup re-test 1–2 weeks later) OR one teacher-on-sight tap. False graduation is acceptable — the sticky rule re-flags on regression automatically. No due dates, no streaks, no guilt mechanics.

6. **Mission lane.** Each student has ONE visible mission, chosen by prerequisite-graph priority (lowest-hanging fruit first); other deficiencies stay invisible until graduation. Drill ladder: teach card (Kyle's honest memory hook, e.g. "No hay lógica. 'Depend ON'. Memorízalo.") → typed cloze (MCQ first round only, never again) → phrase- then sentence-level translation → order-the-sentence for word-order errors only. Interleave TARGETS within a session (never a single-tag session); the first session of a new mission is focused, mixing starts session 2. Spacing ~2d → 1wk → 2wk; 3 clean recalls graduate an item. Deck = current mission + repaso drawn from graduated items; sessions stay ~6 items forever. Re-tests are labeled "práctica de repaso," never "examen."

7. **Placement.** Mission card on Inicio under today's class card (rank by size; input outranks drills). Drill Lab lives inside the existing Herramientas tab — no new bottom-nav tab. The card is dismissable ("más tarde"). Exact visual design is deferred to the design-overhaul workstream (see Design governance).

8. **New sensors.** Dictation error capture (Phase 1): log misspellings → phonetic tags (bitch/beach → short_i); logging only, no new UI. Speed reading: keep the self-timed ritual, texts drawn from consumed content, WPM into milestones only (never a live line). Minimal pairs (Phase 3): 6-pair placement micro-test with varied voices via the existing multi-voice dialogue pipeline; 5/6 correct auto-graduates the family, otherwise it enters the queue. All three draw texts from content the student already consumed.

9. **Sound banks.** Build the top 8–10 LatAm struggle sounds first (th, v/b, ɪ vs iː, schwa, -ed, -s, R, dark L, linking). Demand rule: ≥3 distinct students flagged on a tag → build that bank next; check monthly from the Analíticas rollup (teacher observations count). Verdict rule: 4+ of 6–8 sample words weak = pattern → sticky flag; 1 weak word = isolated, no flag.

10. **Authorship.** Drill cloze sentences: AI-draft, Kyle-edit, under the drill style guide. Core rules: premises LatAm-relevant; vocabulary drawn from the student's consumed content; one target per item, no trick combinations; honest distractors; no invented culture. Memory hooks: Kyle only, never AI. Word banks: AI proposes, Kyle ratifies. Story bodies remain untouchable. The Phase 2 drill-content slice extracts the full guide to `docs/drill-style-guide.md` so it is Cursor-readable.

11. **Visibility line.** Students see effort, coverage, their mission, "tu colección" of graduated items, and WPM milestones. Deficiencies, error history, and the Ficha are structurally absent from student routes — not hidden, absent (Guiding Principle 20). Raw `learning_events` are teacher/system-only via RLS; student-visible numbers are served through derived projections, never direct log reads. No gradebook, ever.

12. **Phasing.** P0 guardrail → Phase 1 (teacher-facing: event log, check-answer tag piggyback, end-class roster tagging, Ficha, Analíticas rollup) → Phase 2 (mission lane, Drill Lab, territory map, dictation error capture, speed reading) → Phase 3 (sound banks, minimal pairs, pre-class AI briefing ~16 calls/mo — skippable in months where nothing is interesting).

## Design governance

The repo's ask-gate (`.cursorrules` UI Design North Stars: uncovered design values require Kyle's approval BEFORE invention, then DESIGN.md updates in the same commit) governs all visual work in this ADR and is deliberately not restated here — one source of truth. Three additions the gate alone does not cover:

- Mission card and Drill Lab are new student-facing surfaces. Their visual design is deferred: before that slice runs, it must be settled by the design-overhaul workstream (`docs/design-overhaul/03-RECOMMENDATIONS.md` decisions + a targeted `04-MISSION-CARD.md` brief citing existing Mobbin captures). If the brief does not exist when the slice starts, ask — do not invent.
- The drill surfaces must not drift toward Duolingo-style mechanics (product.md anti-reference): no streaks, XP, hearts, currencies, countdowns. Progress reads as a growing collection, not a score.
- When the new surfaces introduce approved patterns, product.md and DESIGN.md (front matter AND body) update in the same slice commit.

## Consequences

- New tables (rollup, learning_events, mission/drill state) each get RLS on creation; no student policy exposes deficiency data (Decision 11).
- ADR 009 §4 is amended by Decision 1; ADR 009 stands otherwise.
- `/teacher/analytics` stub gets its rollup in Phase 1; the Ficha extends the existing student detail view at `/teacher/students/[id]`.
- Zero marginal AI cost through Phase 2: check-answer tagging rides the existing call, Azure pronunciation is already in prod, drill-cloze drafting is batched and Kyle-edited. The only new AI line items are the Phase 3 briefing generator and drill-content drafting.
- `teacher_observation` joins the evidence sources in topic-evidence.ts; machine sources set flags, only teacher judgment clears them.
- The end-class roster moment adds ~30 seconds to the existing EndClassButton flow, after screen-share ends, not during class.
