-- Slice 74: one active mission per student. Vocabulary is not a mission.
-- The partial unique index is the one-mission rule. No student policy on
-- learning_events: mission_started and mission_graduated are service-role writes.

CREATE TABLE IF NOT EXISTS public.student_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_type text NOT NULL CHECK (tag_type IN ('grammar', 'phonetic', 'error')),
  tag_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graduated')),
  started_at timestamptz NOT NULL DEFAULT now(),
  graduated_at timestamptz,
  dismissed_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_missions_one_active
  ON public.student_missions (user_id)
  WHERE status = 'active';

COMMENT ON TABLE public.student_missions IS
  'One active mission per student. tag_type excludes vocabulary. Students read, insert, and update their own rows. Teachers read enrolled students. Diary writes stay on learning_events via the service role.';

ALTER TABLE public.student_missions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_missions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.student_missions TO authenticated;
GRANT ALL ON TABLE public.student_missions TO service_role;

DROP POLICY IF EXISTS "Students can read own missions" ON public.student_missions;
CREATE POLICY "Students can read own missions"
  ON public.student_missions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own missions" ON public.student_missions;
CREATE POLICY "Students can insert own missions"
  ON public.student_missions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own missions" ON public.student_missions;
CREATE POLICY "Students can update own missions"
  ON public.student_missions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read missions for own students"
  ON public.student_missions;
CREATE POLICY "Teachers can read missions for own students"
  ON public.student_missions
  FOR SELECT
  USING (public.teacher_owns_student(user_id));
