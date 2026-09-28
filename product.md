# PRODUCT.md

## Surface

Product UI. `learn.profekyle.com` is the Confident Speaker Circle app (Next.js PWA). Marketing and the brand's "lighthouse" presence live separately on `profekyle.com` (WordPress) — never grow a marketing surface here.

## Users

- **Classroom students (primary today):** LatAm adults in Kyle's Confident Speaker Circle, pre-intermediate (high A2/low B1) and intermediate (high B1/low B2). Spanish-speaking, mobile-only, arriving from WhatsApp links. They use the app between live Zoom classes as the "virtual handout" of the Sistema de 8.
- **Kyle (teacher, admin):** the sole content author and the diagnostic reader of student evidence. Desktop-first inside `/teacher/*`.
- **Future: self-learning consumers (design for, don't build yet):** the same persona without the live class — adults who outgrew gamified apps and want a teacher's method, not a habit game.

The shared persona across all three: the **Trapped Professional-Creative** — a LatAm adult ~28-45, intellectually or creatively substantial in Spanish (executive, founder, writer, designer, academic), who experiences English as an identity downgrade: witty, authoritative, nuanced in Spanish; simplified, hesitant, childish in English. The wound is identity, not vocabulary. Full persona: `docs/design-overhaul/00-BRIEF.md`.

## Purpose

Make Kyle's input-first method available outside the 90 live minutes, and turn student interactions into a diagnostic map that tells Kyle what to reteach. The shortest successful loop: open a link from WhatsApp -> read/listen to one adult story at i+1 -> tap a word for audio and IPA -> answer a comprehension check -> Kyle sees the evidence and reteaches precisely. Reading and listening are the foundation; speaking is the result.

## Boundaries

This product should never become:

- A gamified habit app (no XP, streaks, hearts, leagues, confetti, mascots)
- A content-catalog arms race (finite teacher-authored sequence, not an infinite library)
- A course marketplace, tutor marketplace, or social network (peer correction and public sharing stay out)
- An AI oracle that scores or diagnoses students autonomously (AI output is practice guidance with cited evidence; Kyle's judgment is the interpretation layer)
- A gradebook or productivity tracker (no due dates, homework, overdue states, or "you're behind" language)
- A marketing surface (the lighthouse/landing job belongs to profekyle.com)

## Personality

- **Calm, like reading a book:** minimal chrome, no pressure mechanics, one focal point per screen. This is why dictation and practice never interrupt reading.
- **Trusted mentor, not a gamified app:** warm, direct, Kyle's voice in all generated text ("Guardar en mazo" not "Save to deck"; contractions in English content; no corporate jargon). The mentor is demanding but never condescending.
- **Graded but adult:** difficulty is calibrated, content is never childish. LatAm-relatable premises, cultural depth. If a B1 story looks like a children's reader, the design has failed the persona.
- **Quietly rigorous:** IPA everywhere, evidence-linked answers, precise diagnosis. Depth is presented as dignity, not complexity.

## References

- **Kindle Sepia / premium educational journal:** the reading environment (paper texture, warm low-strain light)
- **Spotify (mobile):** interaction skeleton: now-playing bar, resume-where-you-paused, zero-instruction navigation
- **Netflix (mobile):** continue-watching card, cover-browse, finite shelves
- **Headspace:** need-state entry (mapped to Read / Listen / Repair / Pronounce / Class), calm premium without game mechanics
- **MasterClass:** expert authority, editorial restraint, adult-world imagery

## Anti-references

- **Duolingo:** avoid streaks, XP, hearts, leagues, countdowns, cutesy mascots. Borrow only the clarity of a single "continue" action. Its engagement mechanics are retention theater that would repel our persona.
- **Generic SaaS (blue/purple gradients, KPI cards, dense dashboards):** avoid default AI-generated taste. Earthy palette, one question per page.
- **Material Design:** avoid its token names and elevation/shadow language. We use tonal paper layering, not shadows.
- **Children's readers / cartoonish edtech:** avoid childish illustration, playful clutter, emoji icons. Graded ≠ childish.
- **Asana/Notion-style workspace density:** avoid multi-column student layouts, workspace metaphors.

## Product principles

- **Input before output.** The story reader is the center of gravity; every other feature orbits it and is reached after reading or by explicit learner choice.
- **Value before account.** A WhatsApp deep link must deliver a readable, tappable story before any login, permission, or payment ask. Declining never punishes (no blur, no lock, no nag).
- **Same reader, different overlay.** Classroom and (future) consumer students use identical components; context determines active features.
- **Reading is primary; never interrupt it.** Practice lives behind post-story transitions or explicit choices.
- **Invisible structure.** Spaced repetition, deficiency tracking, and progress exist, but present as private evidence and quiet context, never as scores, ranks, or obligations.
- **One honest continuation.** Home opens with the exact place to resume ("Continue reading: [story]"), never a demand to return.
- **Students keep their data.** After subscription ends, active-period materials remain accessible: a finished bookshelf, not a locked library.
- **Kyle's voice, Kyle's judgment.** Generated text sounds like Kyle; AI never overclaims (no official scores, CEFR verdicts, or diagnoses). Teacher-authored content is pasted verbatim, never "improved."

## Accessibility and domain requirements

- Mobile-first: 375px is the shipping floor; one layout that breathes on desktop (672px column), except the desktop-first teacher dashboard.
- WCAG AA: 4.5:1 body contrast, 44px touch targets, keyboard reachable, `prefers-reduced-motion` honored, never color-alone signaling.
- Spanish UI chrome, English learning content, both marked with correct `lang` attributes.
- IPA everywhere for pronunciation (Kyle's custom symbols are deprecated in-app); IPA must render in an IPA-capable font stack with accessible text alternatives.
- Slow connections are the norm: self-hosted fonts with `font-display: swap`, minimal weights, skeletons over 0.3s, no layout shift.
