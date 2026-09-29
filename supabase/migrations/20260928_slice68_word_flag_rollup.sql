-- Slice 69 (prompt file slice-68): keep the per-student "No entendí" signal
-- when word_flag_requests rows are deleted. Requests stay session-scoped.
-- The rollup is the durable count. learning_events is the append-only diary.
-- No backfill. No other event types in this slice.

CREATE TABLE IF NOT EXISTS public.word_flag_request_rollup (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  flag_text text NOT NULL,
  occurrence_index integer NOT NULL,
  times_requested integer NOT NULL DEFAULT 1,
  last_requested_at timestamptz NOT NULL,
  first_requested_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, story_id, flag_text, occurrence_index)
);

CREATE TABLE IF NOT EXISTS public.learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  course_session_id uuid NULL REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_type_time
  ON public.learning_events (user_id, event_type, occurred_at);

COMMENT ON TABLE public.word_flag_request_rollup IS
  'Durable per-student count of No entendí requests. Written only by the delete trigger on word_flag_requests. Students have no policy.';

COMMENT ON TABLE public.learning_events IS
  'Append-only learning diary. This slice writes event_type word_flag_request only. Students have no policy.';

CREATE OR REPLACE FUNCTION public.rollup_word_flag_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- User delete cascades the request. The rollup and the event would
  -- cascade away too, and a new row pointing at a user already in that
  -- delete can abort the delete. Skip the write.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
    RETURN OLD;
  END IF;

  BEGIN
    IF EXISTS (SELECT 1 FROM public.stories WHERE id = OLD.story_id) THEN
      INSERT INTO public.word_flag_request_rollup (
        user_id,
        story_id,
        flag_text,
        occurrence_index,
        times_requested,
        last_requested_at,
        first_requested_at
      ) VALUES (
        OLD.user_id,
        OLD.story_id,
        OLD.flag_text,
        OLD.occurrence_index,
        1,
        OLD.created_at,
        OLD.created_at
      )
      ON CONFLICT (user_id, story_id, flag_text, occurrence_index)
      DO UPDATE SET
        times_requested = word_flag_request_rollup.times_requested + 1,
        last_requested_at = GREATEST(
          word_flag_request_rollup.last_requested_at,
          EXCLUDED.last_requested_at
        ),
        first_requested_at = LEAST(
          word_flag_request_rollup.first_requested_at,
          EXCLUDED.first_requested_at
        );
    END IF;
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  session_id := NULL;
  IF EXISTS (
    SELECT 1 FROM public.course_sessions WHERE id = OLD.course_session_id
  ) THEN
    session_id := OLD.course_session_id;
  END IF;

  BEGIN
    INSERT INTO public.learning_events (
      user_id,
      event_type,
      occurred_at,
      course_session_id,
      detail
    ) VALUES (
      OLD.user_id,
      'word_flag_request',
      OLD.created_at,
      session_id,
      jsonb_build_object(
        'story_id', OLD.story_id,
        'flag_text', OLD.flag_text,
        'occurrence_index', OLD.occurrence_index
      )
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      BEGIN
        INSERT INTO public.learning_events (
          user_id,
          event_type,
          occurred_at,
          course_session_id,
          detail
        ) VALUES (
          OLD.user_id,
          'word_flag_request',
          OLD.created_at,
          NULL,
          jsonb_build_object(
            'story_id', OLD.story_id,
            'flag_text', OLD.flag_text,
            'occurrence_index', OLD.occurrence_index
          )
        );
      EXCEPTION
        WHEN foreign_key_violation THEN
          NULL;
      END;
  END;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_word_flag_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollup_word_flag_request() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_word_flag_requests_rollup ON public.word_flag_requests;
CREATE TRIGGER trg_word_flag_requests_rollup
  BEFORE DELETE ON public.word_flag_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.rollup_word_flag_request();

ALTER TABLE public.word_flag_request_rollup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.word_flag_request_rollup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.learning_events FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.word_flag_request_rollup TO authenticated;
GRANT SELECT ON TABLE public.learning_events TO authenticated;
GRANT ALL ON TABLE public.word_flag_request_rollup TO service_role;
GRANT ALL ON TABLE public.learning_events TO service_role;

DROP POLICY IF EXISTS "Teachers can read flag request rollup for own students"
  ON public.word_flag_request_rollup;
CREATE POLICY "Teachers can read flag request rollup for own students"
  ON public.word_flag_request_rollup
  FOR SELECT
  USING (public.teacher_owns_student(user_id));

DROP POLICY IF EXISTS "Teachers can read learning events for own students"
  ON public.learning_events;
CREATE POLICY "Teachers can read learning events for own students"
  ON public.learning_events
  FOR SELECT
  USING (public.teacher_owns_student(user_id));
