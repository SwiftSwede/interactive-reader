# Fix 4 of 5 — Audit: make .cursorrules rule 1 match the repo

**Source:** Milestone code audit 2026-09-19, finding HIGH-4. (This file edits `.cursorrules`, which the audit confirmed is currently false about the repo.)

## Problem
`.cursorrules` "Service Layer Architecture" says business logic lives in `src/lib/services/` only — but only ONE file (`songAttempts.ts`) lives there; 40+ business-logic files sit flat in `src/lib/` (one per domain, each with a co-located `.test.ts`). The rule and the repo disagree. A contributor (or agent) reading the rule looks in the wrong place.

## Requirements
1. Chosen resolution: FIX THE RULE, not the file layout (moving 40 files is churn with no functional gain — the audit's architecture verdict called the boundary itself healthy).
2. Rewrite the Service Layer Architecture section of `.cursorrules` to describe reality:
   - Business logic lives in `src/lib/` — one file per domain (e.g. `dashboard.ts`, `music.ts`, `sessions.ts`), each with a co-located `.test.ts`.
   - `src/lib/services/` is reserved for genuinely reusable cross-domain services (currently `songAttempts.ts`) — new files there only when logic serves multiple domains.
   - API routes stay thin (validate → call service → return); components stay presentation-only (no `.from()` queries; auth/realtime client usage is the allowed exception).
3. Keep the edit minimal — do not restructure other `.cursorrules` sections in this task.

## Verify before commit
- The rewritten section no longer claims `src/lib/services/` is the home of all business logic.
- No other `.cursorrules` sections changed in the diff.
