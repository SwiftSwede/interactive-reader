-- Interactive Reader App — Phase 2b Database Schema
-- Run this in the Supabase SQL Editor AFTER schema-phase2a.sql
-- WordLookup from PRD Section 4. First tap per word per student.

CREATE TABLE IF NOT EXISTS public.word_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  looked_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_word_lookups_user_id
  ON public.word_lookups(user_id);
CREATE INDEX IF NOT EXISTS idx_word_lookups_story_id
  ON public.word_lookups(story_id);
CREATE INDEX IF NOT EXISTS idx_word_lookups_session_id
  ON public.word_lookups(course_session_id);

ALTER TABLE public.word_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own word lookups"
  ON public.word_lookups FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_teacher()
  );

CREATE POLICY "Students can read own word lookups"
  ON public.word_lookups FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can read lookups on own courses"
  ON public.word_lookups FOR SELECT
  USING (
    public.is_teacher()
    AND (
      (
        course_session_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.course_sessions cs
          WHERE cs.id = course_session_id
            AND public.teacher_owns_course(cs.course_id)
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.course_enrollments ce
        JOIN public.courses c ON c.id = ce.course_id
        WHERE ce.student_id = word_lookups.user_id
          AND c.teacher_id = auth.uid()
      )
    )
  );

GRANT SELECT, INSERT ON public.word_lookups TO authenticated;
