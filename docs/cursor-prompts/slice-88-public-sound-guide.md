# Slice 88: Public Sound Guide (/sounds) — Chart + Sound Page + Minimal Pairs

> If the PRD slice number is taken, use the next free number and note it in the header.
> Kyle decision (2026-10-11): the chart page is reachable by LOGGED-OUT visitors — this is the app's Fabien-style shareable front door (americanipachart.com is the reference Kyle called "the nicest IPA chart online").

## Goal

A public `/sounds` page: the full General American sound inventory as a clickable chart. Click a sound → sound page with Kyle's video explanation (existing Bunny Stream flow) + Spanish coaching + minimal-pair listening exercise. No schema changes. No auth changes (public read via existing anon-key reads of `sound_videos`; everything else is bundled data).

## Data sources (all exist — do NOT recreate)

- `sound_videos` table + `src/lib/sound-catalog.ts` + `mergeSoundVideos()` in `src/lib/sound-videos.ts` — full GA inventory; ~15 sounds have real Bunny video IDs, the rest show the placeholder ("Todavía no tengo el video de este sonido") exactly as the existing tooltip popup already does.
- `src/lib/pronunciation/latam-enus-sounds-guide.v1.json` — per sound: `id`, `nameEs` (e.g. "I Corta (sit)"), `ipa`, `likelySpanishSubstitutions`, `coachEs` (`shortWhyEs` / `tipEs` / `practiceEs`), `minimalPairs` (strings like "seat/sit"), `examples` (words), plus top-level `confusionGroups`. Join to sound videos BY `ipa` (and `ipa_aliases` where direct match fails).
- Existing sound video player component used by the tooltip popup — reuse it for the modal/inline player; do NOT build a new player.

## Visual references (Kyle-ratified)

- **americanipachart.com** — layout inspiration: clean grid of sound cells, click-through to detail, generous whitespace, playful but unified. Kyle noted its mixed-style illustrations as a defect: OURS USES NO ILLUSTRATIONS in v1. Cells are IPA symbol + Spanish name. **Its other weakness is the opportunity: Fabien never explains why the consonants are grouped. Kyle's own 2021 pronunciation course DOES, and this slice ships that layer.**
- **gliglish.com/minimal-pairs** — exercise inspiration: hear one word, two choices on screen, tap the one you heard, instant feedback, then hear both back to back. Copy the mechanic, not the branding.
- Everything renders with existing DESIGN.md tokens (Paper Light). NO new colors, fonts, or invented values (ask-gate applies). IPA symbols use the app's existing IPA typography.

## Chart organization: Kyle's sound taxonomy (from his 2021 video course draft)

Source of truth for names + wording: Kyle's draft at vault `Language-Wiki/source-materials/e4l-pronunciation-video-course-draft-2021.md`; distilled in vault `Language-Wiki/concepts/pronunciation-course-sound-taxonomy.md`. The guide JSON's `targets` groups (vowels/consonants) map INTO these sections; each guide target's `id`/`ipa` determines its cell. If a sound exists in the JSON but not below, place it by its closest articulatory group and list it in the PR as a placement note.

**Consonant sections, in this order, each with a one-line explanation (Kyle's own definitions, use them as the section subtitle):**

1. **Fricativas** — "exprimiendo aire por una pequeña brecha" (/f v θ ð s z ʃ ʒ h/)
2. **Explosivas** — "bloqueando el aire completamente antes de dejarlo salir" (/p b t d k g ʔ/)
3. **Africadas** — "combinando explosiva y fricativa juntas" (/tʃ dʒ/)
4. **Aproximantes** — "casi como vocales sin mucha obstrucción" (/w ɹ j/)
5. **Aproximantes laterales** — igual pero "por los lados de la lengua" (/l ɫ/)
6. **Nasales** — "soltando aire por la nariz" (/m n ŋ/)

**Vowel sections, in this order:**

1. **Vocales débiles** (ə and the weak forms of i, ɪ, u; the guide's schwa lives here)
2. **Vocales cortas** (ɪ ʊ ɛ ʌ ɑ æ)
3. **Vocales largas** (iː uː ɚ and the r-colored ɑr ɔr ɛr ɪr)
4. **Diptongos** (aɪ eɪ aʊ ɔɪ oʊ)

**Two explanation moments Kyle wants that Fabien never ships (render as short intro text, in his voice, Spanish, with accents, no em dashes):**

- Above the consonant groups: consonants BLOCK the air, vowels SHAPE it; the consonant groups differ in HOW they block it (squeeze, hold, hold+squeeze, barely, sideways, through the nose). One sentence each is enough; the section subtitle IS the explanation.
- Above the vowel groups: monoptongos = the tongue stays still; diptongos = the tongue moves. Spanish has 5 pure vowels, English has 11 plus 5 movers, which is why English sounds "muddy" to Spanish ears until these are learned. This is the "cómo leer esta tabla" moment.
- Keep it to ~2 short paragraphs total; do not write an essay. His mnemonics (chimpancé ʊ, perro gruñendo ɚ, R de pirata ɑr) stay on the individual SOUND pages (future coach text), not the chart.

## Scope

### 1. Public chart page `/sounds`

- No auth required. Works on 375px (mobile-first rule). Add `<meta>` title/description in Spanish ("Los sonidos del inglés americano | Profe Kyle").
- Sections: the Kyle taxonomy above (Vocales: débiles/cortas/largas/diptongos; Consonantes: fricativas/explosivas/africadas/aproximantes/laterales/nasales), built from the guide JSON's `targets` joined to sound videos. Group headings render with Kyle's one-line explanations as subtitles.
- Each cell: IPA symbol (large), `nameEs` (small), a subtle dot/badge when a video exists vs muted styling when not (placeholder still clickable — the sound page explains with coachEs text even without video).
- Header: one line in Kyle's voice: listening first, no grammar drilling. Link to learn.profekyle.com signup for logged-out users ("Crea tu cuenta gratis" or existing signup path) — do not gate anything behind it.
- Navigation entry: logged-out → visible from the landing/login chrome where sensible; logged-in students → a Herramientas card ("Guía de sonidos"); keep existing bottom nav untouched (no new tab — same rule as Drill Lab).

### 2. Sound page `/sounds/[id]` (id = guide JSON's `id`)

- Hero: IPA symbol + nameEs + the video player (or the placeholder line).
- Body sections, all in Spanish with proper accents, from `coachEs`: Por qué (shortWhyEs), Cómo hacerlo (tipEs), Practica (practiceEs), "En español dices…" (likelySpanishSubstitutions).
- Examples: each word with a play button (audio, see §3).
- Minimal pairs exercise (the Gliglish mechanic): N rounds (8 or however many pairs the sound has, min 4). Per round: play one word's audio (randomly picked of the pair), show the two words as big tappable buttons, tap to answer, instant feedback (correct/incorrect + both words play back to back). After the last round: score + "Escuchar de nuevo" replay + link back to chart. **Logged-out users can play fully — no account needed.** No tracking, no DB writes in v1 (tracking hooks come later via ADR 015's minimal-pairs sensor, P3).

### 3. Audio for examples and pair words — generated MP3s, committed

- New script `scripts/gen-sound-audio.ts` (or a plain Node script): uses **Edge TTS** (free, en-US voice) to synthesize one MP3 per example word and per minimal-pair word into `public/audio/sounds/<word>.mp3` (slug-safe lowercase). Idempotent: skip existing files. Word list is derived by walking the guide JSON (dedupe across sounds).
- Rationale: v1 audio is generated, not Kyle-recorded. Files are plain static assets, so swapping in Kyle's voice later is re-running the script with his recordings — no code change. Note this in SCRIPTS.md.
- Player: tiny shared audio-play hook/component (or reuse an existing one if present — check first). Preload nothing until tap.

### 4. Tests + verification

- Unit tests for the pure glue: joining guide targets ↔ sound videos by ipa/aliases (every guide target resolves to a cell or is explicitly listed as videoless); parsing "seat/sit" pair strings into two words; the audio slug function.
- `npx tsc --noEmit` clean; run the touched test files with `npx tsx --test`.
- Manual: logged-out incognito visit to /sounds renders chart; click /ɪ/ → video + pairs exercise completes with audio; a videoless sound shows the placeholder; 375px viewport clean.

## Out of scope (explicit)

- Kyle re-recording example/pair audio (content task, later).
- Pronunciation assessment / voice recording integration.
- Tracking attempts (ADR 015 P3 minimal-pairs sensor) — structure the exercise component so an `onAttempt` hook can be added without redesign, but do not write any events.
- Pronunciation library product wiring (the `pronunciation` product level exists from Slice 87; linking the product to this page comes with the Stripe slice).
- Fabien-style illustrations.

## Honesty rules

- All Spanish copy with written accents; NO em dashes anywhere.
- Copy voice: direct Canadian-teacher warmth, tú form, no AI tells.
- If `sound_videos` rows and guide JSON disagree on IPA notation for a sound, resolve via `ipa_aliases` and note any unresolved sound in the PR instead of silently dropping it.
