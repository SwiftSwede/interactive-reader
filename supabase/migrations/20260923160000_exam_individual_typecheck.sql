-- Group exam rebuild: individual answers, teacher type-check, session timer.

-- ── Catalog: makeup duration + task titles ─────────────────

ALTER TABLE public.exam_prompts
  ALTER COLUMN time_limit_minutes SET DEFAULT 45;

UPDATE public.exam_prompts
SET time_limit_minutes = 45
WHERE time_limit_minutes = 35;

ALTER TABLE public.exam_prompts
  ADD COLUMN IF NOT EXISTS task1_title text,
  ADD COLUMN IF NOT EXISTS task1_instructions text,
  ADD COLUMN IF NOT EXISTS task2_title text,
  ADD COLUMN IF NOT EXISTS task2_instructions text,
  ADD COLUMN IF NOT EXISTS task3_title text,
  ADD COLUMN IF NOT EXISTS task3_instructions text;

UPDATE public.exam_prompts
SET
  task1_title = COALESCE(task1_title, 'Fill in the translation'),
  task1_instructions = COALESCE(
    task1_instructions,
    'Using the list of vocabulary from the past month, correctly match.'
  ),
  task2_title = COALESCE(
    task2_title,
    CASE
      WHEN task2_type = 'sentence_correction' THEN 'Correct'
      ELSE 'Order'
    END
  ),
  task2_instructions = COALESCE(
    task2_instructions,
    CASE
      WHEN task2_type = 'sentence_correction'
        THEN '7 of the following sentences have an error, 3 don''t. Find and correct the incorrect sentences.'
      ELSE 'Order the following sentences numerically starting with 1.'
    END
  ),
  task3_title = COALESCE(task3_title, 'Translate'),
  task3_instructions = COALESCE(
    task3_instructions,
    'Translate from Spanish to English.'
  );

-- Convert stored A-H correct_position values to 1-based numbers.
UPDATE public.exam_prompts
SET paragraph_restructuring = (
  SELECT jsonb_agg(
    jsonb_set(
      item,
      '{correctPosition}',
      to_jsonb(
        CASE upper(item->>'correctPosition')
          WHEN 'A' THEN '1'
          WHEN 'B' THEN '2'
          WHEN 'C' THEN '3'
          WHEN 'D' THEN '4'
          WHEN 'E' THEN '5'
          WHEN 'F' THEN '6'
          WHEN 'G' THEN '7'
          WHEN 'H' THEN '8'
          ELSE COALESCE(item->>'correctPosition', '')
        END
      )
    )
    ORDER BY COALESCE((item->>'number')::int, 0)
  )
  FROM jsonb_array_elements(paragraph_restructuring) AS item
)
WHERE task2_type = 'paragraph_restructuring'
  AND paragraph_restructuring IS NOT NULL
  AND jsonb_typeof(paragraph_restructuring) = 'array';

-- ── Groups: writer optional ────────────────────────────────

ALTER TABLE public.exam_groups
  ALTER COLUMN writer_id DROP NOT NULL;

ALTER TABLE public.exam_groups
  DROP CONSTRAINT IF EXISTS exam_groups_check;

-- ── Submissions: one row per student ───────────────────────

ALTER TABLE public.group_exam_submissions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS task1_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS task2_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS task3_submitted_at timestamptz;

ALTER TABLE public.group_exam_submissions
  DROP CONSTRAINT IF EXISTS group_exam_submissions_exam_group_id_key;

UPDATE public.group_exam_submissions AS s
SET user_id = g.writer_id
FROM public.exam_groups AS g
WHERE s.exam_group_id = g.id
  AND s.user_id IS NULL
  AND g.writer_id IS NOT NULL;

INSERT INTO public.group_exam_submissions (
  exam_prompt_id,
  exam_group_id,
  course_session_id,
  user_id,
  task1_answers,
  task2_answers,
  task3_answers,
  started_at,
  submitted_at,
  status,
  review_revealed_at
)
SELECT
  s.exam_prompt_id,
  s.exam_group_id,
  s.course_session_id,
  member_id,
  s.task1_answers,
  s.task2_answers,
  s.task3_answers,
  s.started_at,
  s.submitted_at,
  s.status,
  s.review_revealed_at
FROM public.group_exam_submissions AS s
JOIN public.exam_groups AS g ON g.id = s.exam_group_id
CROSS JOIN LATERAL unnest(g.member_ids) AS member_id
WHERE s.user_id IS NOT NULL
  AND member_id IS DISTINCT FROM s.user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.group_exam_submissions AS other
    WHERE other.course_session_id = s.course_session_id
      AND other.user_id = member_id
  );

DELETE FROM public.group_exam_submissions
WHERE user_id IS NULL;

ALTER TABLE public.group_exam_submissions
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.group_exam_submissions
  ALTER COLUMN exam_group_id DROP NOT NULL;

ALTER TABLE public.group_exam_submissions
  DROP CONSTRAINT IF EXISTS group_exam_submissions_session_user_key;

ALTER TABLE public.group_exam_submissions
  ADD CONSTRAINT group_exam_submissions_session_user_key
  UNIQUE (course_session_id, user_id);

CREATE INDEX IF NOT EXISTS idx_group_exam_submissions_user_id
  ON public.group_exam_submissions(user_id);

-- ── Session: teacher key, timer, score ─────────────────────

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS exam_class_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_timer_mode text NOT NULL DEFAULT 'until_end_offset',
  ADD COLUMN IF NOT EXISTS exam_timer_minutes integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS exam_score_published_at timestamptz;

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_exam_timer_mode_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_exam_timer_mode_check
  CHECK (exam_timer_mode IN ('until_end_offset', 'from_start'));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_exam_timer_minutes_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_exam_timer_minutes_check
  CHECK (exam_timer_minutes > 0 AND exam_timer_minutes <= 90);

COMMENT ON COLUMN public.course_sessions.exam_class_answers IS
  'Live teacher accepted answers + revealed flags for group exam items.';
COMMENT ON COLUMN public.course_sessions.exam_timer_mode IS
  'until_end_offset: countdown to session_end minus exam_timer_minutes. from_start: N minutes after Iniciar.';
COMMENT ON COLUMN public.course_sessions.exam_score_published_at IS
  'When the teacher published the live exam score.';

-- ── RLS: own-row student writes ────────────────────────────

DROP POLICY IF EXISTS "Students can read own group exam submissions"
  ON public.group_exam_submissions;
DROP POLICY IF EXISTS "Writers can insert group exam submissions"
  ON public.group_exam_submissions;
DROP POLICY IF EXISTS "Writers can update in-progress group exam submissions"
  ON public.group_exam_submissions;

CREATE POLICY "Students can read own exam submissions"
  ON public.group_exam_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can insert own exam submissions"
  ON public.group_exam_submissions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_teacher()
    AND EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND cs.exam_prompt_id = group_exam_submissions.exam_prompt_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

CREATE POLICY "Students can update own exam submissions"
  ON public.group_exam_submissions FOR UPDATE
  USING (user_id = auth.uid() AND NOT public.is_teacher())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_teacher());
