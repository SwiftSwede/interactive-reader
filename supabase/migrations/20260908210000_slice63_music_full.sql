-- Slice 63: music class full build (teacher-paced steps + live worksheet).
-- Idempotent. Do NOT touch course_sessions_session_type_check or
-- course_sessions_activity_check: both already include 'song' (Slice 62).

-- Story extensions (songs only; all nullable, graceful degradation)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS artist_bio TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS song_meaning TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS lyrics_ipa JSONB;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS line_timestamps JSONB;

-- Teacher-paced steps (generalizable; implemented for songs)
ALTER TABLE public.course_sessions ADD COLUMN IF NOT EXISTS lesson_step_current TEXT;
ALTER TABLE public.course_sessions ADD COLUMN IF NOT EXISTS lesson_step_locked BOOLEAN NOT NULL DEFAULT false;

-- Bio annotation discriminator: bio words and body/lyric words never wipe each other
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'body';
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_source_check;
ALTER TABLE public.words ADD CONSTRAINT words_source_check CHECK (source IN ('body', 'bio'));

-- The live worksheet record
CREATE TABLE IF NOT EXISTS public.song_lyric_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_session_id uuid NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  blank_id integer NOT NULL,
  typed_text TEXT,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, user_id, blank_id)
);

CREATE INDEX IF NOT EXISTS idx_song_lyric_attempts_session_user
  ON public.song_lyric_attempts (course_session_id, user_id);

ALTER TABLE public.song_lyric_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own song lyric attempts"
  ON public.song_lyric_attempts;
CREATE POLICY "Students can read own song lyric attempts"
  ON public.song_lyric_attempts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read song lyric attempts on own courses"
  ON public.song_lyric_attempts;
CREATE POLICY "Teachers can read song lyric attempts on own courses"
  ON public.song_lyric_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

DROP POLICY IF EXISTS "Students can insert own song lyric attempts"
  ON public.song_lyric_attempts;
CREATE POLICY "Students can insert own song lyric attempts"
  ON public.song_lyric_attempts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

DROP POLICY IF EXISTS "Students can update own song lyric attempts"
  ON public.song_lyric_attempts;
CREATE POLICY "Students can update own song lyric attempts"
  ON public.song_lyric_attempts FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.song_lyric_attempts TO authenticated;
