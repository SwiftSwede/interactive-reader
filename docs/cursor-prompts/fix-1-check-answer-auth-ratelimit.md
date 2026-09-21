# Fix 1 of 5 — Audit: add auth + rate limit to /api/check-answer

**Source:** Milestone code audit 2026-09-19, finding CRITICAL-1. Full log: `docs/` audit report / Hermes skill `milestone-code-audit` → `references/interactive-reader-findings.md`.

## Problem
`src/app/api/check-answer/route.ts` currently calls OpenRouter (GPT-4o-mini) with NO authentication and NO rate limiting. Anyone who discovers the URL can run our API bill up unauthenticated and unlimited. Sibling routes `src/app/api/assess/route.ts` (line ~136) and `src/app/api/choral-complete/route.ts` (line ~15) both call `supabase.auth.getUser()` — this route is the outlier. `.cursorrules` Security Standards already mandate auth on every API route and "max 10 requests per user per hour" for this specific endpoint.

## Requirements
1. Return 401 (friendly JSON error, Kyle's Spanish voice, e.g. "Necesitas iniciar sesión.") when there is no valid Supabase session. Derive the user ONLY from the session token — never from a request-body `user_id` (per `.cursorrules` rule: never accept `user_id` from the client).
2. Rate limit: max 10 requests per authenticated user per rolling hour. When exceeded, return 429 with the friendly message already specified in `.cursorrules`: "Has intentado muchas veces. Intenta de nuevo más tarde."
3. Choose the rate-limit mechanism that fits our stack (Vercel serverless = in-memory counters are NOT acceptable; they don't survive instances). A small Supabase table + service-role count/upsert on the server side is the expected fit. If you choose a different mechanism, state why in the PRD slice row.
4. New table (if used) needs RLS enabled per `.cursorrules` — students must never read/write each other's rate rows; server writes via service role only.
5. While in this file: confirm input validation still rejects non-string/oversized inputs (max 500 chars answer per `.cursorrules` input-limits rule) — tighten if not present.
6. Do NOT change the correction behavior, prompt, or response shape — auth + rate limit only.

## Verify before commit
- `npx tsc --noEmit` and `npm test` pass.
- Unauthenticated POST → 401. 11 rapid authenticated POSTs → 429 on the 11th.
- Update `.cursorrules` "Current Phase" only if we count this as a slice; otherwise record the deviation note in the commit message per truth-document sync rules.
