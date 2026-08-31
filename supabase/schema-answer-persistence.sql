-- One open-mode comprehension answer per student per question.
-- Postgres UNIQUE treats NULLs as distinct, so the existing
-- (user_id, question_id, session_id) unique key does not cover
-- course_session_id IS NULL.

CREATE UNIQUE INDEX IF NOT EXISTS idx_comprehension_responses_open
  ON public.comprehension_responses (user_id, comprehension_question_id)
  WHERE course_session_id IS NULL;
