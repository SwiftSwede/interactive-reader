# Slice 97: Merge `gerund_after_preposition` + `negative_infinitive` -> `gerunds_and_infinitives`

## Why

Kyle's ruling (2026-11-23, superseding the earlier second_verb_form idea): the error family is "English has gerund, to-infinitive, and bare infinitive; Spanish has only the infinitive, in every slot". The family is defined by the FORM of the verb, not by its position: it applies after verbs (enjoy being), after prepositions (before moving), as a subject (Swimming is fun vs Spanish "Nadar es divertido"), and inside the infinitive itself (not to go). Kyle rejected `second_verb_form` because in two of those cases there is no second verb.

The app already has two error tags that are pieces of this family: `gerund_after_preposition` and `negative_infinitive`. Merge both into one general tag. Standard ESL name: gerunds and infinitives.

`infinitive_clauses` and `gerunds` in `GRAMMAR_TAG_SEEDS` are curriculum grammar topics on a different axis; do not touch them.

## The merge (two rows -> one)

ERROR_TAG_SEEDS count: 37 -> 36. The count-pinning test changes to 36.

- Keep the `gerund_after_preposition` DB row as the survivor: UPDATE its `name` to `gerunds_and_infinitives` and `display_name` to "Gerunds and infinitives" (keep id; student tag history on that row survives).
- Migrate: any existing drill results / records tagged `negative_infinitive` get re-pointed to the survivor row's id, then DELETE the `negative_infinitive` row.
- Follow the seeder's rename/merge behavior; the `tener_haber_contraction_confusion` rename and the `article_omission`+`comparative_formation` merge (commit 87a6c86) are the reference implementations.
- After the change, `grep -rn "gerund_after_preposition\|negative_infinitive" src/` must return zero hits.

## SYSTEM_PROMPT update (`src/app/api/check-answer/route.ts`)

Replace the `gerund_after_preposition` entry (line ~75) and the `negative_infinitive` entry with ONE entry:

```
- gerunds_and_infinitives: Gerund vs infinitive vs bare infinitive. Spanish has only the infinitive in every slot, so students default to it everywhere. Each verb or structure takes a fixed form: enjoy/love/regret/finish + -ING ("I enjoy to be alone" -> "I enjoy being alone"); prepositions + -ING ("before to move" -> "before moving", "I'm sorry for show up late" -> "for showing up", "instead of watch" -> "instead of watching", "couldn't resist to" -> "couldn't resist being in"); gerund as subject ("To swim is fun" -> "Swimming is fun"); want/need/hope + TO ("I want go" -> "I want to go"); can/make/let + BARE verb ("I can to swim" -> "I can swim"); negative infinitive word order ("I decided to not go" -> "I decided not to go"). Each pairing is learned as a fixed item, like verb + preposition.
```

## EXAMPLES block update (route.ts ~line 211 and surrounding rotation)

Replace the `gerund_after_preposition` EXAMPLES entry and any `negative_infinitive` EXAMPLES entries with three entries covering the family's breadth:

1. Gerund after preposition (kept from the old tag): "I'm sorry for show up late" -> error_tags ["gerunds_and_infinitives"], correction "I'm sorry for showing up late."
2. Gerund after verb: "I really enjoy to be alone" -> error_tags ["gerunds_and_infinitives"], correction "I really enjoy being alone."
3. Bare infinitive: "I can to explain it" -> error_tags ["gerunds_and_infinitives"], correction "I can explain it."

## Real-instance seed pool (from transcript mining, for EXAMPLES/rotation)

- "I really enjoy to be alone." (Sarai, 2026-11-23) -> "I really enjoy being alone."
- "even my cat couldn't resist to the warm room." (Sarai, 2026-11-23) -> "couldn't resist being in such a comfy room."
- "before to move to Chile" (Keily, 2026-11-23) -> "before moving to Chile."
- "I regret of that." (Sarai, 2026-11-13) -> "I regret doing that."
- "I love ride motorcycles." (Liss, 2026-10-07) -> "I love riding motorcycles."
- "I enjoy to watch scary movies." (exam item, 2026-10-26) -> "I enjoy watching scary movies."

## Vault cross-reference

Vault catalog tag 19 (Language-Wiki/concepts/spanish-l1-interference-error-catalog.md) will be re-pointed by Hermes to: App tag: `gerunds_and_infinitives`. No code action needed for that line.

## Plan review decisions

- PRD 97 is Evaluación. This catalog merge is PRD row 100. Cursor prompt filename stays `slice-97-verb-form-tag-merge.md`.
- Seeder still upserts on `name` only. Merge/rename is the one-off `scripts/merge-gerund-infinitive-tags.ts` (same pattern as `rename-article-tag.ts` + event rewrite), then `seed-knowledge-tags.ts`.
- `GRAMMAR_TAG_SEEDS` `infinitive_clauses` and `gerunds` stay.

## Acceptance

- `grep -rn "gerund_after_preposition\|negative_infinitive" src/` returns nothing.
- Count test updated to 36 and passing.
- DB: 36 error tags; the survivor row keeps its id; no orphaned negative_infinitive references.
- Tests + tsc clean.
