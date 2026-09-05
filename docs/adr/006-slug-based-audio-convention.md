# ADR 006: Slug-Based Audio File Convention

## Context

Originally, all audio was hardcoded to "The Soccer Jersey" (the first story). StoryReader.tsx checked for `the-soccer-jersey.mp3` and fell back to it for every story. This meant no other story could have audio without code changes. Kyle records his own narration and Práctica Coral audio, dropping MP3s into `public/audio/stories/` with descriptive filenames (not the slug convention code expected).

Three types of audio per story:
1. Full story narration (`{slug}.mp3`)
2. Word-level timestamps for karaoke highlight (`{slug}-timestamps.json`)
3. Práctica Coral sentence audio (`{slug}-coral.mp3`)

## Decision

Audio files follow a slug-based file convention. `StoryReader.tsx` (server component) checks the filesystem at render time for each file type. If a file exists, the feature is enabled. If not, it degrades gracefully:

- No story MP3: audio player hidden, no karaoke highlight (`hideAudio` prop)
- No coral MP3: dictation and choral steps hidden in step navigation (pronunciation step still shows, uses microphone + Azure)
- No timestamps: no karaoke highlight (text renders normally)

The `coral_audio_url` field on `pronunciation_drills` is checked first (database), then the slug-based file path (filesystem). No hardcoded fallbacks.

## Consequences

- Kyle drops files in with the correct slug-based names and the app picks them up automatically. No code changes or database updates needed.
- Kyle's descriptive filenames must be renamed to match the convention (`{slug}.mp3`, `{slug}-coral.mp3`). This is a manual step Kyle does after recording.
- Timestamps are generated via Whisper (`scripts/generate-timestamps.py`, `--model base` not turbo). The project venv at `.venv/` has Whisper installed. Whisper may find slightly fewer/more words than the annotation pipeline (e.g., 998 vs 1000). This is expected and doesn't break the karaoke.
- Práctica Coral IPA is generated via `scripts/generate-coral-ipa.ts --slug {slug}` (one short LLM call, ~$0.001). Without this, the dictation step shows no IPA.
