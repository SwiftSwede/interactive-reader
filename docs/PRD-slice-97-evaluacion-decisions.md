# English evaluation redesign (migrate from WordPress to learn.profekyle.com)

Decisions made in brainstorm with Kyle. Current WordPress quiz (Thrive 12389) is broken by Complianz and will be rebuilt in the app as a personalized branching evaluation.

## Agreed design
1. **Self-select opener = router, not gate.** First question copies the /workshop registration form's level field phrasing (Kyle's copy, 5 options). Total beginner ('no sé nada') goes straight to the beginner offer/landing page, no quiz. Others enter the matching track.
2. **Tracks:** beginner, pre-intermediate, intermediate, upper-intermediate/advanced. 15 questions per track (grammar + vocabulary). Self-selection routes; the ladder verifies; nobody is rejected.
3. **Bands per track (15 questions):** 12+ correct = promote to next track up; 7-11 = stop, level found; 6 or fewer = demote ONE level max, then the quiz ends. Demotion never loops.
4. **Diagnosis over score.** The result page never shows a raw number for low performers ('gentle diagnosis', never 'you suck'). The personalization payload is the MAP OF MISSES: which structures/categories were missed, not just the count. Same score with clustered misses vs scattered misses = different diagnosis and different recommendation.
5. **Recommendation routes into the Sistema de 8:** result maps missed areas to the class type that attacks them; wrong answers feed the app's error-tag system (MailerLite only gets the placed-level + funnel-state tags). Fire the completion event to the pixel even on the instant-redirect beginner path so Meta data isn't blind.
6. **Listening segment = minimal pairs, NOT dictation.** Dictation rejected: LatAm students' weak spelling/punctuation would score understanding as wrong. 3-4 items PER pair (one item = 50% guess noise; 4 items = 1/16). Flag rule: 2+ wrong of 4 = real listening gap. Pairs chosen from his sound taxonomy, weighted to LatAm-Spanish struggles (short I vs long E, schwa, glottal environments). Audio recorded by Kyle himself (he drops MP3s, rename to expected slugs). Result page states per-pair: solid vs consistent miss ('you heard ship when she said sheep') = the wow line, demos the 'son tus oídos' promise.
7. **Session length:** accurate self-selector does 1 track + pairs (~15-20 items); a promoted student 2 tracks; only a twice-promoted over-estimator does 3. Every extra track is voluntary climbing = self-selection in its purest form (keeps the 30-min Lighthouse filter while fixing the ~80% drop-off).

## Question-authoring rules (CEFR/EGP/EVP grounded)
- Sources: English Grammar Profile (EGP, 1,200+ structures tagged by CEFR, corpus-derived) and English Vocabulary Profile (EVP, ~7,000 headword senses), both free at englishprofile.org, no account required (EGP Online: englishprofile.org/?menu=egp-online, EVP Online: englishprofile.org/?menu=evp-online, verified open 2026-10-29); British Council/EQUALS Core Inventory for the distilled grammar-by-level list. Raw CEFR is can-do only, Kyle's memory was right about that.
- Track-to-CEFR: beginner = A1/A2, pre-int = A2+/B1, int = B1/B2, upper/advanced = B2/C1.
- Weight CRITERIAL features (structures that first appear at level X and separate it from X-1: indirect questions = B1, reported speech = B2, inversion = C1). Maximum discrimination per question.
- Vocabulary: EVP grades word SENSES, not words ('book' A1 vs 'book a flight' B1); B1 = circumlocution + collocations; B2 = idioms; C1 = precision/register/collocational nuance. C1 items discriminate by natural word choice, not harder rules.
- CEFR is descriptive not prescriptive: Kyle's LatAm classroom judgment overrides a profile tag when they disagree.
- Spot-check question CEFR tags against the LIVE EGP/EVP database before presenting drafts as verified: the tools are open (no login), so 'I drafted from the distilled list, not the database' is an avoidable caveat; load the tool, wait for the search widget to render (results body loads a few seconds after the page), and search each target structure.
- Every distractor must have exactly one defensible answer; an alternate-translation question breeds 'I was right but marked wrong' resentment at the trust moment. Keep the 'No sé' option on every question.

## Current-question inventory (from the 40)
Shelves: Q1-8 beginner, Q9-16 pre-int, Q17-24 intermediate, Q25-40 upper/advanced (need ~7 new questions per first three shelves; upper has 16, pick 15). FLAGGED for rewrite/drop: 'Ellos van a la tienda' (both 'They go' and 'They are going' defensible); 'Voy a conocer a Marc Anthony' ('see' as distractor is natural English); 'Él me dijo que trabajaba en Canadá' ('He said that he worked' is grammatical, drops only 'me', defensible-but-risky); 'So far, 13 hockey games' (distractor 'De momento' also valid Spanish); Q36's correct answer contains raw HTML entity `&#x27;`. Pre-int shelf top: present perfect, used to, as...as. Upper shelf: idioms, phrasal verbs, double comparatives, despite, should have done.

## Open items
- 21 new track questions DRAFTED (2026-10-29, see draft section below), pending Kyle's copy pass; tags sourced from the EQUALS/EGP grammar-by-level list (filed in Business-Wiki/concepts/cefr-grammar-vocabulary-profiles.md).
- EGP LIVE VERIFICATION (2026-10-29, partial): englishprofile.org EGP Online has no account wall; searched live. FINDING: the basic indirect-question form ('Do you know' + how/where/why/what) is tagged A2 by EGP, NOT B1 as the EQUALS list says, so intermediate draft Q1 should either move to the pre-int track or be upgraded to a more complex indirect form ('Could you tell me whether...', 'I wonder where...'). Possessive determiners (my/your/his/her/our) = A1 confirmed. Question-tag entries seen were B1 forms (can/should/will negatives, shouldn't tags); a basic 'isn't it' tag unverified. Remaining tags rest on the EQUALS inventory, not live EGP lookups.
- EGP Online UI lesson: it is a Bubble app; server HTML is empty (data via Bubble API); search automation needs focus + selectAll + insertText + Enter with ~4s settle per query, batch runs go stale; a 'Download XLSX' button exports the current result set to ~/Downloads when the browser is free.
- Full EGP export recipe (preferred over the flaky search UI): click 'Download XLSX' on the EGP page, poll ~/Downloads for a new file, then parse with stdlib only (openpyxl is not installed): zipfile + xml.etree; the export has NO sharedStrings, so read xl/worksheets/sheet1.xml and join each cell's itertext() to get values (cells carry the strings inline); header row = id/SuperCategory/SubCategory/Level/Lexical Range/Guideword/Can-do statement/Example. Verify tags with targeted regex probes over Guideword+Can-do, not naive substring searches (single terms like 'possessive' match hundreds of unrelated rows); report the MINIMUM level across matches as the acquisition point. Spot-check downloads are real: confirm the file is new (mtime) before parsing, stale exports from earlier attempts may sit in ~/Downloads.
- RESOLVED: current WordPress result page = raw score + offer copy pushing group classes (Circle); keep same except the gentle-bottom rule. Beginner instant-redirect destination = profekyle.com/curso-beginner-superpack/ (config value, not hardcoded; migrating beginner courses to the app over time).
- PENDING DECISIONS before Cursor spec: (1) EMAIL GATE placement: before quiz / at result / after result (architectural: guest vs account); (2) self-select opener copy in Kyle's voice (workshop field has 4 options, opener needs the total-beginner 5th; drafts are placeholders, Kyle is copywriter of record); (3) per-question feedback during quiz: recommended CUT (silent quiz, all feedback in end review) pending Kyle; (4) minimal-pair pair list from sound taxonomy needs Kyle sign-off; (5) bank skeleton (~15 EGP structures per track) not yet drafted; (6) spec assembly: app URL, nav visibility, pixel event names, MP3 audio pipeline, UI language Spanish.

## Draft: 21 new track questions (2026-10-29, pending Kyle review)
Format mirrors the live quiz: Spanish prompt -> English options, 4 distractors, 'No sé' fifth option implied. Fill-in-the-blank items mark the blank with _____.

### Beginner (A1/A2)
1. '¿De dónde eres?' -> Where are you from? [to be + questions, A1]
2. 'Hay un perro en el jardín.' -> There is a dog in the garden. [there is/are, A1]
3. 'Ella trabaja en un hospital.' -> She works in a hospital. [present simple 3rd person, A1]
4. 'Nuestro apartamento es pequeño.' -> Our apartment is small. [possessive adjectives, A1]
5. 'La fiesta es el sábado por la noche.' -> The party is on Saturday night. [prepositions of time in/on/at, A1]
6. 'I _____ swim.' -> can't. Distractors: don't can / not can / am not can. [modal can negative, A1]
7. 'El carro de mi papá es rojo.' -> My dad's car is red. [possessive 's, A1]

### Pre-intermediate (A2)
1. 'Si estudias, pasas el examen.' (fill 2nd half: 'If you study, _____ the exam.') -> you pass. Distractors: you passed / you are pass / you passing. [zero conditional, A2]
2. 'I _____ dinner when the phone rang.' -> was cooking. Distractors: cooked / am cooking / were cooking. [past continuous interrupted, A2]
3. 'Tengo que trabajar mañana.' -> I have to work tomorrow. Distractors: I must to work / I has to work / I have work tomorrow. [have to obligation, A2]
4. 'Have you _____ been to Cancún?' -> ever. Distractors: for / since / yet. [present perfect ever, A2]
5. 'Este hotel es más barato que el otro.' -> This hotel is cheaper than the other one. Distractors: more cheap / the cheapest / more cheaper. [comparative, A2]
6. 'Apaga la luz.' -> Turn off the light. Distractors: Turn on / Turn up / Turn in. [common phrasal verb, A2]
7. 'Disfruto escuchar música.' -> I enjoy listening to music. Distractors: to listening / listen / listened. [enjoy + gerund, A2]

### Intermediate (B1)
1. '¿Sabes dónde está la estación?' -> Do you know where the station is? Distractors: Do you know where is the station? / Do you know where it is the station? / You know where is the station? [INDIRECT QUESTIONS; TAG CORRECTION 2026-10-29: EGP live tags the basic form A2; upgrade candidate for B1: 'Could you tell me whether the station is near?' or keep simple version and move it to the pre-int track]
2. 'I failed the test. I _____ studied more.' -> should have. Distractors: should / should had / have should. [should have, B1]
3. 'If I _____ more time, I would travel.' -> had. Distractors: have / would have / has. [2nd conditional, B1]
4. 'The movie _____ when we arrived.' -> had already started. Distractors: has already started / have started / starts. [past perfect, B1]
5. 'She _____ English for three hours.' -> has been studying. Distractors: has been study / have been studying / is been studying. [present perfect continuous, B1]
6. 'Este puente fue construido en 1930.' -> This bridge was built in 1930. Distractors: was build / were built / was building. [simple passive, B1]
7. 'Ella trabaja aquí, ¿verdad?' -> doesn't she? Distractors: isn't she / does she / isn't it. [question tags, B1]

Design notes: every item engineered for exactly ONE defensible answer (translation prompts avoided where a second translation is natural, e.g. will/going-to free choice); blank items force the target structure by offering only one grammatical option. Content is LatAm-relatable per Kyle's existing quiz style. Full CEFR grammar list filed in Business-Wiki/concepts/cefr-grammar-vocabulary-profiles.md.

## EGP-verified tag corrections (2026-10-29, full EGP XLSX export)
Full database downloaded: 'English Grammar Profile Online (1).xlsx' in ~/Downloads (1,222 rows: SuperCategory/SubCategory/Level/Guideword/Can-do/Example; examples carry learner L1 incl. 'Spanish - Latin American' = reusable authentic error material). Verified against the 21 drafts:
- Beginner track: all 7 verified A1 except B7 possessive 's = A2 (singular noun + 's). Beginner spans A1/A2, no move needed.
- Pre-int: zero conditional OK as A2 (EGP: 'PRESENT SIMPLE IF CLAUSE, REAL CONDITIONS' A2); past continuous A2 OK; comparative A2 OK; phrasal verbs A2 OK. CORRECTIONS: have to = B1 in EGP (EQUALS said A2); 'ever' with present perfect = A2 structure with B1 adverb; enjoy/verb + '-ing' patterns = B1 in EGP (EQUALS said A2 gerunds). P3, P4, P7 are top-of-pre-int or light-B1 items: keep in pre-int only if we accept these as stretch items, else move to intermediate pool.
- Intermediate: should have, 2nd conditional, past perfect, present perfect continuous, question tags (affirmative main + negative tag) all verified B1. CORRECTIONS: indirect questions basic form = A2 (already flagged, decide move vs upgrade); SIMPLE passive (present/past simple affirmative) = A2 in EGP, not B1 (EQUALS said B1): 'was built in 1930' should move to pre-int pool or be upgraded to a B1 passive use (passive with 'by' in relative clause, or passive questions).
- Action when building question banks: pull items directly from EGP rows by level + subcategory instead of re-deriving from the EQUALS list; EGP is the granular authority.

## Kyle decisions (2026-10-29, post-EGP-verification)
- 'Have to' and 'enjoy + -ing' = PRE-INT STRETCH items. Stay in the pre-int pool, do NOT move to intermediate.
- Simple passive ('was built in 1930') = pre-int shelf. A2 passive lives pre-int, never beginner; complex passive uses (with 'by' relative clause, passive questions) stay intermediate.
- Retake problem (Kyle, from the old WordPress evaluation): students who retake a year later just remember last year's answer key, so the quiz tests memory of the key, not knowledge. DESIGN REQUIREMENT for the app build: question banks with multiple items per structure; each retake draws fresh items per structure, and stores which items a given student already saw so repeat items are excluded (or heavily down-weighted). EGP's 1,222 structures per level give effectively unlimited rotation.
- Future resource stack (Kyle's idea, worth building later): EGP (grammar by level) + a frequency wordlist (most-frequent English words, CEFR-tagged) + AI generation = on-demand sentence/question generation for flashcards (Anki), personalized materials per student level, and fresh evaluation items. Frequency candidates to evaluate: Oxford 3000/5000 (CEFR-tagged), NGSL (frequency + coverage stats), EVP senses. The evaluation pipeline and the flashcard pipeline can share the same item-generation engine.

## Answer review feature (Kyle, 2026-10-29)
- Students historically ASKED for the answers after the old evaluation. Requirements: per-question right/wrong review (wrong answers weighted first), no exact score shown (students can infer), confirmation for questions they were unsure about, dynamic presentation (the WordPress version looked bad), and a one-line explanation per missed item: the correct answer plus the rule behind it, so they teach themselves at the finish.
- Funnel guard: the review must not compete with the Circle offer. Sequence on the result page: (1) headline result + miss-map/listening-gap summary, (2) Circle offer copy, (3) full answer review BELOW the CTA (per item: their answer, correct answer, one-line rule, target structure name). The review doubles as proof for the offer: the gaps it shows are exactly what the classes attack.
- Implementation shortcut: every question already maps to an EGP row, and every EGP row has a can-do statement ('Can form indirect questions with Do you know + how/where/why/what'). The review's one-line rule can be generated from the EGP can-do line, rewritten in Kyle's voice if desired. The Thrive export's feedback field was empty, so explanations are authored fresh (AI-draft from EGP rows, Kyle copy pass).
- Wrong-answer data feeds the app error-tag system and the answer review from one stored response record. MailerLite receives only the placed-level tag, not error data.

## Frequency layer decision (2026-10-29)
ONE frequency database: NGSL 1.2 (2,809 lemmas, newgeneralservicelist.org, 92%+ coverage, free) as the sole frequency-ordering backbone (NGSL-S spoken list optional, matches listening-first brand). Do NOT run Oxford and NGSL as parallel frequency sources; their corpora and lemma rules disagree, so every item would arbitrate between two orderings.

Layer division (each database one job):
- NGSL = WHICH words first (frequency ordering). Top ~1,000 = A1-A2, ranks 1,001-2,800 = B1 (Brezina & Gablasova alignment); frequency layer matters most A1-B1.
- EVP = level authority for word SENSES (primary; sense-level matters: 'book' noun vs verb are different levels).
- Oxford 3000/5000 = gap-filler + cross-check (CEFR-labeled A1-C1, fills EVP's thin C1/C2 general coverage).
- EGP = structure/frame for sentence generation; AI composes EGP frame + level-banded vocab + NGSL selection into items.
- At B2-C1 frequency matters less; collocational precision (EVP) + teacher judgment take over.

## Local resource files (downloaded 2026-10-29): ~/Downloads/vocab-lists/
- NGSL-1.2.xlsx: 2,809 words + English definitions (the frequency backbone).
- NGSL-SFI-31K.xlsx: 80,829 rows, full frequency-ordered lemma table with SFI ranks, per-wordlist membership, coverage and cumulative-coverage columns (use for exact frequency ranking and coverage math).
- oxford-3000-5000.csv: 5,972 word+POS entries with ox3000/ox5000 membership flags and min CEFR level (built by scraping oxfordlearnersdictionaries.com/wordlists/oxford3000-5000; A1=1,078 / A2=992 / B1=903 / B2=1,578 / C1=1,421).
- The_Oxford_3000/5000_by_CEFR_level.pdf + American variants: official printable PDFs (American versions useful given the American-English brand).
- EGP-full-1222.xlsx: copy of the EGP export.
The three data files (NGSL-SFI, oxford CSV, EGP xlsx) are the complete offline content-generation stack.

## Two-pass design: placement + confirmation (amendment, 2026-10-29, Kyle-approved flow)
Separates PLACEMENT (broad, determines band) from DIAGNOSIS (deep, needs multiple observations per structure). One miss in placement = 'candidate weakness' only, never a verdict, never influences band/demotion (demotion requires <6/15, one cluster can't cause it).

- Pass 1 placement: 15 items, one per structure, per track. Bands as decided (12+ promote, 7-11 settle, <6 demote).
- Pass 2 confirmation: fresh bank item per missed structure, max 3 structures, 0-5 items, does NOT count toward the band. SELECTION when >3 misses: confirm the most FOUNDATIONAL missed structures first (rank by EGP level, earliest-acquired first; foundational misses explain/ripple into later structures; deterministic selection keeps tag consistency and year-over-year measurability). Rejected: random selection (same profile would produce different diagnoses day to day). Misses 4-N are NOT discarded: they still appear in the answer review with the one-line rule, stay as lower-confidence candidate tags in the app error-tag system (never MailerLite), and can become confirmed on a retake (fresh draws). Verdict rule (mirrors minimal pairs): 2 misses same structure = CONFIRMED hole (app error-tag system + report + mapped to attacking class type); scattered single misses = 'possible, worth watching', no tag. MAILERLITE CORRECTION (Kyle, 2026-10-29): error-level data does NOT go to MailerLite, it lives in the web app's own error-tag system (feeds review mode, practice resurfacing, teacher view of confirmed holes at enrollment). MailerLite gets only coarse tags: placed level + funnel-state (took evaluation etc.), mirroring the /workshop level-field logic.
- Confirmation runs ONLY in the track where the journey settles (last track completed with a passing score 7+):
  1. Settle (7-11): confirm that track's misses. (15-18 items total)
  2. Promote: confirm the settled track's misses PLUS the promoted-from track's misses (rare, specific errors from a strong student = most valuable confirmations). (up to 45+6 for a double-promoter)
  3. Demote (<7): NO confirmation at that track (broad struggle, not a hole); drop and re-apply the rule at the lower track.
  4. Fail bottom track: quiz ends, no confirmation anywhere; report built from the overall miss pattern, gentle page.
- Bank coherence: 1 placement + 1 confirmation + 1 rotation item per structure = the 3-item-per-structure bank; one bank serves retake rotation AND confirmation.
- Report honesty: one slip vs confirmed pattern render differently (quiet mention vs highlighted gap mapped to class type).

## Build spec
Cursor-facing spec + bank skeleton: `references/evaluation-cursor-spec.md` (2026-10-29). Decisions in this file are the source of truth; the Cursor spec references them. Decisions logged there: /evaluacion no login, Spanish UI + English content, silent quiz (feedback only at end review), email capture AFTER result shown, result logic = current WordPress version except gentle bottom page, Superpack redirect as config, pixel/audio/copy placeholders.
