-- Slice 60: flex session type, empty dialogue/movie_talk/song, courses.theme
-- Constraint names verified against live DB (pg_constraint) 2026-09-22:
-- course_sessions_session_type_check, course_sessions_activity_check

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS theme text;

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
    'song',
    'flex'
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
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'movie_talk'
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'song'
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'flex'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
      AND conversation_prompt_id IS NULL
    )
  );
