# ADR 013: Atomic Supabase Quota for Check-Answer

## Context

Audit Fix 1 protects the paid OpenRouter endpoint `/api/check-answer`. Vercel instances cannot share an in-memory counter. Separate count and insert requests would let concurrent calls bypass the 10-per-user rolling-hour limit.

## Decision

Authenticate with the existing cookie-backed Supabase server client and `auth.getUser()` before processing input. Ignore client-supplied user IDs. Validate the request with Zod and reject answers longer than 500 characters without altering correction logic or prompts.

Store one `check_answer_rate_limits` row per `auth.users.id`, with up to ten request timestamps. A service-role-only, security-invoker Postgres function locks the row, removes timestamps at least one hour old, checks the quota, and reserves a slot atomically. Read database time after acquiring the lock. Enable RLS and revoke all anon/authenticated table and RPC privileges. Use the existing admin client only in the API route; pass it into the rate-limit service.

Invalid input consumes no quota. Valid requests reserve before OpenRouter, and upstream failures still consume quota. Fail closed if quota storage is unavailable. Store no question or answer content. State is bounded per user and cascades away on account deletion.

## Consequences

- Concurrent requests for the same user serialize; different users have independent quotas. Quotas persist across deployments and serverless instances.
- Apply `supabase/migrations/20260920000000_check_answer_rate_limits.sql` before route deployment. No live migration is applied by this commit.
- Tests: `npm test` includes route and service tests; `supabase/tests/check_answer_rate_limits.sql` exercises the actual function and permissions in a disposable database, with fixture changes rolled back. Use Node 22+ for the existing test command's quoted glob support.
- This is an audit fix, not a new feature slice; `.cursorrules` Current Phase is unchanged. `docs/PRD.md` is a tracked symlink to the local Obsidian PRD: its abuse-protection data model was updated in place, but Git tracks only the symlink. This ADR records the schema and behavior in the repository as well.
