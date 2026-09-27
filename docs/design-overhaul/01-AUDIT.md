# Step 1 — Audit Current App State (Cursor: do this first)

**Purpose:** map what EXISTS before recommending anything. Every recommendation in `03-RECOMMENDATIONS.md` must reference an audit finding. No recommendations in this document.

Read `docs/design-overhaul/00-BRIEF.md` first, plus `DESIGN.md`, `.cursorrules`, and `docs/adr/` (especially ADR 011 — classroom vs consumer split).

For each pattern below, record: **What exists** (file paths/components), **What it looks like** (design tokens, layout, interaction), **What's missing** vs the Manus report patterns in the brief, **Verdict** (solid / needs work / absent).

## A. Story reader (the center of gravity)

1. Reading layout: typography, line height, max width, paragraph spacing, mobile behavior at 375px
2. Tap-any-word: interaction (tap vs long-press), bottom sheet vs other, contents (audio, IPA, translation, mark), state model (unseen→looked up→marked→revisited?)
3. Sentence audio: sync mechanism, highlight style (quiet underline vs karaoke), per-sentence replay, speed control
4. Word audio: per-word MP3s, what the tooltip shows
5. Comprehension checks: where, how many, score display, AI answers, level handling
6. Translation reveal: how Spanish support appears, learner-controlled?
7. IPA display: where, tappable → Bunny Stream video popup, font/stack
8. Sticky audio player / now-playing pattern — exists? persists on scroll?

## B. Navigation & app shell

9. Bottom nav vs top nav on mobile: tabs, labels, icons
10. Home screen: what a returning student sees — continue card? class context? shelf? any streak/score language?
11. Deep-link entry: what a WhatsApp link opens to; signup gate placement; time-to-first-value
12. Story index/browse: card design, level/context tags, finite vs infinite feel

## C. Sistema de 8 surfaces

13. Story, Dialogue, Music, MovieTalk, VideoSummaryTranslation, Conversation (4-4-4), Writing, GroupExam — which lesson-type pages exist, how consistent, which are still display-only companions
14. Class mirror/live session: teacher-driven sync state, what student page mirrors
15. Exam page: individual answers, live type-check, timer behavior, numbers not letters

## D. Teacher side

16. Dashboard existence & scope: courses, roster, attendance, word-lookup aggregation, student detail
17. Any evidence/reteaching view (probably absent — Analíticas is specced, not built)

## E. Visual system

18. Current DESIGN.md tokens vs Manus proposed tokens (Paper Light terracotta/moss vs graphite/teal): list both, note the delta explicitly — this is a Kyle decision, present neutrally
19. Typography stack, spacing scale, radius, shadows
20. Loading skeletons, empty states, error states — exist? quality?
21. Accessibility current state: focus rings, tap target sizes, contrast, reduced motion, lang attributes

## F. Engagement/pressure audit (Lighthouse check)

22. Scan all student-facing screens for: streaks, XP, scores-as-primary, countdowns, "behind"/overdue language, due dates, red failure states, completion checks, leaderboards, anything childish. List EVERY hit with a file path. This is the repulsion list.

## Output format

One section per pattern group, table rows per pattern. Flag anything where current state and the brief's constraints conflict. End with a "Top 10 gaps" ranked list (gap → affected surface → severity for the Trapped Professional-Creative persona).
