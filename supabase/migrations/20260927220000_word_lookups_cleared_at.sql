-- P02: students can clear a looked-up underline without deleting the row
-- (teachers still see the lookup for reteaching).

ALTER TABLE public.word_lookups
  ADD COLUMN IF NOT EXISTS cleared_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_word_lookups_cleared_at
  ON public.word_lookups (user_id, story_id)
  WHERE cleared_at IS NULL;

DROP POLICY IF EXISTS "Students can update own word lookups" ON public.word_lookups;

CREATE POLICY "Students can update own word lookups"
  ON public.word_lookups
  FOR UPDATE
  USING (("user_id" = "auth"."uid"()) AND (NOT "public"."is_teacher"()))
  WITH CHECK (("user_id" = "auth"."uid"()) AND (NOT "public"."is_teacher"()));
