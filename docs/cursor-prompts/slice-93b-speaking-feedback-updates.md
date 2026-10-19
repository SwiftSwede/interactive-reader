# Slice 93b: Speaking feedback prototype updates (two-signal aggregator + async flow)

Status: SPEC — deltas to the BUILT Slice 93 (build commit be0392d, verified:
`npx tsx --test src/lib/speakingFeedback.test.ts` 0 fail, `npx tsc --noEmit` clean)
Read `docs/cursor-prompts/slice-93-speaking-feedback-prototype.md` sections
"Spike 1 findings" and "Spike 1b: Kyle validation takes" FIRST. This file changes
two mechanisms; everything else in Slice 93 stands.

## Why (one paragraph)

Post-build validation (7 WhatsApp voice notes + Kyle's two takes of a controlled
passage) showed: (1) Azure DOES score vowel quality as mild depression with no
phoneme below 60, so the absolute-threshold aggregator misses the exact pattern
Kyle teaches (relaxed /æ/~/ɛ/); (2) per-attempt assessment latency measured 2-7
minutes, which a synchronous Vercel route cannot hold. Details in the parent
spec's spike sections; do not re-derive them.

## Delta 1: two-signal pattern aggregator

Current state: `src/lib/pronunciation/aggregatePhonemes.ts` skips any phoneme
with accuracy > PHONEME_ERROR_THRESHOLD (60), so a "correct but relaxed" vowel
(88-92 with a 93-98 speaker baseline) NEVER enters the pattern pipeline. Keep
that file's exports stable; add a second aggregation path beside it.

New signals, both computed in a new module (e.g.
`src/lib/pronunciation/aggregatePatterns.ts`), unit-tested:

- **Signal A, self-baseline sag:** per attempt, speaker baseline = mean accuracy
  over ALL phoneme instances. A phoneme is a sag candidate when its average is
  below (baseline - RELATIVE_SAG_POINTS) with at least QUALITY_MIN_INSTANCES
  instances. Suggested constants in `speakingFeedbackConfig.ts`:
  `RELATIVE_SAG_POINTS = 12`, `QUALITY_MIN_INSTANCES = 12`. Reason from the
  spike-1b data: take-2 /æ/ sat 4.8 under baseline while /ð/ sat 14.4 under
  (acting noise), so the sag threshold must be tight enough to reject
  delivery-wide noise; tune on the recorded corpus before locking.
- **Signal B, teacher-reference gap:** per prompt, a Kyle-recorded reference
  clip supplies per-phoneme reference averages (computed once by the same
  aggregator from a reference attempt row, see storage below). A phoneme is a
  reference-gap candidate when (referenceAvg - studentAvg) >=
  REFERENCE_GAP_POINTS (suggest 8) with at least REFERENCE_MIN_INSTANCES (8)
  instances of that phoneme in the student's attempt.
- **Merge and rank:** union of A and B candidates, deduped by IPA; rank by
  (gap magnitude, instance count); cap at MAX_PATTERNS_SHOWN. Each pattern
  carries `signal: "sag" | "reference" | "both"`, which the pedagogy agent uses
  for phrasing: sag/reference on a VOWEL near the Spanish inventory reads as
  "sound quality" feedback ("tu 'a' está más relajada que la inglesa"), NOT
  "wrong sound". Substitution-shaped feedback stays for patterns from the
  existing absolute-threshold path (severe errors).
- **prompt_id wiring:** `speaking_attempts` already stores prompt_id. Add a
  nullable `is_reference` boolean column (migration) plus a small teacher-only
  action to mark one attempt per prompt as THE reference (latest marked wins).
  Reference averages are computed from that row's stored azure_raw at
  aggregation time (no caching infra needed at prototype scale).
- **Teachable guardrail:** if fewer than REFERENCE_MIN_INSTANCES instances of a
  phoneme exist in the attempt, no reference-gap pattern for it. Never report a
  pattern from 2 instances.

Acceptance for delta 1: run the aggregator over the seven stored WhatsApp
corpus JSONs (they live in gitignored `scripts/speaking-probe/results/`): the
/Kyle-good vs students/ reference gaps for /æ/ (all 7 students negative) and
/ɛ/ (6/7) must surface as top patterns via signal B; Kyle's take-2 vs take-1
must rank /æ/ and /ɛ/ as top reference gaps while take-1 vs itself produces NO
sag patterns. Add these as fixtures under `src/lib/pronunciation/__fixtures__/`
(small hand-trimmed JSON, no audio).

## Delta 2: async attempt flow

Current state: `POST /api/speaking-feedback` runs the whole pipeline
(`submitSpeakingAttempt` → Azure → agents → card) inside one request with
`maxDuration = 300`. Measured end-to-end latency 2-7 min makes this fragile
(browser idle, proxy timeouts, Vercel function limits) and the UI already has
a "processing" phase that pretends it is fast.

Target flow (keep it boring; no queues, no cron at prototype scale):

1. `POST /api/speaking-feedback` becomes submit-only: validate, upload audio to
   storage, insert the attempt row with `status = "processing"`, then return
   `{ attemptId }` immediately (well under 5s).
2. Kick the analysis WITHOUT holding the request: after the insert response is
   committed, invoke the existing pipeline in a fire-and-forget manner that
   works on Vercel (e.g. a self-`fetch` to a new internal route
   `POST /api/speaking-feedback/run` guarded by an internal secret, called
   from the submit route with `void fetch(...)` before returning). The run
   route performs Azure + aggregation + agents + synthesizer, then updates the
   attempt row: `status = "done"` with final_feedback, or `status = "failed"`
   with a short Spanish retry message.
3. `GET /api/speaking-feedback?attemptId=` returns current status + card when
   done. The page polls every 3s while in the processing phase, shows a honest
   waiting message (Spanish, accents, no em dashes; e.g. "Estoy escuchando tu
   audio. Esto puede tomar uno o dos minutos."), and renders the card on done.
   Polling stops on terminal status. A stuck attempt (processing > 10 min)
   renders as failed with retry.
4. Daily-cap counting moves to rows with status `done` only (failed attempts
   do not consume the cap).
5. Keep maxDuration on the RUN route; the SUBMIT route must not need it.

Acceptance for delta 2: from the prototype page, a real 60s recording returns
the submit response in under 5s, the card arrives by polling without any
timeout error, and a forced pipeline failure shows the retry state with the
attempt not counted against the daily cap.

## Plan-review decisions (recommended defaults; Kyle may veto)

- No audio format change: keep the client-side WAV conversion as built.
- Reference clip = a normal `speaking_attempts` row flagged `is_reference`
  (Kyle records it through the same prototype page; simplest possible UI: a
  small teacher-only "usar como referencia" control on his own attempt card).
- Constants live ONLY in `speakingFeedbackConfig.ts`.
- No redesign of agent prompts beyond passing `signal` through to the
  pronunciation agent's pattern objects.
- Scores remain invisible to students; teacher sees stored aggregates via
  Supabase dashboard as before.

## Merge-danger

- Touches `speaking_attempts` (one nullable column, no backfill) and the
  submit route's contract (response shape changes from card to attemptId).
  The prototype page is the only consumer; update it in the same commit.
- Do NOT touch the scripted `/api/assess` path or `azurePronunciation.ts`.
- `aggregatePhonemes.ts` keeps its current exports (the scripted drill flow
  imports them); the new module is additive.
