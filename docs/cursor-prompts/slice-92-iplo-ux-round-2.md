# Slice 92: Iplo UX round 2 (narration screen, prompt dedup, vocab recap, script freshness)

Ratified in chat with Kyle 2026-10-15. Read `.cursorrules` first as always.

**Merge danger:** low. No migrations, no purchases. Note the Slice 90 player set is PARTIALLY committed: `src/components/AudioCoursePlayer.tsx`, `src/lib/iplo.ts`, `src/lib/iplo.test.ts`, `scripts/iplo/*` are committed; `src/app/lesson/[slug]/iplo-actions.ts`, the lesson-page dispatch changes, `src/lib/iplo-session.ts`, and the migration are still untracked. Include those in this slice's commit so the feature is whole. Do not commit unrelated working-tree files.

## Context: bugs fixed today (do not regress)

- Seed data (day 1 re-imported several times): answers deduped from choral repeats, `pauseAt` sits right after the question ends (`min(span_end + 0.5, next_start - 0.15)`), narration/prompt split at parse time, karaoke tolerant matching (apostrophes, no destructive skip, short prefixes), cumulative highlight, post-prompt answer rescue. The aligner is `scripts/iplo/align_v3.py`; the day-1 transcript union is `scripts/iplo/day1-whisper.json`. All rules live in the Hermes skill reference `iplo-audio-course-pipeline.md` ( Kyle can paste if needed).
- Player: cumulative karaoke, `englishOnScreen()` with 8s bounded hold, no load-time seeks (saved position applies on play via `pendingSeekRef`).
- Seek behavior RATIFIED 2026-10-15: teacher (`isTeacher`) seeks freely, passed prompts marked skipped; students keep the wall on first runs, free seek on replays. Already implemented in `onSeek` (commit be90e2d) - do not redo.

## 1. Spanish narration on screen (Spotify-lyrics style) - Kyle approved in principle

Goal: the screen is never blank; students can follow Kyle's Spanish narration karaoke-style if they want.

Data: narration segments currently carry only `{start, end, lines[]}`. The word timings EXIST in the alignment (the DP matches narration lines too). Change `scripts/iplo/align_v3.py` so narration segments also carry `words[]` like english segments (use the per-line matched indices; narration lines merge into one segment - attach words per line concatenated). Re-run day 1: `python3 scripts/iplo/align_v3.py <day1-whisper.json> 1 scripts/iplo/day1-segments.json && python3 scripts/iplo/fix_answers_and_pauses.py <file> && npx tsx scripts/iplo-import.ts --only 1`. Then read back prod and verify narration words exist.

Display (`AudioCoursePlayer.tsx` + `iplo.ts`):
- While the current segment is narration, show its Spanish text karaoke-styled with the same cumulative rule (`karaokePieces`), `lang="es"`.
- Styling MUST be visually subordinate to English sentences: dimmer color, smaller size. Check DESIGN.md for an existing muted/secondary text token; if nothing fits, ASK KYLE before inventing a token, then update DESIGN.md front matter + body in the same commit.
- English keeps priority: when an english segment is current, it replaces narration text (existing `englishOnScreen` logic drives what wins - extend it to return a discriminated `{ kind: 'english' | 'narration', segment }` result instead of only english).
- Prompt behavior unchanged: prompt text clears narration.
- Content area only; sticky bar and nav untouched.

## 2. Input screen shows only the question (no repeated "Otra vez")

The question now shows karaoke-style while Kyle asks it, and again above the input. On the INPUT screen only, strip the conversational lead from the displayed Spanish: leading `Otra vez.`, `Otra vez,`, `Dime otra vez.`, `Ahora di`, `Ahora dime`, `Ahora dime,` (case-insensitive, tolerate trailing spaces/commas). Pure display transform (helper in `iplo.ts`, unit-tested); the seeded `spanish` stays untouched. The karaoke screen keeps the full text.

## 3. End-of-lesson "Palabras de hoy" recap

Kyle's vocabulary-pill idea, resolved into a recap screen (Pimsleur-style: vocabulary lives AFTER the audio lesson, not as a HUD over it):

- After the done state (`done === true`), under the closing line, show "Palabras de hoy" with the lesson's target vocabulary, derived from the prompts' `expected` answers: unique content words in first-seen order (split on whitespace, strip punctuation, drop pure function words is/are/articles is NOT needed here - day 1 expected answers are "I speak." / "You speak." etc., so the unique word set is the vocabulary: I, speak, you, he, speaks, she, we, they...). Cap at 12 items.
- No counts, no streaks, no gamification (brand pillar). Plain chips or a comma list in existing tokens only.
- Copy: title "Palabras de hoy". One short line under it if any: "Escuchaste y usaste estas palabras hoy." Kyle QA before merge (accents mandatory, no em dashes).
- Nothing is persisted; it renders from the script in memory.

## 4. Script freshness (kills stale-session weirdness for real)

Kyle re-seeds lessons regularly; a long-lived tab keeps playing an old script. Add a version stamp: `seedVersion: string` (ISO timestamp set by `iplo-import.ts` on every write) in `audio_script`. The player persists `seedVersion` alongside answers/time in sessionStorage; on mount, if the saved `seedVersion` differs from the current script's, DISCARD the saved answers/skips/time (fresh start, no resume) silently. This is the "caching bug" Kyle has been hitting. Unit-test the discard rule in `iplo.test.ts`.

## Tests

- `iplo.test.ts`: narration words parse, `karaokePieces` on narration text, lead-strip helper, recap vocabulary derivation, seedVersion discard.
- `npx tsc --noEmit` clean; full suite green.

## Out of scope

- Day 2-23 seeding (needs the aligner run per day + grammar tags; separate slice).
- Minimal-pairs drill, sound banks (deferred slices).
