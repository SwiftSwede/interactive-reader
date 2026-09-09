-- Live teacher answers for Completa la canción. Student submissions stay
-- in song_lyric_attempts. This JSON is session-scoped and Realtime-synced.

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS song_class_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.course_sessions.song_class_answers IS
  'Slice 63: live teacher answers for song blanks, keyed by blank id. Student attempts stay in song_lyric_attempts.';
