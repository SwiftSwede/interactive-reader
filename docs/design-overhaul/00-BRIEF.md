# Design Overhaul Brief — Sources of Truth

**Status: ACTIVE.** This is the master context for the design overhaul. The full Manus competitive report lives at `~/Downloads/Profe Kyle — Competitive Design & Market-Positioning Report.md` — do not re-summarize it; use it for pattern-level reference.

## Problems the app solves (in priority order)

1. **"Institutes taught me English, but I can't understand or speak it."** Input-first methodology: i+1 graded adult stories, tap-any-word audio, IPA everywhere, dictation-based listening repair. Not quizzes.
2. **"I need my teacher's system outside the 90 minutes I have him."** Sistema de 8 made portable: session links as virtual handouts, materials before/after class, mobile.
3. **"The teacher is flying blind between classes."** Interaction evidence (lookups, replays, dictation misses, answers, attendance) → a reteaching map, not a gradebook.
4. **(End-state)** Self-learning-only version: *"Every self-study app I've tried is a game, not a method."* A teacher's method in the pocket of adults who've outgrown Duolingo.

## The user we design for — the Trapped Professional-Creative

LatAm adult, ~28–45, high A2–low B2. Substantial in Spanish (executive, founder, writer, designer, academic); simplified, hesitant, childish in English. The wound is identity, not vocabulary.

**Wants:** sound like themselves; understand real native-speed English; surgical diagnosis; visible progress; phone-in-life's-margins; a teacher whose depth they respect.

**Needs (unspoken):** massive comprehensible input; dictation-based decoding repair (they think it's vocabulary; it's parsing connected speech); IPA mechanics not imitation; **identity-safe difficulty — graded but never childish, ZERO gamification cues (streaks/hearts/leaderboards/mascots = instant repulsion)**; invisible structure, never a gradebook; frictionless access (magic link, PWA, 5s from WhatsApp tap, 375px).

## Brand filter ("the Lighthouse")

Kyle = INTJ, 4w5w6. Attracts: Deep Seekers (E5), Identity Seekers (E4), Power Seekers (E8/exec 3s), INFJs. Repels: quick-hack pragmatists. The design aesthetic IS the filter: dark, quiet, structured, elite museum — not busy marketplace. Banned: "Learn English Fast," countdown timers, pop-ups, playful edtech energy. Full note: vault `Business-Wiki/concepts/lighthouse-brand-archetypes.md`.

## Hard constraints (non-negotiable)

- **$0-ish infra**: Vercel/Supabase free tier, ~$40 LLM budget, Edge TTS. Precompute, generate-once.
- **One teacher's content bandwidth**: every story must serve reading + listening + vocab + dictation + review ("same reader, different overlay" = content multiplication).
- **375px or it doesn't ship.** PWA, no App Store, WhatsApp discovery.
- **Input before output.** The story reader is the center of gravity; everything orbits it.
- **No due dates, homework, rubric scores, gradebooks, or pressure language** ("behind," "streak," overdue). Students keep access to their active-period materials after cancellation — "finished bookshelf," not "locked library."
- **Adoption-gated v1**: value before account/mic/permission asks; declining never punishes (no blur/lock).
- **IPA everywhere**, no Kyle custom symbols; every sound tappable → video popup (Bunny Stream).
- **Class sync is teacher-driven**; student pages are pure mirrors.
- **Grounded AI only** — no invented answers; every AI output cites its evidence.
- **Two-site split fixed**: profekyle.com (WordPress marketing/Lighthouse) ≠ learn.profekyle.com (pure product). The app never grows a marketing surface.
- WCAG 2.2 AA floor: 44px targets, 4.5:1 body contrast, keyboard focus visible, reduced-motion honored.

## Design north stars (split jobs)

- **Spotify/Netflix** for the interaction *skeleton* — zero-instruction navigation, now-playing bar, continue-watching resume. Muscle memory.
- **The Lighthouse** for the emotional *register* — dark graphite canvas, warm paper text, restrained teal accent, serif reading typography, museum-quiet chrome. Qualification, not decoration.

## Manus report — the decisions that matter (already researched, don't redo)

- **Verdict:** teacher-led *diagnostic reading studio*, not another English app. The wedge = adult graded story + tap-word audio/IPA + diagnostic dictation + class sync + teacher reteaching view, in one quiet system.
- **Adopt:** reader as center of gravity; tap-any-word bottom sheet; synchronized sentence audio + quiet highlight; short embedded comprehension checks (1–3, no score); evidence event taxonomy before analytics; one clear Continue action; dictation as "what did the sound become?" (phrase-level diff, never % score); need-state entry labels (Read / Listen / Repair / Pronounce / Class); class → learner → evidence drill-down hierarchy.
- **Adapt:** bilingual scaffolding (tap not long-press; English attention first, translation as intentional reveal); Repair surface (bounded, source-linked, no flashcard casino); audio journal (private status labels, not medals).
- **Avoid:** streaks/XP/hearts/currencies/countdowns (don't cosmetically rename them); catalog abundance arms race; peer correction/public sharing; opaque AI personalization; miracle-timeline claims; long-press-only affordances; karaoke motion competing with reading.
- **Proposed visual tokens** (Manus §8.2): graphite surfaces (#101213/#181B1D), warm paper text (#F5F2EA), calm teal accent (#8BE1D2), brass for teacher-notices (#F0C77D), serif reading font (Source Serif 4 / Lora), 44px tap minimum. Contrast pre-checked 6.93:1–16.79:1 on text tokens. NOTE: this is a *proposal* — current app uses Paper Light theme (warm off-white #faf6f0, terracotta, moss green, Lora+Roboto Flex, per DESIGN.md). The light-vs-dark decision is Kyle's, not assumed.

## Working agreement for this overhaul

1. Cursor audits current state (`01-AUDIT.md`) — code + DESIGN.md, pattern by pattern, no recommendations yet.
2. Cursor does Mobbin research (`02-MOBBIN-GUIDE.md`) — capture patterns, not vibes.
3. Cursor writes recommendations (`03-RECOMMENDATIONS.md`) — each as a standalone proposal with current state, proposed change, pattern evidence, constraint check, effort, and risk. Kyle approves/rejects/defers each one. Nothing gets implemented without a ✅.
4. DESIGN.md is the final authority on visual decisions. Any approved change updates DESIGN.md.
