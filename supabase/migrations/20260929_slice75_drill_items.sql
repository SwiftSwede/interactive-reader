-- Slice 75: drill catalog + per-student spacing state. No UI.
-- drill_items is practice material (authenticated SELECT). Writes are
-- service-role only (seed script). drill_item_state mirrors student_missions:
-- students read/insert/update own rows; teachers read enrolled students.
-- Diary writes (drill_attempt, drill_item_graduated) stay on learning_events
-- via the service role.

CREATE TABLE IF NOT EXISTS public.drill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_type text NOT NULL CHECK (tag_type IN ('grammar', 'phonetic', 'error')),
  tag_id uuid NOT NULL,
  format text NOT NULL CHECK (format IN ('teach', 'cloze', 'translation', 'order')),
  level text NOT NULL CHECK (level IN ('pre_int', 'int')),
  content jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drill_items_tag_id_format_idx
  ON public.drill_items (tag_id, format);

COMMENT ON TABLE public.drill_items IS
  'Authored drill catalog (teach/cloze/translation/order). tag_id has no FK, same convention as student_missions. Seed-script writes; authenticated SELECT.';

ALTER TABLE public.drill_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.drill_items FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.drill_items TO authenticated;
GRANT ALL ON TABLE public.drill_items TO service_role;

DROP POLICY IF EXISTS "Authenticated can read drill items" ON public.drill_items;
CREATE POLICY "Authenticated can read drill items"
  ON public.drill_items
  FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.drill_item_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.drill_items(id) ON DELETE CASCADE,
  rounds integer NOT NULL DEFAULT 0,
  clean_recalls integer NOT NULL DEFAULT 0,
  mcq_used boolean NOT NULL DEFAULT false,
  last_practiced_at timestamptz,
  next_practice_at timestamptz,
  status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning', 'graduated')),
  graduated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS drill_item_state_user_due_idx
  ON public.drill_item_state (user_id, next_practice_at);

COMMENT ON TABLE public.drill_item_state IS
  'Per-student spacing and graduation for one drill item. Students read, insert, and update their own rows. Teachers read enrolled students. Diary writes stay on learning_events via the service role.';

ALTER TABLE public.drill_item_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.drill_item_state FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.drill_item_state TO authenticated;
GRANT ALL ON TABLE public.drill_item_state TO service_role;

DROP POLICY IF EXISTS "Students can read own drill state" ON public.drill_item_state;
CREATE POLICY "Students can read own drill state"
  ON public.drill_item_state
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own drill state" ON public.drill_item_state;
CREATE POLICY "Students can insert own drill state"
  ON public.drill_item_state
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own drill state" ON public.drill_item_state;
CREATE POLICY "Students can update own drill state"
  ON public.drill_item_state
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read drill state for own students"
  ON public.drill_item_state;
CREATE POLICY "Teachers can read drill state for own students"
  ON public.drill_item_state
  FOR SELECT
  USING (public.teacher_owns_student(user_id));
