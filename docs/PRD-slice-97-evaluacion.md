# Evaluation: Cursor build spec + bank skeleton

Source of truth for decisions: `references/evaluation-redesign.md` (same skill dir). This file is the build-facing spec. Status markers: [DECIDED], [PLACEHOLDER], [OPEN-KYLE].

## Product surface

- URL: learn.profekyle.com/evaluacion [DECIDED]. No login required [DECIDED].
- UI language: Spanish interface, English test content [DECIDED].
- Quiz is silent: no per-question feedback during the quiz; all feedback in the end-of-quiz review [DECIDED].
- Email gate: result page shows FIRST, email capture AFTER the result [DECIDED 2026-10-29]. Drop-offs past the start are not email-captured; pixel events compensate. [PLACEHOLDER: exact email-capture UI point (immediately under result vs after scroll)]
- Beginner instant redirect: profekyle.com/curso-beginner-superpack/ [DECIDED], stored as CONFIG (beginner courses migrating to the app over time).
- Result-page offer: same logic as current WordPress version (level result + Circle offer copy), except bottom-of-ladder gets gentle diagnosis instead of raw score [DECIDED]. [PLACEHOLDER: offer copy is Kyle's]
- Meta pixel events: [PLACEHOLDER names]: quiz_start, track_complete (per track), result_shown, beginner_redirect.
- Minimal-pair audio: [PLACEHOLDER] Kyle records MP3s; storage + naming convention TBD.

## Opener (self-select router)

Copy source: Business-Wiki/workshops/2026-10-landing-page-spec.md level field (Kyle's copy, verbatim): Principiante total / Puedo armar oraciones pero me trabo / Puedo conversar con errores / Cómodo pero quiero pulir.
- Router mapping [DECIDED]: 'No sé nada' (5th option, Kyle's copy) → instant Superpack redirect; Principiante total → beginner track; Puedo armar oraciones pero me trabo → pre-int track; Puedo conversar con errores → int track; Cómodo pero quiero pulir → int track.
- Router is NEVER a gate: placement can still promote/demote from the self-selected track.

## Flow (all [DECIDED] unless noted)

1. Splash page [PLACEHOLDER copy].
2. Opener routes to track (or Superpack redirect, fires beginner_redirect pixel).
3. Placement pass: 15 items, one per structure, silent.
4. Bands: 12+ promote to next track (run another placement pass); 7-11 settle; <6 demote one level max (no confirmation at a failed track).
5. Confirmation pass: runs only in the track where the journey settles (last track completed with score 7+). Fresh bank items for missed structures, max 3 structures, does NOT count toward bands. Selection when >3 misses: foundational-first (EGP level ascending, deterministic). Promoted students: also confirm misses of the promoted-FROM track (rare, specific errors).
   - 2 misses same structure = CONFIRMED hole. Single misses = candidate (no verdict).
   - Double-promoter worst case: 45 placement + 6 confirmation items.
6. Fail bottom track: quiz ends, gentle diagnosis page, no confirmation, report from overall miss pattern (never a raw score).
7. Result page: (a) headline result + miss map/listening summary, (b) Circle offer, (c) email capture, (d) full answer review (wrong answers expanded first with one-line rule; correct answers collapsed with checkmark), (e) review shows all items including 'No sé' usage.
8. Result routes into Sistema de 8: confirmed holes → class type that attacks them.

## Data model (Cursor)

- `structure`: {id, track, egp_ref (SuperCategory/SubCategory/Level/Guideword), kind: grammar|vocabulary, display_name_es}
- `item`: {id, structure_id, format: translation|fill_blank|mc|minimal_pair, prompt, options[5] (last = 'No sé' on MC), correct_id, rule_text (one-line, from EGP can-do, Kyle-voice pass), distractor_check: single-defensible-answer verified}
- `bank`: 3 items per structure (1 placement + 1 confirmation + 1 rotation). Draw excludes items the student already saw.
- `attempt`: {student_ref (email nullable until capture), started_at, selections[], placement_scores per track, confirmation_results, settled_track, confirmed_holes[], candidate_holes[], pixel_events}
- `error_tag`: per-structure weakness record {student, structure_id, status: candidate|confirmed, first_seen, last_seen} — app-internal, NEVER sent to MailerLite.
- MailerLite: only placed-level tag + funnel-state tags. Meta pixel: coarse events only.
- Minimal-pair sub-engine [PAIR LIST DECIDED 2026-10-29]: 14 pairs (7 consonant + 7 vowel), bank below. Per sitting: 4 pairs × 3 items = 12 items (2 consonant + 2 vowel pairs, rotated; exclude pairs the student already saw). Flag rule with 3 items: 2+ wrong of 3 = confirmed listening gap (guesser passes 1/8); 1 wrong = candidate. Per-pair result on the report ('you heard X when she said Y'), routed to the class type that drills that sound.

## Bank skeleton (v1: 15 structures per track, 3 items each = 45/track, 180 total)

Grammar/vocab split: ~10 grammar + ~5 vocabulary per track. EGP refs from EGP-full-1222.xlsx. [Skeleton = structure list; items authored against each row, single-defensible-answer rule, 'No sé' fifth option.]

### Beginner (A1/A2)
Grammar (EGP): present simple (A1, PRESENT/present simple); to be questions (A1, PRONOUNS/subject-object + CLAUSES); there is/are (A1, VERBS/there is/are); can incl. negative (A1, MODALITY/can); possessive determiners (A1, DETERMINERS/possessives); possessive 's (A2, NOUNS/noun phrases); prepositions time/place (A1, PREPOSITIONS); past simple (A1-A2, PAST/past simple); comparatives (A2, ADJECTIVES/comparatives); going to (A2, FUTURE).
Vocabulary (EVP/NGSL): A1/A2 everyday senses: family, food, home, routines, weather (5 items).

### Pre-intermediate (A2, + stretch)
Grammar: past continuous interrupted (A2); will/going to future (A2); zero/first conditional (A2, CLAUSES/conditional real conditions); present perfect + ever/yet (A2, PAST/present perfect simple); gerund/infinitive (B1 stretch, VERBS/patterns_with to and -ing); common phrasal verbs (A2, VERBS/phrasal); have to obligation (B1 stretch, MODALITY/have (got) to); simple passive (A2, PASSIVES/passives: form); wh- questions past (A2, QUESTIONS/wh-); articles countable/uncountable (A2, DETERMINERS/articles).
Vocabulary: A2 senses + basic collocations (make a decision etc.) (5 items).

### Intermediate (B1/B2)
Grammar: indirect questions complex (B1: 'Could you tell me whether...', 'I wonder where', not the basic A2 form); should have (B1, MODALITY/should past); second conditional (B1); past perfect simple (B1, PAST/past perfect simple); present perfect continuous (B1); question tags (B1: affirmative main + negative tag); passive B1 uses (with 'by' relative clause, passive questions); relative clauses (B2 entry); reported speech (B1-B2 criterial); modals of deduction (B1, MODALITY must/can't).
Vocabulary: B1 collocations + extended phrasal verbs + B2-entry idioms (5 items).

### Upper/Advanced (B2/C1)
Grammar: mixed conditionals (B2/C1); wish/if only (B2/C1); narrative tenses (B2); modals of speculation past (can't have/needn't have, B2); future perfect (B2); inversion with negative adverbials (C1); would past habits (B2); full passive forms (C1); split phrasal verbs (C1); would/habit + registers (C1 filler).
Vocabulary: B2 idioms (set your sights on, jump at, give away, head out, by chance) + C1 collocational precision items (5 items).

## Open items
- [DECIDED] Opener: 5 options; 'No sé nada' → Superpack redirect.
- [DECIDED] Splash/offer/result copy: Kyle's voice (Kyle writes or copy-passes drafts).
- [PLACEHOLDER] Pixel event names, email-capture UI point.
- [PLACEHOLDER] Per-item word audio: evaluation items need ONE word per item; existing MP3s at "/Volumes/Kyle's Passport/English/pronunciationCourse/audioPractice/" are whole-pair practice tracks (minimalPairs_bv.mp3, _sz, _dTH, _tTH, _ chSH, _yJ, _nNG, ShortUvsShortA, LongEvsShorti, LongUvsAngryMonkey, LongOvsListerine). Kyle records/slices per-item audio; naming convention: audio/minimal-pairs/{pair_id}/{word}.mp3.

## Minimal-pair bank (Kyle's pair list, verbatim word pairs)

Consonant pairs:
- bv: van/ban, live/lib, vat/bat, vowel/bowel, vole/bowl, vest/best, very/berry, dove/dub
- sz: sit/zit, bus/buzz, ass/as, floss/flaws, sue/zoo, loose/lose, face/phase
- dTH (d vs voiced th): den/then, sued/soothe, breed/breathe, dare/their, does/those, diss/this, laid/lathe
- tTH (t vs voiceless th): tin/thin, wit/with, boat/both, clot/cloth, tore/Thor, pat/path
- chSH: much/mush, chore/shore, march/marsh, chalk/shock, chop/shop, witch/wish
- yJ (j vs d3): yellow/jello, yawn/John, yam/jam, you/Jew, yolk/joke, yak/Jack, yell/gel
- nNG: sinner/singer, sun/sung, win/wing, sit in/sitting, ran/rang, thin/thing, ban/bang

Vowel pairs:
- ShortUvsShortA (ʌ vs æ): sunned/sand, bus/bass, but/bat, uncle/ankle, much/match, tummy/Tammy, rut/rat, cut/cat
- LongEvsShorti (i vs ɪ): sheet/shit, beach/bitch, leave/live, seen/sin, peace/piss, ween/win, sheen/shin
- LongUvsAngryMonkey (u vs ʊ): pool/pull, Luke/look, wooed/would, shooed/should, fool/full, cooed/could, suit/soot
- LongOvsListerine (oʊ vs ɑ): stoke/stalk, coat/caught, phoned/fawned, note/not, boat/bought, joke/jock, shoal/shawl, won't/want

Item format per pair: play one word audio, student picks word A or word B (2 options, no 'No sé'; a forced choice is the point). 3 items per pair per sitting, drawn fresh from the pair's word list each time.

## Spanish-speaker weighting (Kyle, 2026-10-29)

Evaluation items weight toward structures problematic for Spanish speakers, not entirely.

Data basis: EGP export examples carry learner L1; Spanish-L1 density by level = A1 9%, A2 65%, B1 74%, B2 33%, C1 26% (of the 1,222 rows, 593 example mentions are Spanish). Honest caveat: EGP examples are mostly correct learner usages (pass scripts), so density = where Spanish-L1 learners are active/struggling to acquire, not an error tag. True error knowledge = contrastive analysis + Kyle's classroom experience; the minimal-pair bank covers the pronunciation side.

Spanish-dense EGP subcategories (from the export, for structure prioritization): present perfect simple (B1), reported speech (B1), conditionals (A2-B1), comparatives incl. as...as (A2-B1), future with be going to (A2-B1), adverb position (A2), negation (A2-B1), demonstratives (A2-B1), relative clauses (B1), quantity determiners (A2), yes/no + interrogatives (A2-B1), noun phrases (B1), expressions with be (B1-B2), would (B1), past continuous (B1).

WEIGHTING RULE: ~70-80% of each track's grammar items come from L1-focus structures (the dense subcategories above, intersected with the track skeleton); the remaining ~20-30% spread neutrally (keeps discrimination broad, avoids a ceiling where a student who fixed the Spanish-speaker issues aces the whole test). Vocabulary items prioritize contrastive traps (make/do, say/tell, borrow/lend, false friends) over frequency alone. Tag each structure in the bank with l1_focus: true|false so weighting is data, not vibes.