-- Slice 91: student question capture ("No sé cómo decir...").
-- Insert-only for students. Teachers read and stamp addressed_at via service role.
-- surface records the screen the ask came from. story_id and course_session_id
-- stay nullable (tab-bar asks have neither).

CREATE TABLE IF NOT EXISTS public.question_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  course_session_id uuid REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  surface text NOT NULL CHECK (
    surface IN (
      'inicio',
      'lecciones',
      'herramientas',
      'practica',
      'sonidos',
      'perfil',
      'leccion',
      'presentacion',
      'conversacion'
    )
  ),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  addressed_at timestamptz
);

COMMENT ON TABLE public.question_requests IS
  'Student help-request tickets. Not a translator. Students insert and read own rows. Teacher reads/writes go through the service role.';

ALTER TABLE public.question_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.question_requests FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.question_requests TO authenticated;
GRANT ALL ON TABLE public.question_requests TO service_role;

DROP POLICY IF EXISTS "student inserts own requests" ON public.question_requests;
CREATE POLICY "student inserts own requests"
  ON public.question_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "student reads own requests" ON public.question_requests;
CREATE POLICY "student reads own requests"
  ON public.question_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_question_requests_session
  ON public.question_requests (course_session_id)
  WHERE course_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_requests_student
  ON public.question_requests (student_id, created_at DESC);
