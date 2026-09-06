-- Slice 57: student dashboard. Recording URL + live-only session types.
-- Placeholders (null content FKs) and conversation/pronunciation rows
-- are allowed. Constraint names verified against live Postgres 2026-09-06.

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS recording_youtube_url text;

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
    'pronunciation'
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
    )
    OR
    (
      session_type = 'writing'
      AND story_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'exam'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'video_summary'
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
      AND presentation_prompt_id IS NULL
    )
    OR
    (
      session_type = 'presentation'
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
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
    )
  );

COMMENT ON COLUMN public.course_sessions.recording_youtube_url IS
  'YouTube URL for the class recording. Shown on the lesson page after the window closes.';
