# ADR 016: Multi-Course Commerce and Self-Paced Course Structure

## Context

Decided 2026-10-09 in brainstorm with Kyle, ratified across a multi-turn design discussion. The app currently serves ONE product: monthly group classes (Sistema de 8) gated by `subscription_periods`. Kyle is launching self-paced, self-learning courses (Inglés por los oídos, English for Latinos 1, English for Latinos 2 — one Beginner path) and level libraries ($47 per level, purchased once). This ADR records the data model and access rules before any spec work.

## Decision

- **One `courses` table with a `format` column ('group' | 'self_paced').** Kyle initially preferred a separate table but accepted the single table on the condition that self-paced courses are treated as genuinely different (different visuals, different steps, own step engine — NEVER reuse session-driven group UI). `courses_level_check` gains 'beginner'. Group-only columns (zoom_url, session machinery) stay NULL for self-paced.
- **Beginner lessons are `stories` rows (storage) but are named LESSONS everywhere user-visible.** The physical `stories` table stays (dozens of FKs); the table is the lesson catalog. A beginner lesson is not a story; students never see the word "story" for beginner content. New `kind` values are added to `stories_kind_check` as discovered, never new tables.
- **Commerce = `products` + `product_items` + `purchases`.** A product bundles one or more items: a course (self-paced) OR a level library entitlement. One-time purchase = PERMANENT access (no period window). `subscription_periods` remains untouched for group classes.
- **Libraries are per level, $47 each, and each one grants only its own level.** Intermediate does not include pre-intermediate. Pre-intermediate does not include beginner. Pronunciation includes pronunciation only (sound guide videos + minimal pairs; content assigned as it exists). This replaced an earlier cumulative-downward idea on 2026-10-10, before Slice 87 shipped. The beginner library is still the home for the three beginner courses, but unlock stays inside one course. Finishing course 1 does not gate course 2.
- **Group classes and libraries are fully separate products.** Group enrollment does NOT include any library; a library purchase does NOT include group classes. Bundles are just products with multiple items.
- **Beginner path is strictly linear** (finish lesson N to unlock N+1). Duolingo-style pass-a-check-to-skip is a possible later upgrade, not v1.
- **Self-paced Inicio card = ONE card:** course name, progress meter (7/40), single Continuar button to the next incomplete lesson (via `user_progress`). No lesson list on Inicio; the course page IS the list. Spotify resume pattern.
- **Inicio visual redesign is a separate design workstream** (DoorDash/Shop desktop, Math Academy choose-your-own-adventure mobile). This slice only adds the data (multi-course cards, progress, continue pointers), minimal visual change.
- **Pre-int/int browsing is choose-your-own-path** (Netflix/DoorDash style with recommendations), NOT a fixed path. Only beginners follow a line.
- **Beginner audio decisions (Iplo):** recordings EXIST (23 lessons, Kyle + native female voice; ElevenLabs re-record possible later). Delivery = interactive per-line playback (play prompt → pause → native model), recorded/structured per line so continuous driving mode can be assembled from the same files later. Enhancement over faithfulness: on-screen Spanish prompt text, repeat button, and mark-wrong tracking are IN.

## Consequences

- Tracking needs zero model changes: evidence, flags, missions, and drills key to the STUDENT. Beginner error evidence lands in the same Ficha/Analíticas machinery. Beginners are the fuel for the tier-2 loop and the ≥3-student sound-bank gate.
- Stripe Checkout wiring is a SEPARATE later slice; this slice is schema + access helpers + teacher admin + dashboard data.
- The self-paced step engine (per-lesson step sequences, Math Academy style) is its own future architecture slice, blocked until E4L1/E4L2 PDFs are handed over and the Iplo voice question is settled.
- E4L1/E4L2 lesson content maps to the existing reader (words table already stores spanish_translation + phonetic_transcription — the three-layer system).
