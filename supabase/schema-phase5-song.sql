-- Phase 5 music: songs reuse the Story reader with kind = song.
-- Thin extras: YouTube URL + fill-in blanks. ContentTag.content_type stays story.

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_kind_check;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_kind_check
  CHECK (kind IN ('story', 'dialogue', 'movie_talk', 'song'));

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS lyric_blanks JSONB NOT NULL DEFAULT '[]'::jsonb;
