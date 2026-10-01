# Slice 77 (or next free number): Sentence Reference Numbers (every 5th)

If the PRD number 77 is already taken, use the next free number and note it in this header.

## Why (context, not spec)

Kyle's students use the web app in class in pairs. In the old Google Doc workflow, page numbers let a student remember where they saw something or tell a partner where to start reading ("empieza en la 30"). The app has no shared coordinate system. Visual line numbers are impossible (reflow differs per screen width, so a desktop student and a phone student would disagree). The stable unit is the SENTENCE, which the app already segments and numbers internally (`sentenceIdsForBody` in `src/lib/sentence-highlight.ts`, `kind`-aware: story / dialogue / movie_talk / song).

## What to build

**Display-only change.** No migration, no new tables, no API routes, no data model changes, no AI calls. Everything lives in the story reader rendering path.

1. **Number sentences, not visual lines.** Use the existing `sentenceIds` segmentation in `InteractiveStory.tsx` (the same DOM-order sentence IDs used for karaoke highlighting). Sentence N = Nth sentence in reading order for that `kind`, matching how the IDs are computed — do NOT invent a second segmentation.

2. **Show a marker every 5th sentence:** 5, 10, 15, 20… to the end. Not every sentence. Quiet, small, non-interactive for this slice.

3. **Where:** a small number rendered at the start (left edge) of the 5th/10th/… sentence, as an inline element inside the existing sentence span — NOT a separately-positioned gutter (absolute-positioned gutters break on mobile reflow). It must look like the printed reading-comprehension tests Kyle remembers: unobtrusive, present when you look for it, invisible when you're just reading.

4. **Coverage:** applies wherever `InteractiveStory` renders running text for `kind = "story"`. For `dialogue`/`movie_talk`/`song`, do NOT render numbers in this slice (dialogue line/speaker layout would need its own treatment; out of scope).

5. **Design rules:** read `product.md` and `DESIGN.md` first. Reuse an existing quiet/muted text token; do not invent a new color, weight, or size — if nothing is covered, ASK before inventing (`.cursorrules` ask-gate). Must be flawless at 375px. Numbers must not interfere with word tooltips, flag marks, karaoke highlighting, or note lightboxes — verify tap targets still work around the number element.

6. **Tap behavior:** none in this slice. A "go to sentence N" / scroll-to action is a possible follow-up; do not build it now.

## Reversibility requirement

This slice must be a single self-contained commit touching only display code, so a one-commit `git revert` restores the reader exactly. Do not refactor unrelated code in the same commit.

## Verification

- `npx tsx --test` on any touched test files (add a small unit test: the "every 5th" selection logic, if extracted as a pure function — e.g. `sentenceNumbersFor(ids)`).
- `npx tsc --noEmit` clean.
- At 375px and desktop widths: sentence N has the same number on both (the core invariant of this slice).
- Word tooltip taps on sentences that carry a number still open the tooltip.
- Karaoke audio highlight still works with numbers present.
- DESIGN.md front matter/body updated in the same commit if any token is touched.

## PRD

Add the slice row (acceptance: "The same sentence shows the same number on a phone and on desktop; markers appear on 5, 10, 15… and on no other sentence; word tooltip and karaoke behavior unchanged.") and record the build commit hash when verified.
