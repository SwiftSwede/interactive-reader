-- Interactive Reader App — Phase 4b Database Schema (Slice 37: evidence)
-- Run this in the Supabase SQL Editor AFTER schema-phase4a.sql
--
-- Two jobs:
--   1. Persist the learning signals that were in-session only until now
--      (dictation, pronunciation, personal responses, reading progress).
--   2. Roll those signals up into user_topic_evidence, one row per student
--      per topic.
--
-- Anonymous free-story users stay in-session: every table here requires
-- auth.uid(). user_id is never accepted from a client; server actions derive it
-- from the session and RLS enforces it.

-- ── Reading progress ───────────────────────────────────────
-- "Reading completed" means the student submitted comprehension for the story
-- (classroom) or revealed/self-checked it (open). Finishing dictation or
-- pronunciation is not required.

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in-progress'
    CHECK (status IN ('not-started', 'in-progress', 'completed')),
  comprehension_score REAL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
  ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_story_id
  ON public.user_progress(story_id);

-- ── Dictation attempts ─────────────────────────────────────
-- There is no dictation prompt catalog: the sentence and audio already live on
-- pronunciation_drills, so an attempt points there.

CREATE TABLE IF NOT EXISTS public.dictation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  pronunciation_drill_id UUID
    REFERENCES public.pronunciation_drills(id) ON DELETE SET NULL,
  course_session_id UUID
    REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  response_text TEXT NOT NULL DEFAULT '',
  -- Share of reference words the learner typed. Practice guidance, not a grade.
  accuracy REAL CHECK (accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 1)),
  error_analysis JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dictation_attempts_user_id
  ON public.dictation_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_dictation_attempts_story_id
  ON public.dictation_attempts(story_id);

-- ── Pronunciation attempts ─────────────────────────────────
-- Azure output kept as practice guidance. No official score, no CEFR level,
-- no diagnosis. Only the summary is stored, never the audio.

CREATE TABLE IF NOT EXISTS public.pronunciation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  pronunciation_drill_id UUID
    REFERENCES public.pronunciation_drills(id) ON DELETE SET NULL,
  reference_text TEXT NOT NULL DEFAULT '',
  accuracy_score REAL,
  fluency_score REAL,
  completeness_score REAL,
  -- IPA symbols Azure scored low, used to target the next activity.
  weak_sounds TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_user_id
  ON public.pronunciation_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_attempts_story_id
  ON public.pronunciation_attempts(story_id);

-- ── Personal responses ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.personal_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_question_id UUID NOT NULL
    REFERENCES public.personal_questions(id) ON DELETE CASCADE,
  course_session_id UUID
    REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  response_text TEXT NOT NULL DEFAULT '',
  response_audio_url TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  feedback_json JSONB,
  revised_from_id UUID REFERENCES public.personal_responses(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_responses_user_id
  ON public.personal_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_responses_question_id
  ON public.personal_responses(personal_question_id);

-- ── Topic evidence (current state, not an event log) ───────

CREATE TABLE IF NOT EXISTS public.user_topic_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL
    CHECK (tag_type IN ('grammar', 'vocabulary', 'phonetic')),
  tag_id UUID NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('seen', 'practiced', 'needs_more_practice')),
  -- The activity that produced the signal, a different axis from
  -- content_tags.content_type. Passive exposure is 'reading'.
  source_type TEXT NOT NULL
    CHECK (source_type IN (
      'reading', 'word_lookup', 'comprehension', 'personal_response',
      'dictation', 'pronunciation', 'writing', 'exam'
    )),
  source_id UUID,
  evidence_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_type, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_evidence_user_id
  ON public.user_topic_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_evidence_status
  ON public.user_topic_evidence(user_id, status);

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_evidence ENABLE ROW LEVEL SECURITY;

-- Teachers see rows for students enrolled in a course they own. Same shape as
-- the word_lookups policy in schema-phase2b.sql.
CREATE OR REPLACE FUNCTION public.teacher_owns_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_teacher() AND EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.student_id = p_student_id
      AND c.teacher_id = auth.uid()
  );
$$;

-- user_progress
DROP POLICY IF EXISTS "Students can read own progress" ON public.user_progress;
CREATE POLICY "Students can read own progress"
  ON public.user_progress FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own progress" ON public.user_progress;
CREATE POLICY "Students can insert own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own progress" ON public.user_progress;
CREATE POLICY "Students can update own progress"
  ON public.user_progress FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read progress for own students" ON public.user_progress;
CREATE POLICY "Teachers can read progress for own students"
  ON public.user_progress FOR SELECT
  USING (public.teacher_owns_student(user_id));

-- dictation_attempts
DROP POLICY IF EXISTS "Students can read own dictation attempts" ON public.dictation_attempts;
CREATE POLICY "Students can read own dictation attempts"
  ON public.dictation_attempts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own dictation attempts" ON public.dictation_attempts;
CREATE POLICY "Students can insert own dictation attempts"
  ON public.dictation_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read dictation attempts for own students" ON public.dictation_attempts;
CREATE POLICY "Teachers can read dictation attempts for own students"
  ON public.dictation_attempts FOR SELECT
  USING (public.teacher_owns_student(user_id));

-- pronunciation_attempts
DROP POLICY IF EXISTS "Students can read own pronunciation attempts" ON public.pronunciation_attempts;
CREATE POLICY "Students can read own pronunciation attempts"
  ON public.pronunciation_attempts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own pronunciation attempts" ON public.pronunciation_attempts;
CREATE POLICY "Students can insert own pronunciation attempts"
  ON public.pronunciation_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read pronunciation attempts for own students" ON public.pronunciation_attempts;
CREATE POLICY "Teachers can read pronunciation attempts for own students"
  ON public.pronunciation_attempts FOR SELECT
  USING (public.teacher_owns_student(user_id));

-- personal_responses
DROP POLICY IF EXISTS "Students can read own personal responses" ON public.personal_responses;
CREATE POLICY "Students can read own personal responses"
  ON public.personal_responses FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own personal responses" ON public.personal_responses;
CREATE POLICY "Students can insert own personal responses"
  ON public.personal_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read personal responses for own students" ON public.personal_responses;
CREATE POLICY "Teachers can read personal responses for own students"
  ON public.personal_responses FOR SELECT
  USING (public.teacher_owns_student(user_id));

-- user_topic_evidence
DROP POLICY IF EXISTS "Students can read own topic evidence" ON public.user_topic_evidence;
CREATE POLICY "Students can read own topic evidence"
  ON public.user_topic_evidence FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own topic evidence" ON public.user_topic_evidence;
CREATE POLICY "Students can insert own topic evidence"
  ON public.user_topic_evidence FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own topic evidence" ON public.user_topic_evidence;
CREATE POLICY "Students can update own topic evidence"
  ON public.user_topic_evidence FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read topic evidence for own students" ON public.user_topic_evidence;
CREATE POLICY "Teachers can read topic evidence for own students"
  ON public.user_topic_evidence FOR SELECT
  USING (public.teacher_owns_student(user_id));

-- ── Grants ─────────────────────────────────────────────────
-- No DELETE for students: a learner cannot quietly erase a struggle signal.
-- Data deletion requests are handled by the admin path.

GRANT SELECT, INSERT, UPDATE ON public.user_progress TO authenticated;
GRANT SELECT, INSERT ON public.dictation_attempts TO authenticated;
GRANT SELECT, INSERT ON public.pronunciation_attempts TO authenticated;
GRANT SELECT, INSERT ON public.personal_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_topic_evidence TO authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_owns_student(uuid) TO authenticated;
