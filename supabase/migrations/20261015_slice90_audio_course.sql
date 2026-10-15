-- Slice 90: audio-course lessons (Inglés por los Oídos).
-- Self-paced only. Do not add audio_course to session_type.
-- Merge danger: one-way. stories_kind_check and the evidence source check.

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_kind_check;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_kind_check
  CHECK (
    kind = ANY (
      ARRAY[
        'story'::text,
        'dialogue'::text,
        'movie_talk'::text,
        'song'::text,
        'video_summary'::text,
        'audio_course'::text
      ]
    )
  );

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audio_script jsonb;

COMMENT ON COLUMN public.stories.audio_script IS
  'Slice 90 audio-course script: audioUrl, grammarTagId, durationSeconds, segments. Null for every other kind.';

ALTER TABLE public.user_topic_evidence
  DROP CONSTRAINT IF EXISTS user_topic_evidence_source_type_check;

ALTER TABLE public.user_topic_evidence
  ADD CONSTRAINT user_topic_evidence_source_type_check
  CHECK (
    source_type = ANY (
      ARRAY[
        'reading'::text,
        'word_lookup'::text,
        'comprehension'::text,
        'personal_response'::text,
        'dictation'::text,
        'pronunciation'::text,
        'writing'::text,
        'exam'::text,
        'teacher_observation'::text,
        'iplo_course'::text
      ]
    )
  );
