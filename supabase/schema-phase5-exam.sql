-- Interactive Reader App — Phase 5 exam schema (slices 49a–49e)
-- Run AFTER schema-phase2c.sql and schema-phase4b.sql
-- Group exam: catalog prompt, groups with one writer, live answer sync.

-- ── Exam prompts (catalog content, table name matches ContentTag) ─

CREATE TABLE IF NOT EXISTS public.exam_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL
    CHECK (level IN ('pre-intermediate', 'intermediate')),
  theme TEXT,
  vocabulary_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  fill_in_translation JSONB NOT NULL DEFAULT '[]'::jsonb,
  task2_type TEXT NOT NULL
    CHECK (task2_type IN ('paragraph_restructuring', 'sentence_correction')),
  paragraph_restructuring JSONB,
  sentence_correction JSONB,
  translation_sentences JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_limit_minutes INTEGER NOT NULL DEFAULT 35
    CHECK (time_limit_minutes > 0 AND time_limit_minutes <= 90),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_prompts_created_by
  ON public.exam_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_exam_prompts_level
  ON public.exam_prompts(level);

-- ── Session shell: exam as a third activity type ───────────

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS exam_prompt_id UUID
    REFERENCES public.exam_prompts(id) ON DELETE RESTRICT;

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN ('story', 'writing', 'exam'));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_activity_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_activity_check
  CHECK (
    (
      session_type = 'story'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
    )
    OR
    (
      session_type = 'writing'
      AND writing_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND exam_prompt_id IS NULL
    )
    OR
    (
      session_type = 'exam'
      AND exam_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_sessions_exam_prompt_id
  ON public.course_sessions(exam_prompt_id);

-- ── Exam groups ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_session_id UUID NOT NULL
    REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  group_label TEXT NOT NULL,
  writer_id UUID NOT NULL REFERENCES public.profiles(id),
  member_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(member_ids) BETWEEN 2 AND 3),
  CHECK (writer_id = ANY (member_ids)),
  UNIQUE (course_session_id, group_label)
);

CREATE INDEX IF NOT EXISTS idx_exam_groups_session_id
  ON public.exam_groups(course_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_groups_writer_id
  ON public.exam_groups(writer_id);

-- ── Group submissions (one row per group) ──────────────────

CREATE TABLE IF NOT EXISTS public.group_exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_prompt_id UUID NOT NULL REFERENCES public.exam_prompts(id),
  exam_group_id UUID NOT NULL UNIQUE
    REFERENCES public.exam_groups(id) ON DELETE CASCADE,
  course_session_id UUID NOT NULL
    REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  task1_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  task2_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  task3_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted')),
  review_revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_exam_submissions_session_id
  ON public.group_exam_submissions(course_session_id);
CREATE INDEX IF NOT EXISTS idx_group_exam_submissions_prompt_id
  ON public.group_exam_submissions(exam_prompt_id);

-- ── Helpers ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_exam_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_groups g
    WHERE g.id = p_group_id
      AND auth.uid() = ANY (g.member_ids)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_exam_group_writer(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_groups g
    WHERE g.id = p_group_id
      AND g.writer_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_exam_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_exam_group_writer(uuid) TO authenticated;

-- ── Realtime: writer answers broadcast to group members ────

ALTER TABLE public.group_exam_submissions REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_exam_submissions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.exam_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_exam_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage exam prompts"
  ON public.exam_prompts FOR ALL
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher() AND created_by = auth.uid());

CREATE POLICY "Students can read assigned exam prompts"
  ON public.exam_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.exam_prompt_id = exam_prompts.id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

CREATE POLICY "Teachers can manage exam groups on own courses"
  ON public.exam_groups FOR ALL
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

CREATE POLICY "Students can read own exam groups"
  ON public.exam_groups FOR SELECT
  USING (auth.uid() = ANY (member_ids));

CREATE POLICY "Teachers can read exam submissions on own courses"
  ON public.group_exam_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

CREATE POLICY "Teachers can update exam submissions on own courses"
  ON public.group_exam_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

CREATE POLICY "Students can read own group exam submissions"
  ON public.group_exam_submissions FOR SELECT
  USING (public.is_exam_group_member(exam_group_id));

CREATE POLICY "Writers can insert group exam submissions"
  ON public.group_exam_submissions FOR INSERT
  WITH CHECK (
    public.is_exam_group_writer(exam_group_id)
    AND NOT public.is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND cs.exam_prompt_id = group_exam_submissions.exam_prompt_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

CREATE POLICY "Writers can update in-progress group exam submissions"
  ON public.group_exam_submissions FOR UPDATE
  USING (
    public.is_exam_group_writer(exam_group_id)
    AND status = 'in_progress'
  )
  WITH CHECK (
    public.is_exam_group_writer(exam_group_id)
    AND status IN ('in_progress', 'submitted')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_exam_submissions TO authenticated;
