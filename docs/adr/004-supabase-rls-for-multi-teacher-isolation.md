# ADR 004: Supabase RLS for Multi-Teacher Data Isolation

## Context

The app may eventually be sold to other teachers. Each teacher must only see their own courses, students, and data. A teacher from School A cannot see students or data from School B. This isolation must be enforced at the database level, not just in the UI, because client-side checks can be bypassed.

Supabase provides Row Level Security (RLS) as a PostgreSQL feature. Policies can scope rows based on `auth.uid()` and foreign key relationships (course enrollment, teacher assignment).

## Decision

Enable RLS on every table. Enforce data isolation at the database level:
- Student tables: `WHERE user_id = auth.uid()`. Students see only their own data.
- Teacher tables: `WHERE teacher_id = auth.uid()` via course enrollment joins. Teachers see only their own courses and students.
- Service role key (secret) bypasses RLS and is used only in server-side API routes and scripts when cross-tenant queries are needed (e.g., Kyle as admin).

## Consequences

- Data isolation is enforced even if a client-side check is bypassed. A student with the anon key cannot read another student's data via direct API calls.
- Every new table must have RLS policies defined. Forgetting RLS on a new table is a security hole. The `.cursorrules` Security Standards section makes this explicit.
- The service role key is never exposed to the browser. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are client-safe.
- If the app is never sold to other teachers, the RLS policies still provide student-vs-teacher isolation, which is useful regardless.
