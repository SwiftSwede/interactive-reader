-- Slice 97a: public /evaluacion placement quiz (ADR 017).
-- Guests have no auth.uid(), so these tables have RLS on and NO anon or
-- authenticated policies. Only the service role (via /api/evaluacion/*) touches them.
-- Content tables are seeded by scripts/seed-evaluacion.ts (content columns only).

CREATE TABLE IF NOT EXISTS public.eval_structures (
  id text PRIMARY KEY,
  track text NOT NULL CHECK (track IN ('beginner', 'pre_int', 'int', 'upper')),
  kind text NOT NULL CHECK (kind IN ('grammar', 'vocabulary')),
  display_name_es text NOT NULL CHECK (char_length(display_name_es) BETWEEN 1 AND 120),
  egp_ref text,
  egp_level text NOT NULL CHECK (egp_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  l1_focus boolean NOT NULL DEFAULT false,
  class_type text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track, position)
);

CREATE TABLE IF NOT EXISTS public.eval_items (
  id text PRIMARY KEY,
  structure_id text NOT NULL REFERENCES public.eval_structures(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('placement', 'confirmation', 'rotation')),
  format text NOT NULL CHECK (format IN ('translation', 'fill_blank', 'mc')),
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 400),
  options jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4),
  correct_option_id text NOT NULL,
  rule_text text NOT NULL CHECK (char_length(rule_text) BETWEEN 1 AND 400),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_items_structure ON public.eval_items (structure_id, role);

CREATE TABLE IF NOT EXISTS public.eval_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  ip_hash text,
  email text CHECK (email IS NULL OR char_length(email) <= 200),
  email_captured_at timestamptz,
  opener text NOT NULL CHECK (opener IN ('no_se_nada', 'principiante', 'armo_oraciones', 'converso', 'pulir')),
  seed integer NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'finished', 'redirected')),
  journey jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcome text CHECK (outcome IS NULL OR outcome IN ('settled', 'top', 'gentle', 'redirected')),
  placed_track text CHECK (placed_track IS NULL OR placed_track IN ('beginner', 'pre_int', 'int', 'upper')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_eval_attempts_token ON public.eval_attempts (token_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_attempts_email ON public.eval_attempts (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eval_attempts_ip ON public.eval_attempts (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.eval_answers (
  attempt_id uuid NOT NULL REFERENCES public.eval_attempts(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.eval_items(id) ON DELETE RESTRICT,
  pass_index integer NOT NULL CHECK (pass_index >= 0),
  selected_option_id text NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.eval_error_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.eval_attempts(id) ON DELETE CASCADE,
  structure_id text NOT NULL REFERENCES public.eval_structures(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('candidate', 'confirmed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, structure_id)
);

COMMENT ON TABLE public.eval_attempts IS
  'Guest evaluation attempts keyed by sha256 of the pk_eval cookie. Service role only (ADR 017).';
COMMENT ON TABLE public.eval_error_tags IS
  'Per-attempt structure weaknesses. App-internal; never sent to MailerLite.';

ALTER TABLE public.eval_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_error_tags ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.eval_structures FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.eval_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.eval_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.eval_answers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.eval_error_tags FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.eval_structures TO service_role;
GRANT ALL ON TABLE public.eval_items TO service_role;
GRANT ALL ON TABLE public.eval_attempts TO service_role;
GRANT ALL ON TABLE public.eval_answers TO service_role;
GRANT ALL ON TABLE public.eval_error_tags TO service_role;
