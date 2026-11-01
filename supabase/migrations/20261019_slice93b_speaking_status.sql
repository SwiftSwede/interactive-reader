-- Slice 93b: attempt status plus one reference clip per prompt.
-- Existing rows become done. New inserts default to processing.

ALTER TABLE public.speaking_attempts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'done',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS is_reference boolean;

ALTER TABLE public.speaking_attempts
  ALTER COLUMN status SET DEFAULT 'processing';

ALTER TABLE public.speaking_attempts
  DROP CONSTRAINT IF EXISTS speaking_attempts_status_check;

ALTER TABLE public.speaking_attempts
  ADD CONSTRAINT speaking_attempts_status_check
  CHECK (status IN ('processing', 'done', 'failed'));

COMMENT ON COLUMN public.speaking_attempts.is_reference IS
  'Teacher reference clip for this prompt. Latest marked row wins.';
