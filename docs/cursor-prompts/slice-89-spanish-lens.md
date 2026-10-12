# Slice 89: The Spanish Lens — info icon + Spanish toggle on /sounds

> If the PRD slice number is taken, use the next free number and note it in the header.
> Kyle request (2026-10-11): two additions to the built Slice 88 sound guide, both making it targeted to Spanish speakers:
> 1. An **info icon** on each sound card that opens Kyle's detailed, unique explanation of that sound.
> 2. A **Spanish toggle** that visually shows what English shares with Spanish and what it does not: Spanish vowels appear on the mouth trapezoids, and consonant cards get a three-state relation badge.

## Content source (already authored, do NOT rewrite copy)

- `src/lib/pronunciation/sound-spanish-notes.v1.json` — 47 entries, one per catalog card, each with:
  - `slug` (matches the chart's card slugs: guide ids like `vowel_short_i` AND unjoined slugs like `short-a`, `dy`, `th`)
  - `relation`: `"igual"` (exists the same in Spanish) | `"parecido"` (similar but different, with the trick) | `"unico"` (does not exist in Spanish)
  - `noteEs`: Kyle's explanation in his voice (from his 2021 pronunciation course draft, in the vault)
  - `mnemonicEs`: his mnemonic where one exists (chimpancé, perro gruñendo, R de pirata, boca de médico, beso de pescado, uh-oh, Cuenca, la chancla de la abuela)
- Verified coverage: every card in `buildSoundChart()` resolves to an entry (47/47). If a future slug does not resolve, fail soft: no info icon, no badge, log a console warning in dev.

## Scope

### 1. Data glue — extend `src/lib/sound-guide.ts`

- Import the notes JSON. Type it. Build a `Map<slug, SpanishNote>`.
- Add `spanishNote: SpanishNote | null` to `SoundCell` (resolved by `cell.slug`).
- Add a test file (or extend the existing one): every chart cell has a non-empty `noteEs` when a note exists; the relation enum is enforced; the 3 relation buckets partition cleanly (assert the counts: igual 8, parecido 19, unico 20 = 47 total — update if Kyle edits the data, the test should catch accidental deletions).

### 2. Info icon + info card on each sound card (`SoundChart.tsx`)

- Next to the existing video icon (top-right of each card), add an **Info** icon (lucide `Info`) with aria-label `Explicación de {cell.name}`. Same 44px hit target pattern, `text-text-muted hover:text-text-accent`.
- Tap opens the existing bottom-sheet pattern (the one the app already uses for Ver el texto / Cómo): surface card, drag handle, close only in toolbar. Content, all Spanish with accents, NO em dashes:
  - Small relation line at top, color-coded by `relation` (see §3 palette): "Existe igual en español" / "Casi igual, con un truco" / "Solo existe en inglés".
  - The `noteEs` paragraph as body text.
  - If `mnemonicEs` exists: render it as a distinct one-liner (accent-soft background, label-md) labeled "Truco:".
  - One link at the bottom: `Escuchar y practicar` → `/sounds/{slug}` (the full sound page already has the video + coach blocks + examples).
- Both icons must not overlap on 375px: video icon stays top-right, Info icon sits directly LEFT of it (two 44px zones inside a 1/3-width card is tight; if that fails on 375px, move Info to bottom-right of the card instead, above the keyword line, and verify visually).

### 3. Spanish toggle (one control for the whole chart)

- A single toggle row above the chart, between the page title and the Consonantes section: label "Lente español" with a one-line hint, e.g. "Muestra qué comparte el inglés con el español y qué no." Default OFF. Persists in `localStorage` key `sounds-spanish-lens`.
- When ON, two things change:
  1. **Consonant + vowel cards get a relation badge**: a small dot (or 3-letter tag) in the card's top-LEFT corner, colored by relation. Color rules from DESIGN.md tokens only, no new colors:
     - `igual` → moss `--secondary-accent` (exists, familiar, success-family)
     - `parecido` → terracotta `--accent` (the attention color: similar but needs a trick)
     - `unico` → muted `--text-muted` dot + dashed card border (`border-dashed`) (foreign, new territory)
     - Include a one-line legend under the toggle: moss = igual, terracota = parecido, punteado = solo en inglés. The legend is REQUIRED; color alone is not enough (accessibility + the ask-gate forbids inventing new visual language).
  2. **Spanish vowels appear on the trapezoids**: new SVG overlays at `public/sounds/`. Author `vowel-trapezoid-es.svg` and `diphthong-trapezoid-es.svg` by COPYING the existing two SVGs and adding Spanish vowel markers (a, e, i, o, u for monophthongs; the Spanish diphthong positions for the diphthong chart) as distinct ghost markers: circle with `fill: none`, `stroke: var(--accent)` 1.5px, lowercase letter, `opacity: 0.85`, class `sound-diagram-hit-es` (NOT `sound-diagram-hit`, so they are not clickable). Place them at their approximate positions relative to the English markers: i next to iː, u next to uː, e near ɛ, o between oʊ start and ʌ, a near æ. Approximation is fine and expected; this is a teaching visual, not an acoustic plot.
  - When ON, `SoundDiagram` renders the `-es` variant instead (same fetch/hit logic; the ES overlays are non-interactive and `.is-selected` never applies to them).
  - Caption under the toggle (ON state only): "Los círculos huecos son las vocales del español. Ahí está tu lengua hoy. Los símbolos llenos son las del inglés."

### 4. Sound page integration (small)

- On `/sounds/[id]`, when `cell.spanishNote` exists, render the relation line + noteEs + mnemonic as a block directly ABOVE the existing "Por qué" coach block, titled "En español". Keep it visually quieter than the coach blocks (this is context, the coach text is the lesson).

### 5. Honesty rules

- All new Spanish copy carries written accents (verificar: también, ahí, poquito, Cuenca). NO em dashes anywhere.
- DESIGN.md tokens only: no new colors, no new font sizes, no invented visual language beyond the three-state badge + legend defined here. If any uncovered value feels necessary, STOP and ask Kyle (ask-gate).
- Mobile-first: the toggle row, badges, and info sheet must all work at 375px.
- Tests: `npx tsc --noEmit` clean; `npx tsx --test` on the touched test files; manual check at 375px: toggle persists on reload, badges show, ES ghosts appear on both trapezoids, info sheet opens from a card and links to the sound page.

## Out of scope

- No DB writes, no tracking (the minimal-pairs onAttempt sensor stays ADR 015 P3).
- No changes to the drill, the coach blocks' existing copy, or the chart's section structure.
- No Kyle re-records; audio stays Edge TTS.
