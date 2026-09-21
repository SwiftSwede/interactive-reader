-- Slice 64: Movie Talk class full build.
-- Do NOT touch course_sessions_session_type_check or course_sessions_activity_check:
-- 'movie_talk' is already a valid value in BOTH (Slice 62).
-- Do NOT touch stories_kind_check: 'movie_talk' is already a valid Story.kind.

-- 1. Story fields
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS warmup_question TEXT;

-- 2. Scene table: clip data + question ranges (transcript lives in stories.body_text,
--    scenes separated by *** lines — the format the reader already renders)
CREATE TABLE IF NOT EXISTS public.movie_talk_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  scene_number integer NOT NULL,
  youtube_url text,
  start_seconds integer,
  end_seconds integer,
  question_start_position integer,
  question_end_position integer,
  UNIQUE (story_id, scene_number)
);
CREATE INDEX IF NOT EXISTS idx_movie_talk_scenes_story ON public.movie_talk_scenes(story_id);

ALTER TABLE public.movie_talk_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage movie talk scenes" ON public.movie_talk_scenes;
CREATE POLICY "Teachers can manage movie talk scenes"
  ON public.movie_talk_scenes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

DROP POLICY IF EXISTS "Enrolled students can read movie talk scenes"
  ON public.movie_talk_scenes;
CREATE POLICY "Enrolled students can read movie talk scenes"
  ON public.movie_talk_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.story_id = movie_talk_scenes.story_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_talk_scenes TO authenticated;

-- 3. Teacher's live class answers (pattern: song_class_answers, Slice 63)
ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS movie_talk_class_answers JSONB NOT NULL DEFAULT '{}';

-- 4. Word-flag notes (amends ADR 009's mark-only v1 — see ADR 014)
ALTER TABLE public.word_flags ADD COLUMN IF NOT EXISTS note TEXT;

DROP POLICY IF EXISTS "Enrolled students can read word flags" ON public.word_flags;
CREATE POLICY "Enrolled students can read word flags"
  ON public.word_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sessions cs
      WHERE cs.story_id = word_flags.story_id
        AND public.is_enrolled_in_course(cs.course_id)
    )
  );
