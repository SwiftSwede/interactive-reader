-- Live presentation answers: students may read the teacher's rows, and
-- Realtime can push Listo / text updates to phones in class.

ALTER TABLE public.presentation_responses REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Students can read teacher presentation answers"
  ON public.presentation_responses;
CREATE POLICY "Students can read teacher presentation answers"
  ON public.presentation_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      JOIN public.courses c ON c.id = cs.course_id
      WHERE cs.id = presentation_responses.course_session_id
        AND public.is_enrolled_in_course(cs.course_id)
        AND c.teacher_id = presentation_responses.user_id
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_responses;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
