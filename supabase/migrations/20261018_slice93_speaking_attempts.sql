-- Slice 93: speaking feedback prototype.
-- New table and private audio bucket. No changes to existing tables.
-- Students read their own rows. Inserts and cross-user reads use the service role.

CREATE TABLE IF NOT EXISTS public.speaking_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  audio_path text,
  duration_s numeric,
  azure_raw jsonb,
  aggregate jsonb,
  agent_outputs jsonb,
  final_feedback jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.speaking_attempts IS
  'Slice 93 prototype. One unscripted speaking recording and its feedback. Not a score.';

ALTER TABLE public.speaking_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.speaking_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.speaking_attempts TO authenticated;
GRANT ALL ON TABLE public.speaking_attempts TO service_role;

DROP POLICY IF EXISTS "student reads own speaking attempts" ON public.speaking_attempts;
CREATE POLICY "student reads own speaking attempts"
  ON public.speaking_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user_day
  ON public.speaking_attempts (user_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'speaking-attempts',
  'speaking-attempts',
  false,
  12582912,
  ARRAY['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;
