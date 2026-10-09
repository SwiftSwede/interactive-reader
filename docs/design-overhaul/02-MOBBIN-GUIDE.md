# Step 2 — Mobbin Research Guide (Cursor: after audit, before recommendations)

**Purpose:** capture concrete interaction patterns from real apps to support or challenge each recommendation. Mobbin is a screenshot service — gather patterns with sources, not vibes. For each capture, record: **app, screen, pattern, why it matters here, direct link.**

## What to search (mapped to our needs)

### Priority 1 — reader & audio (our center of gravity)
- **Spotify** mobile: now-playing bar, mini-player → full-player expansion, persistent playback on navigation. Our sticky audio rail.
- **Blinkist / Speechify / any longform reading app**: reading typography, progress indication without percent-anxiety, resume-point patterns.
- **LingQ / Beelinguapp if indexed**: parallel text handling, tap-word dictionaries, how they show lookup without leaving the sentence.
- **Apple Books / Kindle mobile**: sentence highlight during narration, quiet non-karaoke focus, tap-to-reveal controls.

### Priority 2 — entry & navigation (zero-instruction requirement)
- **Netflix mobile**: continue-watching card, bingeable next-episode, cover-browse, download states.
- **Spotify home**: resumable content, "pick up where you left off," shelf patterns with finite curated rows.
- **Headspace**: need-state entry ("sleep/calm/focus") — mapped to our Read / Listen / Repair / Pronounce / Class labels.
- **Endel if indexed**: one-tap start, state-first minimal entry.

### Priority 3 — adult-calm visual language (the Lighthouse register)
- **MasterClass**: expert authority, editorial restraint, dark chrome done without hacker-UI.
- **Aesop / Kinfolk-adjacent retail apps if indexed**: museum-quiet product browsing, serif editorial typography, whitespace hierarchy.
- **Headspace (again, visual)**: how calm premium avoids gamification while remaining engaging.

### Priority 4 — flows we'll need
- **Any app**: bottom-sheet word/detail patterns (Airbnb, Apple Maps detail sheets) — drag handle, dismiss, layered info.
- **Duolingo (for negative reference only)**: capture their Practice Hub clarity of "continue" WITHOUT the streak/XP chrome — note what to keep (clear single next action) and what to strip (currency, flame, leagues). Explicitly labeled: pattern skeleton yes, engagement mechanics no.
- **Notion/linear-style apps**: quiet teacher dashboard patterns if desktop dashboard patterns needed later — deprioritize for now.
- **Shop + DoorDash web homes (Kyle, 2026-10-09):** pinned in [`mobbin-dashboard-refs/`](mobbin-dashboard-refs/README.md) for a later student/teacher dashboard pass. Chip overflow chevrons and finite labeled shelves. Not a catalog to copy.

## Capture rules

1. **Mobile (375px) patterns first.** Desktop captures only for teacher dashboard later.
2. Every capture gets a "constraint check": does this pattern violate anything in `00-BRIEF.md` (no gamification, no pressure language, value-before-signup, 44px targets)? If it violates, note it as a NEGATIVE reference.
3. Group captures by the audit pattern numbers (`01-AUDIT.md` sections A1–F22) so each recommendation can cite: audit finding → Mobbin pattern → proposed change.
4. If Mobbin lacks an app, note it and move on — don't substitute generic inspiration posts.

## Output

A pattern library table: pattern name | source app + link | screenshot description | maps to audit item # | adopt/adapt/avoid per brief constraints. Cap at ~25 strongest captures. Write findings into `02-MOBBIN-GUIDE.md` under a "## Findings" heading (keep the search guide above intact for reference).

## Findings

Captured 2026-09-27 from Mobbin MCP, iOS screens, after the audit in `01-AUDIT.md`. Adopt / adapt / avoid is a constraint check against `00-BRIEF.md`, not a build instruction. Screens were inspected, not summarized from titles alone.

| Pattern | Source | What the screen shows | Audit # | Call |
|---|---|---|---|---|
| Mini player above the tab bar | [Spotify](https://mobbin.com/screens/fe8b1a9f-1311-44e4-bbb3-0761ce84a941) | A short bar: art, title, artist, device, play. It sits above Home / Search / Library. | A8, B9 | Adapt. Persistent transport is the pattern. Art and device icons are not. Ours already has the bar inside a lesson and drops it when the student leaves. |
| Full player | [Spotify](https://mobbin.com/screens/ea9de8a4-a66d-4915-8af8-2c10e3807cb6) | Large art, seek, a large pause control, a lyrics entry. | A8 | Adapt the expansion only. Lyrics karaoke on a story is what the brief says to avoid. |
| Start listening plus recents | [Spotify flow](https://mobbin.com/flows/110c08ea-444c-48c8-9c0a-9ef6aa2389f5) | Home opens with "Start listening," three recent rows, then a short shelf. | B10 | Adapt. One resume row, then the finite month. Not an infinite catalog. |
| Sentence highlight while audio plays | [ElevenReader](https://mobbin.com/screens/1902da38-c46f-425a-a610-1b1a359c536c) | A pale block behind the current passage. "Back to current" if you scroll away. Player docked under the text with a 1x control. | A3, B10 | Adopt the quiet block and the return-to-place control. Do not copy the green. |
| Reading column with a floating player | [Blinkist](https://mobbin.com/screens/ea3a5a5a-2509-4c4e-b35e-69955e2349e4) | A chapter in serif, then a rounded player over the text: 1.0x, back 15, play, forward 15. | A1, A8 | Adapt the player-over-text. |
| Chapter progress as time left | [Blinkist](https://mobbin.com/screens/ea3c48f7-2bb6-4fd2-aec0-01dc925042cf) | Same reader. The scrubber reads "0/10" and "24min left." | A1, F22 | Avoid the time-left and the fraction. That is pressure language. |
| Book page, controls hidden until tapped | [Apple Books](https://mobbin.com/screens/faf1154b-fe25-40e2-b592-873299f9b8f5) | Large serif, wide paragraph gaps, a page count. | A1 | Adapt the quiet page. "8 pages left" is mild pressure. Skip that label. |
| Reader chrome with a percent | [Apple Books](https://mobbin.com/screens/fda02365-2264-4eff-a55e-7850616e58bf) | The overlay says "Contents · 0%." | F22 | Avoid the percent. |
| Selection toolbar on a paragraph | [Matter](https://mobbin.com/screens/058e54c1-2c6e-4568-939e-72ca0bd6ef85) | A passage is selected. A small bar offers Play, Highlight, Co-Reader, Copy. The rest of the page stays text. | A2, A3 | Adapt. A small bar on the sentence, not a popup that covers the line. |
| Dictionary sheet | [Speak](https://mobbin.com/screens/6cda687c-0218-4908-9d4c-86fa22cfc242) | A sheet: word, speaker, translation, part of speech, example. The page stays behind it. | A2, A6 | Adapt. A sheet plus audio fits. Showing the translation in the first view is the A6 choice. |
| Parallel text always on | [CapWords](https://mobbin.com/screens/2aace411-2808-4ce8-9385-5cba88ae2a0c) | Both languages on every line. One word is marked. | A6 | Avoid as the default story view. Traducción already does bilingual text on purpose. |
| Card over the content | [Apple Maps](https://mobbin.com/screens/ef125d25-1074-43b1-aa75-d643acc4ffc1) | A card rises over the map with a close control. The map stays visible. | A2 | Adapt for the word card. "Ver el texto" already does this for the story. The word card does not. |
| Grabber sheet | [Apple Maps](https://mobbin.com/screens/b14f305a-398b-42cb-8099-168770af33db) | A light sheet with a top grab and a few actions. | A2 | Adapt the grabber and the short height. Not the map actions. |
| Continue as one button | [Headspace](https://mobbin.com/screens/cda46030-4c2b-4b7c-b6f1-6e08db0ddf96) | A course page ends in one "Next Session" button. | B10 | Adapt the single next action. The row of green check circles is a completion path. The lesson already has step dots. |
| Rows grouped by moment | [Headspace](https://mobbin.com/screens/efc82d96-660f-4e91-bff9-1f3d083c34eb) | Today is a short list: podcast, focus music, wind-down, sleep. | B10, B12 | Adapt the finite rows. Skip the illustrations. |
| Mode tabs | [Endel](https://mobbin.com/screens/ec1370bc-7d8f-4987-91f3-b7e8fa7f6a55) | One screen, one job. Tabs: Now, Focus, Relax, Sleep, Activity. | B10 | Adapt as Read / Listen / Repair / Pronounce / Class. Do not copy claims like "backed by neuroscience." |
| Dark editorial home | [MasterClass](https://mobbin.com/screens/f9ba0317-2f4f-4c85-9be0-3c0ed2f7c9a3) | Near-black canvas, a large portrait, one Play, small category chips. | E18 | Reference only. This is the dark-museum option. "NEW" badges and "My List" are catalog chrome. |
| Dark catalog density | [MasterClass](https://mobbin.com/screens/f1d860c4-82c2-40b9-aede-4af8afbc7fbe) | Rows of classes, "26 lessons · 5h 41m," a pink library button. | B12, E18 | Avoid the abundance and the duration pile-up. Useful only as a picture of dark chrome done loudly. |
| Dark reading page | [Brink](https://mobbin.com/screens/dc178fa8-2ca5-4cd1-a430-20e0c8aca738) | Warm dark brown page, serif story text, search as an overlay. | E18, A1 | Reference only for the theme choice. Aesop did not come back from search. |
| Catalog home | [Netflix](https://mobbin.com/screens/fbdfff10-2fc8-43a4-9f2e-505722d1771e) | Many poster rows, "TOP 10," games mixed in. | B12 | Avoid. This is the catalog arms race the brief rejects. |
| Title page with one Play | [Netflix](https://mobbin.com/screens/f7087383-70ec-4e3a-85c7-a4e5428cdc25) | One title, one Play, one Download. | B10 | Adapt the single play. Download states are out of scope. |
| One obvious next action, wrapped in a game | [Duolingo](https://mobbin.com/screens/fd077091-e8e9-413f-9aff-bb68984e5b04) | A path, a mascot, a flame, gems, and "START +40 XP." | B10, F22 | Avoid the chrome. The usable piece is one labeled next action, which Headspace already shows without the game. |
| Second home with two currencies | [Duolingo](https://mobbin.com/screens/fac0e197-2364-48f1-bc26-be8ddf392179) | "REVIEW +5 XP" and "LEGENDARY +40 XP" on the same card. | F22 | Avoid. Two currencies on the primary button. |

### Not returned

LingQ, Beelinguapp, an Apple Books word-lookup popup (the deep search came back empty), Aesop, and a Netflix "Continue Watching" progress bar. Speechify is indexed, but the hits were an import sheet and an accent picker, not the listening highlight. ElevenReader covered that job instead.

Paper Light stays the shipped system until a recommendation in `03-RECOMMENDATIONS.md` is approved. These captures do not change `DESIGN.md`.
