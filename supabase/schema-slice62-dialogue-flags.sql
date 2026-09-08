-- Slice 62: Dialogue / Movie Talk / song session types + word flags (ADR 009).
-- Do NOT touch stories_kind_check. dialogue is already a valid Story.kind.
-- Activity matrix: copy the seven Slice 61 branches, then add three story-backed
-- types. Source of truth for the seven: supabase/migrations/20260908060000_slice_61_conversation.sql

-- 1. word_flags: teacher's persistent per-content marks (ADR 009)
CREATE TABLE IF NOT EXISTS public.word_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN ('underline', 'bold')),
  flag_text text NOT NULL,
  occurrence_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, flag_text, occurrence_index, flag_type)
);
CREATE INDEX IF NOT EXISTS idx_word_flags_story ON public.word_flags(story_id);

-- 2. word_flag_requests: student "No entendí" signals, session-scoped
CREATE TABLE IF NOT EXISTS public.word_flag_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  course_session_id uuid NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_text text NOT NULL,
  occurrence_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, user_id, flag_text, occurrence_index)
);
CREATE INDEX IF NOT EXISTS idx_wfr_session ON public.word_flag_requests(course_session_id);
CREATE INDEX IF NOT EXISTS idx_wfr_anchor
  ON public.word_flag_requests(course_session_id, flag_text, occurrence_index);

-- 3. BOTH session-type constraints gain dialogue, movie_talk, song
ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN (
    'story',
    'writing',
    'exam',
    'video_summary',
    'presentation',
    'conversation',
    'pronunciation',
    'dialogue',
    'movie_talk',
    'song'
  ));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_activity_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_activity_check
  CHECK (
    (
      session_type = 'story'
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'writing'
      AND story_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'exam'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'video_summary'
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'presentation'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'conversation'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'pronunciation'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'dialogue'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'movie_talk'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'song'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
  );

-- 4. Backfill Historia rows whose catalog kind is a new session type
UPDATE public.course_sessions cs
SET session_type = s.kind
FROM public.stories s
WHERE cs.story_id = s.id
  AND cs.session_type = 'story'
  AND s.kind IN ('dialogue', 'movie_talk', 'song');

-- 5. RLS
ALTER TABLE public.word_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wf_teacher_all" ON public.word_flags;
CREATE POLICY "wf_teacher_all" ON public.word_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin'))
);

ALTER TABLE public.word_flag_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wfr_student_insert_own" ON public.word_flag_requests;
CREATE POLICY "wfr_student_insert_own" ON public.word_flag_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "wfr_student_read_own" ON public.word_flag_requests;
CREATE POLICY "wfr_student_read_own" ON public.word_flag_requests
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "wfr_teacher_select" ON public.word_flag_requests;
CREATE POLICY "wfr_teacher_select" ON public.word_flag_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      JOIN public.courses c ON c.id = cs.course_id
      WHERE cs.id = word_flag_requests.course_session_id
        AND c.teacher_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "wfr_teacher_delete" ON public.word_flag_requests;
CREATE POLICY "wfr_teacher_delete" ON public.word_flag_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      JOIN public.courses c ON c.id = cs.course_id
      WHERE cs.id = word_flag_requests.course_session_id
        AND c.teacher_id = auth.uid()
    )
  );

-- 6. Realtime: requests only (teacher badge aggregation). Flags have no fan-out.
ALTER TABLE public.word_flag_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.word_flag_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_flag_requests TO authenticated;
