# Cursor prompt — new error tags from November mining (35 → 37): narrative_tense_drift, subjunctive_interference

> Authored by Hermes 2026-11-02 from the pre-int transcript-mining sessions (Oct 7/19/26 + Nov 2 story class). Vault catalog now has 16 tags + watchlist (`Language-Wiki/concepts/spanish-l1-interference-error-catalog.md`); this prompt brings the app from 35 to 37 and completes the sync. Use the next free slice number per PRD convention.

## Context

Verified app reality: `ERROR_TAG_SEEDS` in `src/lib/knowledge-tags.ts` currently holds 35 names (last additions 2026-10-30: `plural_s_omission`, `another_vs_other`). The check-answer SYSTEM_PROMPT enumerates the tag list. The vault catalog gained 4 tags on 2026-11-02; two of them are name-level duplicates of EXISTING app tags and must NOT be re-created:

- Vault tag 15 (-ed/-ing adjective confusion) = existing app tag `participle_adjectives`. No app change; only richer vault examples.
- Vault tag 16 (verb + preposition misuse, general) = existing app tag `preposition_partner`. No app change.

Only two tags are genuinely NEW to the app: `narrative_tense_drift` and `subjunctive_interference`.

Note: the existing `past_simple_omission` (narration told in present, 2026-10-13) is a SIBLING of narrative tense drift, not a duplicate: `past_simple_omission` = the whole narration is told in present; `narrative_tense_drift` = first clause(s) correctly past, FOLLOWING clauses slide into present inside one complex sentence. Keep both.

## Build

### 1. Seeds (35 → 37)

Append to `ERROR_TAG_SEEDS` in `src/lib/knowledge-tags.ts`:

```ts
{ name: "narrative_tense_drift", displayName: "Narrative tense drift" },
{ name: "subjunctive_interference", displayName: "Spanish subjunctive interference" },
```

No prerequisites (error tags carry none).

### 2. check-answer SYSTEM_PROMPT

Append to the ERROR TAGS list:

```
- narrative_tense_drift: Narrative tense drift (past narration slides into present mid-sentence)
- subjunctive_interference: Want/need/hope + that-clause (use person + infinitive)
```

Add one EXAMPLES entry per tag (Spanish `note`, Kyle voice, per existing style):

```json
{
  "question": "What did you do last weekend?",
  "answer": "I went to my brother-in-law's and they have a party there",
  "corrected": "I went to my brother-in-law's and they had a party there",
  "note": "Cuando cuentas algo del pasado, la oracion completa va en pasado: 'they had a party', no 'they have a party'.",
  "error_tags": ["narrative_tense_drift"]
}
```

```json
{
  "question": "Why don't new moms like Halloween?",
  "answer": "New moms don't want that kids eat a lot of candy",
  "corrected": "New moms don't want their kids to eat a lot of candy",
  "note": "En ingles no decimos 'want that kids eat'. Decimos 'want the kids TO eat'. Want + persona + infinitivo.",
  "error_tags": ["subjunctive_interference"]
}
```

### 3. Count-pinning test

Update the error-tag count test 35 → 37 and the seeder as in prior syncs (2026-10-13/14/15, 2026-10-30 pattern). `npm test` green, `npx tsc --noEmit` clean, prod seeded (error_tags: 37 confirmed).

## Constraints

- Commit only this slice's files: `src/lib/knowledge-tags.ts` (+ test), `src/app/api/check-answer/route.ts`, PRD row, this prompt file. Do not sweep the working tree.
- Do NOT touch `participle_adjectives` or `preposition_partner` (they already cover vault tags 15/16).
- No UI, no migration, no new deps.
