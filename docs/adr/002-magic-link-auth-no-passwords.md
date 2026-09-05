# ADR 002: Magic Link Auth, No Passwords

## Context

The audience is Spanish-speaking Latin American learners who discover the app via WhatsApp and Instagram links. They are not technical users. Password creation, password management, and password recovery are friction points that drop conversion. Kyle's methodology emphasizes low friction: link-in, reading in 5 seconds.

Supabase Auth supports magic link (passwordless email login) out of the box. The flow is: enter email, receive email with a link, click, authenticated. No password to create, remember, or reset.

## Decision

Use Supabase magic link authentication exclusively. No passwords, no OAuth providers (Google/Facebook) unless explicitly requested later. Email is the identity.

## Consequences

- Login friction is minimal: email in, link click, done.
- No password storage, no password reset flows, no credential leak risk.
- Session link tokens (for Zoom enrollment) are separate from auth tokens. A session link enrolls a student into a course after they authenticate via magic link.
- Magic links are single-use and expire. Supabase handles this.
- Stripe webhook auto-creates user accounts from the payment email, so students who pay are pre-registered. When they later click a magic link, the account already exists.
- Downside: email deliverability matters. If the magic link email lands in spam, the user is locked out. Monitor this.
