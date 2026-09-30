-- Distinguishes intro-complete (flag stays; picker skips the tag) from
-- teacher_clear. Students already UPDATE their own mission rows.

ALTER TABLE public.student_missions
  ADD COLUMN IF NOT EXISTS graduation_reason text
    CHECK (
      graduation_reason IS NULL
      OR graduation_reason IN ('teacher_clear', 'intro_complete')
    );

COMMENT ON COLUMN public.student_missions.graduation_reason IS
  'Why the row left active. intro_complete keeps the topic flag; teacher_clear follows a teacher observation clear.';
