-- Classroom home group (teacher placement, not Stripe price).
-- Run this in the Supabase SQL Editor AFTER schema-phase2a.sql.
--
-- Stripe answers "are they paying?" classroom_level answers "which Zoom group?"
-- Teacher move always wins. New monthly courses enroll from this field.
-- Seed after applying:
--   npx tsx scripts/seed-classroom-level.ts

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS classroom_level TEXT
  CHECK (
    classroom_level IS NULL
    OR classroom_level IN ('pre-intermediate', 'intermediate')
  );

COMMENT ON COLUMN public.profiles.classroom_level IS
  'Teacher-assigned live group. Stripe price seeds this only when null.';
