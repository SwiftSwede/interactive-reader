-- Classroom YouTube lock: teacher-driven playback on course_sessions.
-- Students SELECT these columns; only the teacher UPDATE policy can write them.

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS video_playing BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS video_seconds REAL NOT NULL DEFAULT 0;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS video_rate REAL NOT NULL DEFAULT 1;

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS video_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.course_sessions.video_playing IS
  'Classroom YouTube: teacher is playing. Students follow during the 90-min window.';

COMMENT ON COLUMN public.course_sessions.video_seconds IS
  'Classroom YouTube: teacher playhead in seconds. Late joiners read this row.';
