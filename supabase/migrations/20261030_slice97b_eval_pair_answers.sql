-- Slice 97b: minimal-pair listening answers for /evaluacion (ADR 017).
-- The pair bank is code (src/lib/evaluacion/pairs.ts); the drawn items live in
-- eval_attempts.journey (pass kind 'pairs'). Service role only, like the other eval_* tables.

CREATE TABLE IF NOT EXISTS public.eval_pair_answers (
  attempt_id uuid NOT NULL REFERENCES public.eval_attempts(id) ON DELETE CASCADE,
  item_id text NOT NULL CHECK (item_id ~ '^pair\.[A-Za-z]+\.[0-9]+$'),
  pair_id text NOT NULL,
  word_played text NOT NULL CHECK (char_length(word_played) BETWEEN 1 AND 40),
  selected_word text NOT NULL CHECK (char_length(selected_word) BETWEEN 1 AND 40),
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, item_id)
);

COMMENT ON TABLE public.eval_pair_answers IS
  'Minimal-pair listening answers (Slice 97b). Service role only (ADR 017).';

ALTER TABLE public.eval_pair_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.eval_pair_answers FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.eval_pair_answers TO service_role;
