-- Slice 59: teacher can mark attendance; first_opened_at nullable for
-- teacher-created rows (student never opened a lesson).

ALTER TABLE public.session_attendance
  ALTER COLUMN first_opened_at DROP NOT NULL;

COMMENT ON COLUMN public.session_attendance.first_opened_at IS
  'When the student first opened the session link. Null if the teacher marked attendance and the student never opened.';

COMMENT ON COLUMN public.session_attendance.attended IS
  'True if the student clicked the session link during the 90-min window, or if the teacher marked them present.';

DROP POLICY IF EXISTS "Teachers can insert attendance on own courses"
  ON public.session_attendance;
CREATE POLICY "Teachers can insert attendance on own courses"
  ON public.session_attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

DROP POLICY IF EXISTS "Teachers can update attendance on own courses"
  ON public.session_attendance;
CREATE POLICY "Teachers can update attendance on own courses"
  ON public.session_attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );
