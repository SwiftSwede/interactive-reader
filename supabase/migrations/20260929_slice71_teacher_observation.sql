-- Slice 71: error tag catalog + teacher_observation evidence source.
-- Machines still set sticky needs_more_practice. Only this source may overwrite it.
-- No foreign keys. No teacher write policy on user_topic_evidence (service role writes).

CREATE TABLE IF NOT EXISTS public.error_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read error tags" ON public.error_tags;
CREATE POLICY "Anyone can read error tags"
  ON public.error_tags
  FOR SELECT
  USING (true);

GRANT ALL ON TABLE public.error_tags TO anon;
GRANT ALL ON TABLE public.error_tags TO authenticated;
GRANT ALL ON TABLE public.error_tags TO service_role;

-- Existing rows must already satisfy the wider checks before we swap them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_topic_evidence
    WHERE source_type NOT IN (
      'reading',
      'word_lookup',
      'comprehension',
      'personal_response',
      'dictation',
      'pronunciation',
      'writing',
      'exam',
      'teacher_observation'
    )
    OR tag_type NOT IN ('grammar', 'vocabulary', 'phonetic', 'error')
  ) THEN
    RAISE EXCEPTION 'user_topic_evidence rows fall outside the slice 71 checks';
  END IF;
END $$;

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
        'teacher_observation'::text
      ]
    )
  );

ALTER TABLE public.user_topic_evidence
  DROP CONSTRAINT IF EXISTS user_topic_evidence_tag_type_check;

ALTER TABLE public.user_topic_evidence
  ADD CONSTRAINT user_topic_evidence_tag_type_check
  CHECK (
    tag_type = ANY (
      ARRAY[
        'grammar'::text,
        'vocabulary'::text,
        'phonetic'::text,
        'error'::text
      ]
    )
  );
