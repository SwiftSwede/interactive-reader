# Cursor prompt — check-answer error tags + "Errores comunes" tag family (Slice 70)

> Update: 2026-10-05. Vocabulary is now 22 names: `embedded_question` (Embedded question word order) added for the statement word order mistake ("Do you know what I want", not "what do I want"; "I didn't know where she was from", not "where was she from"). Commit 36b327d.

## Plan review decisions

- Slice 70 is free in the PRD. No renumber.
- `content-tags.ts` is in this slice. `tagTableFor("error")` throws. `TAG_TYPES` stays grammar, vocabulary, and phonetic, so the seed script does not upsert error tags.
- `age_expression` display name is `Age: I am 25`. The parenthetical in this prompt used an em dash. UI copy does not.
- The learning-event insert is awaited. A failure is logged and the correction still returns.
- `course_session_id` is null for live class and review. The client sends only question and answer, and this slice does not change the client.

## Context

Read `docs/adr/015-deficiency-queue.md` first — Decisions 2 and 3 are this slice. Slice 69 shipped the `learning_events` table (teacher-read RLS only, no student policy, inserts via admin client). This slice makes `check-answer` report which controlled error tags apply, and records them as events. It rides the existing AI call — zero new AI cost, no migration, no UI.

Code reality (verified): `src/app/api/check-answer/route.ts` persists nothing today; its SYSTEM_PROMPT already enumerates 13 L1 interference rules; `TagType` lives in `src/types/index.ts:648`; `TAG_SEEDS: Record<TagType, TagSeed[]>` in `src/lib/knowledge-tags.ts:177` (the compiler will force the new key). `topic-evidence.ts` `CLEARING_SOURCES` deliberately excludes `personal_response` ("too coarse to declare a topic recovered") — that stays true; this slice does NOT write `user_topic_evidence`.

## Build

### 1. Error tag family (controlled vocabulary — names are exact, do not invent)

Extend `TagType` in `src/types/index.ts` with `"error"`. Add `ERROR_TAG_SEEDS: TagSeed[]` to `knowledge-tags.ts` and register under `TAG_SEEDS.error`. 21 seeds:

From the 13 L1 rules already in SYSTEM_PROMPT (map by rule number):
| name | displayName | rule |
|---|---|---|
| `adverb_placement` | Adverb placement | 1 |
| `negative_auxiliary` | Negative auxiliary (don't/doesn't) | 2 |
| `question_auxiliary` | Question auxiliary (do/does) | 3 |
| `subject_omission` | Subject omission | 4 |
| `adjective_noun_order` | Adjective before noun | 5 |
| `double_negative` | Double negative | 6 |
| `perfect_vs_past` | Present perfect vs past simple | 7 |
| `body_part_possessive` | Possessive with body parts | 8 |
| `good_vs_well` | Good vs well | 9 |
| `bare_plurals` | Bare plural time nouns | 10 |
| `people_agreement` | People is/are | 11 |
| `i_am_agree` | I am agree | 12 |
| `on_time` | On time vs at the time | 13 |

Plus the ratified extras (ADR 015 Decision 3):
`preposition_partner` (Prepositions with verbs), `false_friend` (False friends), `make_vs_do` (Make vs do), `say_vs_tell` (Say vs tell), `countability` (Countability), `age_expression` (Age — I am 25), `participle_adjectives` (Boring vs bored), `for_vs_since` (For vs since).

No prerequisites (that field is grammar-only). Display names are Spanish-nav convention (English term, like grammar tags). Error tags are learner-anchored, NOT content-anchored: they never enter the `tags` table, no CHECK-constraint migration, `SOURCE_TAG_TYPES` in topic-evidence stays untouched.

### 2. check-answer route changes

- **SYSTEM_PROMPT**: append the error-tag list (exact `name` + one-phrase gloss each) and add to the JSON shape: `"error_tags": ["array of tag names from the list above, empty if none apply. Only tag errors you actually fixed in 'corrected'. Never invent names."]`. Update the four existing examples to carry correct `error_tags` (e.g. "Never I watch soccer" → `["adverb_placement"]`; "Always I arrive at the time" → `["adverb_placement", "on_time"]`; "No I like soccer" → `["negative_auxiliary"]`). `max_tokens` stays 600.
- **Validation (deterministic)**: new exported helper in `knowledge-tags.ts` — `isValidErrorTag(name: string): boolean` against the seed names. In the route: parse `error_tags`, keep only valid names, dedupe, cap at 4, and force `[]` when `corrected.trim() === answer.trim()` (a correct sentence has no errors to tag).
- **Event write**: after the successful AI parse and validation, if any tags survive, insert one `learning_events` row via `createAdminClient()` (RLS has no INSERT policy by design — Slice 69; admin bypasses):
  - `user_id` = authenticated user, `event_type = 'check_answer_error'`
  - `course_session_id` = null (review-mode self-practice, not session-tied)
  - `detail = { error_tags: string[], question: string (truncate 200), answer: string (truncate 500), corrected: string (truncate 500) }` — the answer text is the Ficha's evidence ("the specific pair rides in detail"); teacher-only by RLS, same trust level as persisted comprehension responses.
  - Fire-and-forget: a failed event insert logs `console.error` but does NOT fail the request — the student still gets their correction.
- **Response shape unchanged**: still `{ corrections, note }`. Error tags are deficiency data — students never see them (ADR 015 Decision 11). Zero client changes.

### 3. Tests

Extend the co-located `knowledge-tags` test file (create if absent): valid tag passes, unknown tag dropped, dedupe, cap at 4, corrected-equals-answer forces empty. House `npm test` + `npx tsc --noEmit` must pass; fix any non-exhaustive switches over `TagType` that surface (add an `error` arm that renders the display name).

## Verification

- `npm test` green, `npx tsc --noEmit` clean.
- Manual probe (dev server, authenticated): a review-mode personal-question answer with a seeded error ("I have 25 years") returns corrections + note as before, and a `learning_events` row exists with `event_type = 'check_answer_error'` and `detail.error_tags` containing `age_expression`. A correct answer writes no row.

## Constraints

- No UI, no migration, no new deps, no `user_topic_evidence` writes, no client changes.
- PRD row: Slice 70 (if taken in the PRD, use the next free number and note it in the prompt file header, as in Slice 69).
- Commit only this slice's files: `src/types/index.ts`, `src/lib/knowledge-tags.ts` (+ test), `src/app/api/check-answer/route.ts`, PRD row, this prompt file. Do not sweep the working tree.

## 2026-10-13: 6 new L1 error tags (22 to 28), mined from the Oct 12 pre-int conversation class transcript

Kyle tagged recurring errors from the Zoom transcript of the pre-int M+W conversation class (scary movies). Added: past_simple_omission (narration told in present: "I eat a lot" -> "I ate a lot"; 9+ instances, 4 students), time_preposition ("in the night" -> "at night", 5 instances, 3 students), place_preposition ("en el bus" -> "on the bus"; Andrea said "in his boss"), negative_infinitive ("to don't scream" -> "not to scream"), double_comparative ("more easy" -> "easier"), compound_subject_agreement ("my daughter and my husband doesn't" -> "don't"). Files: knowledge-tags.ts seeds, check-answer SYSTEM_PROMPT list + 4 EXAMPLES entries, count-pinning test 22->28, DB upsert via seed-knowledge-tags.ts (error_tags: 28 confirmed). Tests 14/14 pass, tsc clean. Borderline single-hitters NOT added: "the another" (double determiner), "scare movies" (adjective formation), await corroboration.

## 2026-10-14: 3 more L1 error tags (28 to 31), mined from the Oct 13 intermediate conversation class transcript

third_person_s_missing ("my customer complain" -> complains; "she visit" -> visited; NOTE: the original 22-tag catalog never covered third-person -s, the most classic LatAm error, gap discovered via transcript mining), gerund_after_preposition ("I'm sorry for show up late" -> for showing up; Kyle taught this rule live in class), be_omission ("I gonna wake up my husband" -> "I'm gonna"). Files: seeds, SYSTEM_PROMPT list + 3 EXAMPLES entries, count-pinning test 28->31, DB upsert (error_tags: 31 confirmed). Tests 14/14, tsc clean. Still parked awaiting corroboration: "the another", "scare/relax day" word formation, double subject ("my kids, they are okay"), "from USA".

Transcript-mining workflow established: Kyle drops Zoom recording transcripts (main room only; breakout rooms are NOT in Zoom recordings, so word-count ratios by speaker are unreliable for pair rounds). Two classes mined Oct 12-13 produced ~36 vocabulary-gap expressions.

2026-10-14 (Hermes, pre-int M+W dialogue transcript Oct 14): merged double_comparative into comparative_formation (same family, renamed in place in error_tags via admin UPDATE so the row id survives; seeder confirms 32 unique), added article_omission (4-student evidence: "today was special day", "make it a interesting", "in the Latin America", "a good cooking"). System prompt list + EXAMPLES updated, count test 31->32. Tests pass, tsc clean, prod seeded (error_tags: 32).
