-- Slice 87: self-paced courses and one-time purchases.
-- Group classes stay on this courses table (format = 'group').
-- Purchases are permanent. There is no ended_at.
-- products, product_items, and course_lessons are read through the
-- service role (same as classroom-access). No client policies.
-- purchases: a student can read their own rows. Writes are service-role only
-- (manual grant now, Stripe webhook later).

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'group';

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_format_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_format_check
  CHECK (format IN ('group', 'self_paced'));

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_level_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_level_check
  CHECK (level IN ('pre-intermediate', 'intermediate', 'beginner'));

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.courses.format IS
  'group: monthly Zoom course. self_paced: ordered lessons, no sessions.';
COMMENT ON COLUMN public.courses.is_published IS
  'Self-paced visibility. Group courses ignore this and stay false.';

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  position integer NOT NULL,
  UNIQUE (course_id, story_id)
);

CREATE INDEX IF NOT EXISTS course_lessons_course_position_idx
  ON public.course_lessons (course_id, position);

COMMENT ON TABLE public.course_lessons IS
  'Ordered lessons for a self-paced course. story_id is storage. UI says lecciones. No unique on position: reordering swaps values, and the app renumbers.';

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.course_lessons FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.course_lessons TO service_role;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kind text NOT NULL,
  level text,
  price_cents integer,
  stripe_price_id text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_kind_check CHECK (kind IN ('library', 'course', 'bundle')),
  CONSTRAINT products_level_check CHECK (
    level IS NULL
    OR level IN ('beginner', 'pre-intermediate', 'intermediate', 'pronunciation')
  ),
  CONSTRAINT products_price_cents_check CHECK (price_cents IS NULL OR price_cents >= 0)
);

COMMENT ON COLUMN public.products.level IS
  'Library level, including pronunciation. Null for course products and bundles. pronunciation is not a courses.level.';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.products FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.products TO service_role;

CREATE TABLE IF NOT EXISTS public.product_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  course_id uuid REFERENCES public.courses(id),
  level text,
  CONSTRAINT product_items_item_type_check CHECK (item_type IN ('course', 'level_library')),
  CONSTRAINT product_items_level_check CHECK (
    level IS NULL
    OR level IN ('beginner', 'pre-intermediate', 'intermediate', 'pronunciation')
  ),
  CONSTRAINT product_items_target_check CHECK (
    (item_type = 'course' AND course_id IS NOT NULL AND level IS NULL)
    OR
    (item_type = 'level_library' AND course_id IS NULL AND level IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS product_items_product_id_idx
  ON public.product_items (product_id);

COMMENT ON TABLE public.product_items IS
  'What a product grants. Exactly one of course_id or level, matching item_type. A bundle copies item rows. It does not point at another product.';

ALTER TABLE public.product_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.product_items TO service_role;

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  stripe_checkout_session_id text,
  UNIQUE (user_id, product_id)
);

COMMENT ON TABLE public.purchases IS
  'Permanent one-time access. stripe_checkout_session_id is null for a manual grant. No period window.';

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.purchases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.purchases TO authenticated;
GRANT ALL ON TABLE public.purchases TO service_role;

DROP POLICY IF EXISTS "Students can read own purchases" ON public.purchases;
CREATE POLICY "Students can read own purchases"
  ON public.purchases
  FOR SELECT
  USING (user_id = auth.uid());
