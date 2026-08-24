-- Interactive Reader App — Phase 2c Database Schema
-- Run this in the Supabase SQL Editor AFTER schema-phase2b.sql
-- Writing class: catalog prompts assigned to a live session.
-- Session shell stays shared. Activity FKs are typed (story | writing).

-- ── Writing prompts (catalog content, not owned by a Zoom meeting) ─

CREATE TABLE IF NOT EXISTS public.writing_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  prompt_text TEXT NOT NULL,
  writing_time_minutes INTEGER NOT NULL
    CHECK (writing_time_minutes IN (10, 20)),
  level TEXT NOT NULL
    CHECK (level IN ('pre-intermediate', 'intermediate')),
  structure_lesson TEXT,
  rubric_text TEXT,
  example_paragraph TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_writing_prompts_created_by
  ON public.writing_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_level
  ON public.writing_prompts(level);

-- ── Session shell: typed activity assignment ───────────────

ALTER TABLE public.course_sessions
  ALTER COLUMN story_id DROP NOT NULL;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'story';

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS writing_prompt_id UUID
    REFERENCES public.writing_prompts(id) ON DELETE RESTRICT;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN ('story', 'writing'));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_activity_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_activity_check
  CHECK (
    (
      session_type = 'story'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
    )
    OR
    (
      session_type = 'writing'
      AND writing_prompt_id IS NOT NULL
      AND story_id IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_sessions_writing_prompt_id
  ON public.course_sessions(writing_prompt_id);

UPDATE public.course_sessions
SET session_type = 'story'
WHERE session_type IS NULL OR session_type = '';

-- ── Writing submissions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.writing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writing_prompt_id UUID NOT NULL REFERENCES public.writing_prompts(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  submission_text TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  elapsed_seconds INTEGER,
  word_count INTEGER NOT NULL DEFAULT 0,
  wpm REAL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'corrected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_session_id)
);

CREATE INDEX IF NOT EXISTS idx_writing_submissions_session_id
  ON public.writing_submissions(course_session_id);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_prompt_id
  ON public.writing_submissions(writing_prompt_id);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_user_id
  ON public.writing_submissions(user_id);

-- ── Teacher corrections ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.writing_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writing_submission_id UUID NOT NULL UNIQUE
    REFERENCES public.writing_submissions(id) ON DELETE CASCADE,
  corrected_text TEXT NOT NULL,
  correction_diff JSONB NOT NULL DEFAULT '[]'::jsonb,
  inline_notes JSONB,
  good_vocabulary JSONB,
  corrected_by UUID NOT NULL REFERENCES public.profiles(id),
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_writing_corrections_submission_id
  ON public.writing_corrections(writing_submission_id);

-- ── Realtime: timer start broadcasts to connected students ─

ALTER TABLE public.course_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.course_sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage writing prompts"
  ON public.writing_prompts FOR ALL
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher() AND created_by = auth.uid());

CREATE POLICY "Students can read assigned writing prompts"
  ON public.writing_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.writing_prompt_id = writing_prompts.id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

CREATE POLICY "Teachers can read writing submissions on own courses"
  ON public.writing_submissions FOR SELECT
  USING (
    course_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

CREATE POLICY "Teachers can update writing submissions on own courses"
  ON public.writing_submissions FOR UPDATE
  USING (
    course_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

CREATE POLICY "Students can read own writing submissions"
  ON public.writing_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can insert own writing submissions"
  ON public.writing_submissions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_teacher()
    AND (
      course_session_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.course_sessions cs
        WHERE cs.id = course_session_id
          AND cs.writing_prompt_id = writing_submissions.writing_prompt_id
          AND public.is_enrolled_in_course(cs.course_id)
      )
    )
  );

CREATE POLICY "Students can update own draft writing submissions"
  ON public.writing_submissions FOR UPDATE
  USING (user_id = auth.uid() AND status = 'draft')
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('draft', 'submitted')
  );

CREATE POLICY "Teachers can manage corrections on own courses"
  ON public.writing_corrections FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.writing_submissions ws
      JOIN public.course_sessions cs ON cs.id = ws.course_session_id
      WHERE ws.id = writing_submission_id
        AND public.teacher_owns_course(cs.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.writing_submissions ws
      JOIN public.course_sessions cs ON cs.id = ws.course_session_id
      WHERE ws.id = writing_submission_id
        AND public.teacher_owns_course(cs.course_id)
    )
    AND corrected_by = auth.uid()
  );

CREATE POLICY "Students can read own writing corrections"
  ON public.writing_corrections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.writing_submissions ws
      WHERE ws.id = writing_submission_id
        AND ws.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.writing_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.writing_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.writing_corrections TO authenticated;
