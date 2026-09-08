-- Slice 61: Conversation class (4-4-4). Catalog prompts + session round clock.
-- Do NOT recreate course_sessions_session_type_check; it already includes conversation.

-- ── Conversation prompts (catalog content) ─────────────────

CREATE TABLE IF NOT EXISTS public.conversation_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT NOT NULL
    CHECK (level IN ('pre-intermediate', 'intermediate')),
  theme TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_prompts_created_by
  ON public.conversation_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_prompts_level
  ON public.conversation_prompts(level);

-- ── Session shell ──────────────────────────────────────────

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS conversation_prompt_id UUID
    REFERENCES public.conversation_prompts(id) ON DELETE SET NULL;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS round_current INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS round_state TEXT NOT NULL DEFAULT 'idle';

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS round_started_at TIMESTAMPTZ;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS conversation_plan TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_round_current_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_round_current_check
  CHECK (round_current BETWEEN 0 AND 7);

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_round_state_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_round_state_check
  CHECK (round_state IN ('idle', 'running', 'stopped'));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_conversation_plan_check;
ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_conversation_plan_check
  CHECK (conversation_plan IN ('standard', 'compact', 'open'));

-- Recreate activity CHECK only. Keep session_type_check untouched.
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
  );

CREATE INDEX IF NOT EXISTS idx_course_sessions_conversation_prompt_id
  ON public.course_sessions(conversation_prompt_id);

-- ── Realtime ───────────────────────────────────────────────

ALTER TABLE public.conversation_prompts REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_prompts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.conversation_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage conversation prompts"
  ON public.conversation_prompts;
CREATE POLICY "Teachers can manage conversation prompts"
  ON public.conversation_prompts FOR ALL
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Students can read assigned conversation prompts"
  ON public.conversation_prompts;
CREATE POLICY "Students can read assigned conversation prompts"
  ON public.conversation_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.conversation_prompt_id = conversation_prompts.id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_prompts TO authenticated;
