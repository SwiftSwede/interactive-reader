# Cursor prompt — fix-6: teach card structure + typography (Slice 76 follow-up)

## Context

Kyle tested the Drill Lab teach card and it reads as a raw markdown wall of text. Diagnosis (verified in code): `parseInlineMarks` in `src/lib/drill-session.ts` DOES parse `**strong**`/`*em*`, but `DrillSession.tsx` renders the whole hook as ONE `<p>` — explanation, examples, and asides all inline. The fix is structural: extract the hook's implicit structure at seed time and render a designed card. **The authored files in `docs/drill-content/` do not change.**

Read `docs/design-overhaul/04-MISSION-CARD.md` §2 (session view register: calm page, text first) and DESIGN.md before UI work.

## Diagnosis facts

- `HOOK_RE` in `src/lib/parse-drill-content.ts` captures the one-line hook paragraph after `**HOOK (...):**`.
- All three hooks (`docs/drill-content/*.md`) follow one convention: `**CAPS keywords**` mark the rules; example sentences sit in `*italics*` directly after an em-dash (`— *I'll make some pancakes...*`); bare italics like `*hacer*` are word mentions, NOT examples.
- Teach items never receive `drill_item_state` rows (Slice 76: teach records no attempts), so replacing teach rows in the DB is safe — nothing references them.

## Build

### 1. Parser: extract hook structure — `src/lib/parse-drill-content.ts`

New export `parseHookStructure(hook: string)` returning:

```ts
type HookStructure = {
  lead: string;          // explanation text with **strong** kept inline; bare *em* word mentions kept inline
  examples: string[];    // each em-dash-prefixed *italic* group becomes one entry (marks stripped)
  closing: string | null; // the final quiet aside after the last example group, if the paragraph ends with one
};
```

Rule: an italic span extracts to `examples` only when it directly follows an em-dash in the source (`— *...*` with optional surrounding spaces). Everything else stays inline in `lead`. The split must reproduce sensibly for all three real hooks — write the parser against the actual file contents, not a mental model. Verify `make-vs-do.md` splits to: lead ending at "el trabajo:", two example groups (make + do), the exception aside as closing. Check what `age-expression.md` and `present-perfect.md` hooks produce and handle their shapes (a hook with zero em-dash groups is valid — lead only).

### 2. Seeder: teach content becomes structured — `scripts/seed-drill-content.ts`

- Teach `content` shape: `{ lead, examples, sourceUrl }` (closing folded into `lead`'s end or kept as `closing` — pick one, document it in the prompt's plan-review if it changes).
- **Teach upsert changes key to `(tag_id, format)`** (one teach per tag): update the existing row's content instead of inserting a duplicate when the hook text changes. Cloze/translation idempotency keys stay as they are.
- Keep the strict totals guard (3 teach + 26 cloze + 12 translation).
- Update SCRIPTS.md: one re-run replaces the three teach rows (safe — no state rows reference them).

### 3. Session view: a designed card — `src/components/drills/DrillSession.tsx`

Replace the single-paragraph teach render with a structured card:

- **Lead**: serif reading typography (`text-story-body` family), `**strong**` rendered bold via the existing span parser; bare italic mentions render as `<em>`.
- **Examples**: each group on its own line(s), offset — indented with a subtle left rule, italic serif, generous line height. Reuse existing DESIGN.md tokens/patterns (paper-line, surface tokens); if a quote-line pattern is uncovered, ask Kyle before inventing, then DESIGN.md front matter + body in the same commit.
- **Closing** (if present): smaller, `text-text-muted`, set apart by spacing — quiet, Kyle's voice.
- 375px floor, 44px targets unchanged. "Siguiente" behavior unchanged. No new states, no attempts.

### 4. Tests

- `parseHookStructure`: all three real hooks (lead/examples/closing counts asserted), em-dash rule (bare `*hacer*` stays inline), zero-example hook valid.
- Seeder: teach re-run updates in place (no duplicate rows) — extend the existing seed test pattern.
- Drill-session: teach card renders lead + N example blocks; existing parseInlineMarks tests stay green.
- All existing tests stay green; `tsc` clean.

## Constraints

- No changes to `docs/drill-content/` (authored input), missions, drills engine spacing/graduation, or the attempt route.
- No new migrations. No new AI. Student UI in Spanish.
- Commit only: parser + its tests, seeder + SCRIPTS.md, drill-session lib/tests, DrillSession.tsx, DESIGN.md (if a pattern is approved), PRD note appended to the Slice 76 row, this file. Do not sweep the working tree.

## Verification

- Re-run `npx tsx scripts/seed-drill-content.ts` → 3 teach rows updated in place, 0 new cloze/translation inserts, totals guard passes.
- `/tools/practica` teach card for `make_vs_do`: lead paragraph with bold MAKE/DO, two offset example lines, quiet closing line. No literal `*` or `**` anywhere in the rendered card.
- Re-run seeder again → still 3 teach rows (no duplicates).

## Plan review decisions

- **Closing stays its own field.** Teach `content` is `{ lead, examples, closing?, sourceUrl }` (plus `wordBank` when present). Closing is not folded into `lead`: the card sets it in `body-main` `--text-muted`.
- **make-vs-do lead includes the MAKE/DO rules.** The authored paragraph does not end the lead at "el trabajo:". Example groups are only the em-dash italic sentences; interstitial "Usa **DO**…" is joined onto the lead (with a period) so bold MAKE/DO stay in the explanation. `age_expression` and `present_perfect` have zero em-dash groups (lead only).
- **Quote-line pattern** for examples: existing tokens only (1px `--paper-line` left rule, 16px indent, italic `story-body`). Documented in DESIGN.md as `drill_teach_card`.
