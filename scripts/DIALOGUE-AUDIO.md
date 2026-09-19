# Dialogue Audio Pipeline (ElevenLabs)

Multi-voice audio for the int dialogues. Cast is permanent — same three
voices for every future dialogue.

## The cast (saved in ElevenLabs account, mirrored in `scripts/voice-cast.json`)

| Character | Voice ID | Personality |
|---|---|---|
| Gordon | `lfQC9ypxd3IKzDBe9bgJ` | Gringo CEO, 55, hearty, dynamic (stability 0.30) |
| Pedro | `XYYuPnmwhF0f9JLg8bih` | Mexican "corporate shaman," serene, rhotic Rs |
| Brenda | `ijPfQ0iIweXMBVzCAg91` | Mexican data analyst, General American, minimal fry |

Audition history: 50+ candidates over 5 rounds in `~/Desktop/el-auditions*/`
(`generated-ids.json` tracks every candidate ID ever generated).

## Usage

```bash
# Full dialogue -> public/audio/stories/{slug}.mp3
python3 scripts/generate-dialogue-audio.py superstitious-minds

# Sample (first 8 lines) -> /tmp/dialogue-audio/<slug>/sample-stitched-v3.mp3
python3 scripts/generate-dialogue-audio.py superstitious-minds --sample
```

## How it works (conventions that matter)

- **Model:** `eleven_v3`. Note: `previous_text`/`next_text` are NOT
  supported on v3 (400 error) — do not add them back.
- **One render per dialogue LINE** (not per sentence) — keeps room tone
  continuous. Sentences inside a line are separated with
  `<break time="0.40s" />` tags (model-generated silence, no splice
  artifacts). Only speaker turns get a 0.15s ffmpeg pad.
- **Acting:** `DIRECTIONS` dict in the script maps every line index to a
  mood + optional `[audio tags]` (v3 inline emotion tags like `[sighs]`,
  `[quietly]`, `[erupts]`) + optional per-sentence intensity tags. This is
  the "AI director" pass — edit the map, re-run, done.
- **Stage directions** (`[exits humming]` etc.) are stripped from speech
  automatically by the parser.
- **Input:** vault file `Language-Wiki/raw/stories/int dialogues/{Title}.md`
  (slug mapping in `SLUGS` dict). Kyle's `Name-Dialogue` format.
- **Output:** `public/audio/stories/{slug}.mp3` — the `{slug}.mp3`
  convention the karaoke/timestamp pipeline expects
  (generate-timestamps.py → align-story-timestamps.py).

## Retaking a single line

1. Edit that line's direction in `DIRECTIONS` (or just tweak the tag).
2. Re-run with `--sample` for cheap iteration, or hand-render one line
   via the API and drop it over `/tmp/dialogue-audio/<slug>/NNN-Char.mp3`,
   then re-run the stitch (the script rebuilds from per-line files).

## Sound effects pass (stage 2)

```bash
python3 scripts/sfx-pass.py superstitious-minds
```

- Generates SFX via /v1/sound-generation (needs `sound_generation` scope on
  the API key) and caches them in `public/audio/sfx/` — reuse is free.
- Placement is LANDMARK-BASED: it detects the real silence gaps in the
  stitched bed (silencedetect, -45dB, >=1.2s) and anchors SFX to them —
  no cumulative drift. The longest gap = the knock window; the scene-pad
  structure in generate-dialogue-audio.py creates these landmarks
  (5.0s gap between lines 67/68 holds both knock sounds).
- Re-run after any --restitch; mixing writes dialogue.mp3.tmp then swaps.
- Kyle's API key needs: text-to-speech, voice generation, voices,
  sound effects.

## Karaoke sync (stage 3)

```bash
npx tsx scripts/annotate-story.ts --slug superstitious-minds   # words+expressions (chunk-merged, ~2500 chars/call)
npx tsx scripts/dedupe-expressions.ts --slug superstitious-minds
python3.11 scripts/generate-timestamps.py --audio public/audio/stories/{slug}.mp3 --slug {slug}  # Whisper (slow, ~10 min)
python3.11 scripts/align-story-timestamps.py --slug {slug}     # re-map onto word positions
python3.11 scripts/karaoke-render-simulation.py --slug {slug}  # verify err=0
```

Dialogue notes:
- `seed-story.ts --kind dialogue` strips speaker prefixes + stage directions,
  so body_text = spoken words only (1107 tokens for this dialogue) — this is
  what Whisper must match.
- ⚠️ PostgREST default cap = 1000 rows. Every word-fetching script must
  paginate (`limit=1000&offset=N`). The app (`src/lib/stories.ts`)
  already paginates; scripts were patched 2026-09-16.
- Karaoke highlight pauses during SFX (no words there) — correct behavior.

## Cost

~8,700 characters (≈ $0.87 at PAYG rates) per full intermediate dialogue.
Kyle's plan: Starter $6/mo, 30k credits — covers ~3 full dialogues/month.
