# Slice 93: Speaking Feedback Prototype (unscripted speech → multi-agent feedback)

Status: BUILT locally 2026-10-18, not committed. Westus2 unscripted probe returned phoneme scores.
Target: standalone prototype route, display-only, teacher-first

## Goal

A student (v1: Kyle, then 2-3 int-group volunteers) opens a prototype page, sees a
speaking prompt, records a spoken answer in the browser, and gets unified feedback
covering pronunciation patterns, grammar, and vocabulary. No scores shown to the
student. No punctuation feedback (this is speech).

Writing variant (punctuation agent) is a later slice; out of scope here.

## Plan review decisions (2026-10-18, grill)

- Prompt is P1. `prompt_id` is `p1`.
- Hidden route. Logged-out users go to magic-link login. A logged-in email that is neither `TEACHER_EMAILS` nor `SPEAKING_PROTOTYPE_EMAILS` gets 404.
- `isTeacherEmail` is the owner: uncapped, and the only viewer of every attempt, including pattern counts.
- Volunteers: 3 completed attempts per `America/Mexico_City` day. A row counts only when `final_feedback` is saved. Failed calls do not count.
- Closing line is one Spanish next step. No praise.
- Audio: store the browser webm, convert with the existing server ffmpeg path, send WAV to Azure. In-browser WAV only if ffmpeg fails.
- Student feedback shows no scores and no assessment digits. The recording clock stays.

## Plan-review (Kyle's decisions, recorded 2026-10-18)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Placement | Standalone prototype route, magic-link auth, display-only. RESOLVED (recommended, unobjected) |
| 2 | First testers | Kyle first with 5-10 recordings incl. deliberately-bad ones; then 2-3 int volunteers. RESOLVED (recommended, unobjected) |
| 3 | Level | Int (high B1) first. RESOLVED (recommended, unobjected) |
| 4 | Prompt | Single hardcoded prompt; must elicit 4+ sentences. Candidates drafted in this file; Kyle picks. RESOLVED |
| 5 | Length limits | HARD floor 15s (under → "too short, try again" state). Soft nudge at 30s. HARD cap 180s with auto-stop. RESOLVED |
| 6 | Capture | Browser MediaRecorder in-page (webm/opus), upload to Supabase Storage, stream to Azure. If Azure rejects webm/opus, fall back to in-browser WAV capture. RESOLVED (recommended, unobjected) |
| 7 | Keep audio | YES: private Supabase Storage bucket keyed by attempt id. RESOLVED |
| 8 | Azure resource | Reuse existing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION=westus2 (present in .env.local AND Vercel Production). Spike step 1 = live probe that unscripted assessment works on westus2; only if it fails, create a new resource in a supported region. RESOLVED |
| 9 | Scripted vs unscripted | UNSCRIPTED (speaking scenario, no reference text). Note: existing azurePronunciation.ts is scripted-only (referenceText required); this slice adds a separate unscripted path. RESOLVED |
| 10 | Aggregation thresholds | Constants in one config file (values below). RESOLVED (recommended, unobjected) |
| 11 | Models | GPT-4o-mini for all 4 calls via OpenRouter, structured JSON from specialists. Bump grammar model only if QA shows misses. RESOLVED (recommended, unobjected) |
| 12 | Feedback language | Spanish meta-commentary, English for corrected example sentences. No praise padding. RESOLVED |
| 13 | Deficiency queue | OUT of scope. Store raw attempt JSON in one table; tag-mapping deferred. RESOLVED |
| 14 | Student output | No numbers, no scores visible to students. Feedback prose only. RESOLVED |
| 15 | Success criteria | See "Acceptance" below. RESOLVED (recommended, unobjected) |

## Chosen prompt (v1, hardcoded constant)

Kyle picks one of:

- P1: "Think about a person who changed the way you see something: a teacher, a family member, someone you worked with. Who was it, and what did they change for you?"
- P2: "What is something you used to believe about learning or work that you don't believe anymore? What changed your mind?"
- P3: "Describe a moment in the last year when you had to speak English and it didn't go how you wanted. What happened, and what would you do differently now?"

Default if Kyle does not amend: P1.

## Architecture

```
[Prototype page /prototype/speaking]
  prompt card → record button (MediaRecorder) → length gates (15/30/180)
  → upload audio to Supabase Storage (attempt id = uuid)
  → POST /api/speaking-feedback { attemptId }
      ├─ Azure Speech SDK, unscripted pronunciation assessment (new code path,
      │   no referenceText; continuous mode since audio > 30s)
      │   → raw JSON: word entries w/ phoneme AccuracyScores, errorTypes,
      │     prosody/fluency; recognized text = transcript
      ├─ aggregatePhonemePatterns(raw)   [pure fn, src/lib/pronunciation/]
      ├─ three parallel OpenRouter calls (structured JSON):
      │   grammarAgent(transcript, level)
      │   vocabularyAgent(transcript, level)
      │   pronunciationPedagogyAgent(transcript, aggregatedPatterns, level)
      ├─ synthesizer call → unified Spanish/English feedback card JSON
      └─ persist attempt row (audio path, raw azure json, agent outputs,
          final feedback) → return feedback to page
```

### Reuse, do not rebuild

- `src/lib/pronunciation/thresholds.ts`, `azure-ipa.ts`,
  `latam-enus-sounds-guide.v1.json`, `spanishCoachRules.ts`: reuse for IPA naming
  and LatAm-specific coaching lines where applicable. Do NOT modify them in this
  slice; read-only reuse. If a shape mismatches, wrap, don't edit.
- Supabase auth/session patterns and OpenRouter call patterns already in the repo:
  follow the existing helper conventions (find them before writing new ones).

### Aggregation config (single file, e.g. `src/lib/pronunciation/speakingFeedbackConfig.ts`)

```ts
PHONEME_ERROR_THRESHOLD = 60      // Azure's own mispronunciation cutoff
WORD_MANGLE_THRESHOLD = 40        // word-level accuracy → "completely mispronounced"
MAX_MANGLED_WORDS_SHOWN = 3
PATTERN_MIN_INSTANCES = 3         // phoneme needs 3+ error instances to be a pattern
MAX_PATTERNS_SHOWN = 2
MIN_AUDIO_SECONDS = 15            // hard floor → retry state
NUDGE_SECONDS = 30                // soft UI nudge
MAX_AUDIO_SECONDS = 180           // hard cap, client auto-stop
```

Pattern output shape: `{ phoneme, ipaDisplay, instanceCount, avgAccuracy,
exampleWords: string[] }` — sorted by (instanceCount desc, avgAccuracy asc).

### Agent contracts (structured JSON, temperature low)

All specialists receive: transcript, prompt text, level ("int"), and the rule
"report only real errors; if the English is correct, say so explicitly rather
than inventing issues."

- **grammarAgent** → `{ errors: [{ heard, corrected, rule, severity }], ok: bool }`
- **vocabularyAgent** → `{ suggestions: [{ heard, better, why }], ok: bool }`
  (cognate synonyms are intentional; do not flag them)
- **pronunciationPedagogyAgent** → input includes aggregated patterns + mangled
  words; returns `{ patterns: [{ pattern, friendlyName, examples, tip }],
  mangledWords, ok: bool }` — writes for a student with weak pronunciation:
  top patterns only, no exhaustive lists.
- **synthesizer** → takes all three + prompt, emits final card JSON:
  `{ transcript, patterns: [...], grammarFixes: [...], vocabularyTip, closingLine }`
  in Spanish meta-commentary with English example sentences. No scores. No em
  dashes anywhere in generated copy. Cap: card reads in under 60 seconds.

## Storage

One migration: `speaking_attempts` table
(id uuid, user_id, prompt_id text, audio_path text, duration_s numeric,
azure_raw jsonb, aggregate jsonb, agent_outputs jsonb, final_feedback jsonb,
created_at). Private bucket `speaking-attempts` for audio. RLS: owner-only read;
teacher access via service role only.

## Route + UI

- `src/app/prototype/speaking/page.tsx` (auth-gated, mobile-first, 375px check).
  Vertical: prompt card → record button with live timer (nudge at 30s, auto-stop
  180s) → processing state → feedback card.
- Feedback card order: student's transcript (plain text, v1 not tappable) →
  pronunciation patterns (1-2, each with example words from their own speech) →
  grammar before/after list → one vocabulary tip → one encouraging closing line.
- No re-record limit in v1; attempts are cheap.
- Retry/under-15s state shows a friendly retry message (in Spanish).

## Test corpus: WhatsApp voice notes (Kyle's decision, 2026-10-18)

Kyle already collects 1-2 minute self-introduction voice notes from prospective
students (he asks for them). These are the ideal corpus: real LatAm accents, real
unscripted speech, longer than the 30s minimum, and they decouple the analysis
pipeline from browser capture. Procedure:

- Pull the audio files out of WhatsApp (WhatsApp Web/desktop export; WhatsApp
  voice notes are .ogg/.opus — the SAME codec family as the browser MediaRecorder
  webm/opus fallback, so this corpus doubles as the Azure codec acceptance test).
- Drop them in a local (gitignored) folder, e.g. `scripts/speaking-probe/audio/`;
  NEVER commit prospective students' voice recordings to the repo.
- Name files with an initial or nickname, not full names; store nothing in
  Supabase for this corpus (the attempts table is for in-app attempts only).
- Privacy stance: these are private messages from prospects, used for internal
  spike/QA only, not shown to anyone or fed into any student-facing feature.
  If feedback output is ever used in the funnel later, that is a separate,
  explicit decision (and consent), not this slice.

Spike order is unchanged, but the corpus replaces Kyle-only recordings as the
primary acceptance input for (a) and a supplement for (b).

## Spike order (build in this order, stop and report if a spike fails)

1. **Azure probe:** script (throwaway, deleted after) posting a 60s test wav/webm
   through unscripted assessment on westus2. Verifies region support + webm/opus
   acceptance + real JSON shape. This decides #6 fallback and #8. Immediately
   after, run the same probe over the WhatsApp voice-note corpus (batch, one row
   per file, dump aggregate + raw JSON to local files for Kyle to eyeball).
2. Capture + upload + length gates, no analysis. Record, replay audio from
   storage.
3. Aggregation fn + unit tests (`npx tsx --test` per file; npm test glob fails on
   Node 20 — use git ls-files fallback).
4. Agent chain behind the API route, tested with the stored probe recordings.
5. Page polish + Kyle's QA loop.

## Acceptance

- (a) On Kyle's deliberately-bad recordings, reported top patterns match the
  injected phoneme errors.
- (b) On 3 real student recordings, grammarAgent catches errors Kyle would
  catch, with zero false corrections of correct English.
- (c) Prompt → speak → feedback in under 90 seconds end-to-end.
- (d) No scores or numbers visible anywhere in the student UI.
- (e) Generated copy passes Kyle's copy axes: written Spanish accents present,
  zero em dashes.

## Spike 1 findings (run 2026-10-19, 7 WhatsApp voice notes, 97-453 words each)

- **westus2 unscripted assessment WORKS** with the existing resource/key. Phoneme-level
  accuracy scores come back per word, plus syllables, ErrorType, and a clean transcript.
  Long audio (206s, 453 words) processes fine in continuous mode.
- **Codec verdict:** the installed Speech SDK build has NO compressed-input support
  (`getCompressedFormat` missing, `fromWavFileInput` crashes in FileAudioSource.readHeader).
  Working path = ffmpeg/raw PCM 16k mono push stream. Production implication: the API route
  should accept WAV/PCM (browser AudioWorklet WAV capture) or server-transcode; do NOT
  send webm/opus through this SDK.
- **Latency finding (important):** per-file end-to-end recognition took ~2-7 min wall clock.
  A synchronous API route is not viable; the attempt flow must be async: upload → job
  → poll/refresh for the feedback card. Confirm per-call latency on smaller clips before
  finalizing UI copy about waiting.
- **Transcript quality is excellent** and grammar errors are clearly visible in the raw
  text ("I stood it software engineer", "He is only three years" for a daughter, "I working
  in a telecommunications company") — strong fuel for the grammar agent.
- **Mangled-word signal is strong:** directorate (12), coworkers (4), native (16),
  aspirate (17), fluently (16), understand (17) — genuinely hard words, plausible real
  mispronunciations.
- **Phoneme-pattern signal needs tuning before it matches Kyle's intuition:** absolute
  threshold 60 surfaces /n/, /t/, /ax/ as "patterns" with averages of 74-90, which read
  as word-final consonant noise, not real confusions. Real-looking signals: /s/ (18 low,
  avg 73.7) for one speaker, /r/ (11 low) for another. Vowel-confusion patterns
  (the Paula /æ/~/ɛ/ case) did NOT surface at absolute threshold 60. Spec the aggregator
  to tune: relative threshold (phoneme low when score < min(60, speaker_avg - 15)),
  dedupe example words, consider position weighting (word-final vs stressed). Validate
  against a recording where Kyle injects a known vowel swap before locking thresholds.

### Kyle's correction (2026-10-19): the Paula case is a QUALITY pattern, not a SUBSTITUTION

The /a/-/e/ problem Kyle teaches is not hearing the wrong phoneme: the Spanish /a/ and /e/
are more relaxed than their English counterparts, so Azure recognizes the CORRECT phoneme
and scores it only mildly low. No instance ever crosses an error threshold. Detection
therefore cannot be substitution-shaped; it must be DISTRIBUTION-shaped:

- Per speaker, compute a baseline (mean accuracy across all phonemes).
- A quality pattern = a phoneme whose AVERAGE accuracy sits systematically below the
  speaker's own baseline across enough instances (e.g. /æ/ avg 78 vs baseline 88 over
  15+ instances), even with zero instances below 60.
- Report such patterns as "sound quality" feedback, not "wrong sound" feedback, and let
  the pedagogy layer phrase them the way Kyle teaches it (the Spanish vowel is lazier/
  more relaxed than the English one).
- Map depressed phonemes to the Spanish-lens relations already in the app
  (`sound-spanish-notes.v1.json` igual/parecido/unico + ghost vowels, Slice 89): a
  depressed /æ/ is exactly a "parecido" sound where the Spanish ghost vowel is leaking
  through. This is the same phenomenon the sound guide teaches, seen through assessment
  data instead of a chart.
- Honest limit: Azure exposes accuracy scores, not acoustic-quality measures. A "correct
  but lax" vowel is only visible through this statistical depression, which needs enough
  instances (that is why the prompt must elicit length). Research-grade acoustic quality
  scoring (GOP variants) is a future option, not this slice.
- Validation: Kyle records two clips of the same passage, one with deliberately relaxed
  Spanish /a/-/e/ and one with exaggerated English vowels; the aggregator must rank the
  depressed vowels as top patterns in clip 1 and not in clip 2.

## Merge-danger

- New migration only; no changes to existing tables or the scripted
  `/api/assess` path. Do not touch `azurePronunciation.ts` (new sibling file for
  unscripted assessment).
- Existing pronunciation lib files are read-only in this slice.

## Cost estimate (to confirm during spike)

Azure unscripted assessment ≈ STT pricing (~$0.016-0.03/audio-min depending on
tier; add-on content scoring may bill extra — confirm on the probe) + 4 LLM calls
(< $0.01/attempt). Even 200 attempts/month stays under a few dollars.
