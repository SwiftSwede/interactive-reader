# ADR 017: Guest Evaluation Attempts (cookie token, service-role-only tables)

## Context

Slice 97 moves Kyle's English evaluation off WordPress to `learn.profekyle.com/evaluacion`. It must work with no login (ad traffic, cold visitors), capture email only after the result, and remember which items a person already saw so a retake a year later does not just replay last year's answer key. Every other student table in the app keys on `auth.uid()` under RLS (ADR 004). A guest has no `auth.uid()`, so those policies cannot apply.

## Decision

- **Identity is a random httpOnly cookie (`pk_eval`, 32 random bytes, two years).** The database stores only its sha256 (`eval_attempts.token_hash`). The same token drives resume-on-reload and retake exclusion, so a second attempt on the same device is excluded from repeats even before an email exists. After email capture, exclusion also merges every attempt with that email.
- **The five `eval_*` tables have RLS enabled and no policies for `anon` or `authenticated`.** Grants are revoked from both roles. Only the service role reads or writes them, through thin `/api/evaluacion/*` route handlers that resolve the attempt from the cookie. The browser never queries Supabase for evaluation data.
- **The answer key never reaches the client before the quiz ends.** Question payloads carry prompt and shuffled option ids only. `correct_option_id` and `rule_text` appear only in the review payload of a finished attempt.
- **Attempt creation is rate-limited per IP** by counting recent `eval_attempts.ip_hash` rows. No new RPC.
- **No Supabase auth user is created for a guest.** Email lives on the attempt. Linking an evaluation to a real account is a later decision.

## Consequences

- No RLS policy can leak another guest's attempt, because no policy exists. The cost is that every access path must go through the routes, which is already the house rule for API work.
- Losing the cookie (new device, cleared storage) loses resume and exclusion until the email matches. Accepted for v1.
- Error tags from the evaluation are per attempt (`eval_error_tags`), not per user. Folding them into the app's per-student error system (`user_topic_evidence`) waits for account linking.
- MailerLite receives only the placed level and funnel state, never structure-level data.
