-- Interactive Reader App — Phase 5 presentation schema (slice 56a)
-- Run AFTER schema-phase5-video-summary.sql
-- Intermediate Class 3 Format A: catalog prompt, session step sync, vocab notes.

-- ── Presentation prompts (catalog content) ─────────────────

CREATE TABLE IF NOT EXISTS public.presentation_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (level IN ('intermediate')),
  theme TEXT,
  warmup_question TEXT,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presentation_prompts_created_by
  ON public.presentation_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_presentation_prompts_level
  ON public.presentation_prompts(level);

-- ── Session shell ──────────────────────────────────────────

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS presentation_prompt_id UUID
    REFERENCES public.presentation_prompts(id) ON DELETE SET NULL;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS presentation_step TEXT;

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN (
    'story', 'writing', 'exam', 'video_summary', 'presentation'
  ));

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
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'writing'
      AND writing_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'exam'
      AND exam_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'video_summary'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'presentation'
      AND presentation_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_sessions_presentation_prompt_id
  ON public.course_sessions(presentation_prompt_id);

-- ── Student answers ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.presentation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_prompt_id UUID NOT NULL
    REFERENCES public.presentation_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  segment_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  response_text TEXT,
  revealed_answer BOOLEAN NOT NULL DEFAULT false,
  revealed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, user_id, segment_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_presentation_responses_session
  ON public.presentation_responses(course_session_id);
CREATE INDEX IF NOT EXISTS idx_presentation_responses_user
  ON public.presentation_responses(user_id);

-- ── Session-only example notes on vocab cards ──────────────

CREATE TABLE IF NOT EXISTS public.presentation_vocab_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_session_id UUID NOT NULL
    REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  segment_id INTEGER NOT NULL,
  vocab_english TEXT NOT NULL,
  note_text TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, segment_id, vocab_english)
);

CREATE INDEX IF NOT EXISTS idx_presentation_vocab_notes_session
  ON public.presentation_vocab_notes(course_session_id);

-- ── ContentTag content_type (no tags seeded in 56a) ────────

ALTER TABLE public.content_tags
  DROP CONSTRAINT IF EXISTS content_tags_content_type_check;

ALTER TABLE public.content_tags
  ADD CONSTRAINT content_tags_content_type_check
  CHECK (content_type IN (
    'story', 'writing_prompt', 'exam_prompt', 'presentation_prompt'
  ));

-- ── Realtime ───────────────────────────────────────────────

ALTER TABLE public.presentation_prompts REPLICA IDENTITY FULL;
ALTER TABLE public.presentation_responses REPLICA IDENTITY FULL;
ALTER TABLE public.presentation_vocab_notes REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_prompts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_vocab_notes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_responses;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.presentation_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_vocab_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage presentation prompts"
  ON public.presentation_prompts;
CREATE POLICY "Teachers can manage presentation prompts"
  ON public.presentation_prompts FOR ALL
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Students can read assigned presentation prompts"
  ON public.presentation_prompts;
CREATE POLICY "Students can read assigned presentation prompts"
  ON public.presentation_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.presentation_prompt_id = presentation_prompts.id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

DROP POLICY IF EXISTS "Students can manage own presentation responses"
  ON public.presentation_responses;
CREATE POLICY "Students can manage own presentation responses"
  ON public.presentation_responses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read presentation responses on own courses"
  ON public.presentation_responses;
CREATE POLICY "Teachers can read presentation responses on own courses"
  ON public.presentation_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

DROP POLICY IF EXISTS "Students can read teacher presentation answers"
  ON public.presentation_responses;
CREATE POLICY "Students can read teacher presentation answers"
  ON public.presentation_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      JOIN public.courses c ON c.id = cs.course_id
      WHERE cs.id = course_session_id
        AND public.is_enrolled_in_course(cs.course_id)
        AND c.teacher_id = presentation_responses.user_id
    )
  );

DROP POLICY IF EXISTS "Teachers can manage presentation vocab notes"
  ON public.presentation_vocab_notes;
CREATE POLICY "Teachers can manage presentation vocab notes"
  ON public.presentation_vocab_notes FOR ALL
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

DROP POLICY IF EXISTS "Students can read presentation vocab notes"
  ON public.presentation_vocab_notes;
CREATE POLICY "Students can read presentation vocab notes"
  ON public.presentation_vocab_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.presentation_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_vocab_notes TO authenticated;
